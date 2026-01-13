/**
 * MjpegSlot Component (v2)
 *
 * 클라이언트 사이드 캐싱 + Canvas 기반 로컬 재생
 * CineFramesLoadingManager를 통한 병렬 로딩 큐 사용
 *
 * 주요 기능:
 * - Instance 할당 시 자동 프레임 로딩
 * - 로딩 매니저의 병렬 큐 시스템 활용
 * - 캐시된 프레임으로 requestAnimationFrame 재생
 * - 3x3, 4x4 레이아웃에서도 원활한 동작
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMjpegMultiViewerStore, type MjpegSlotStateExtended } from '../stores/mjpegMultiViewerStore'
import { cineFramesLoadingManager } from '../utils/CineFramesLoadingManager'
import type { MjpegInstanceSummary } from '../types'
import { Loader2, AlertCircle, ImageOff, Play, Pause, CheckCircle } from 'lucide-react'

interface MjpegSlotProps {
  /** 슬롯 상태 */
  slot: MjpegSlotStateExtended
}

/**
 * MJPEG 슬롯 컴포넌트 (Canvas 기반)
 */
export function MjpegSlot({ slot }: MjpegSlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const frameIndexRef = useRef<number>(0)

  const [isDragOver, setIsDragOver] = useState(false)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)

  const {
    globalResolution,
    globalFrameRate,
    setSlotStreamingStatus,
    setSlotCacheStatus,
    setSlotLoadProgress,
    assignInstanceToSlot,
  } = useMjpegMultiViewerStore()

  const { slotId, instance, streamingStatus, isCached, cachedFrameCount, loadProgress, errorMessage } = slot

  const isPlaying = streamingStatus === 'streaming'
  const isLoading = streamingStatus === 'loading'
  const isPaused = streamingStatus === 'idle' && instance && isCached
  const isError = streamingStatus === 'error'

  // 프레임 간격 (ms)
  const frameInterval = 1000 / globalFrameRate

  // 캐시된 프레임 가져오기
  const getCachedFrames = useCallback((): HTMLImageElement[] => {
    return cineFramesLoadingManager.getCachedFrames(slotId) ?? []
  }, [slotId])

  // ========== Instance 변경 시 프레임 로드 ==========

  useEffect(() => {
    if (!instance) {
      frameIndexRef.current = 0
      setCurrentFrameIndex(0)
      return
    }

    // 이미 캐시되어 있으면 스킵
    if (cineFramesLoadingManager.isSlotCached(slotId)) {
      const frames = getCachedFrames()
      if (frames.length > 0) {
        setSlotCacheStatus(slotId, true, frames.length)
        setSlotStreamingStatus(slotId, 'idle')
        renderFrame(frames, 0)
        return
      }
    }

    // 로딩 요청
    cineFramesLoadingManager.loadFrames(
      slotId,
      instance.sopInstanceUid,
      globalResolution,
      // onProgress
      (progress) => {
        setSlotLoadProgress(slotId, progress.progress)
        if (progress.status === 'error') {
          setSlotStreamingStatus(slotId, 'error', progress.error)
        } else if (progress.status !== 'completed') {
          setSlotStreamingStatus(slotId, 'loading')
        }
      },
      // onComplete
      (result) => {
        if (result.success) {
          setSlotCacheStatus(slotId, true, result.frames.length)
          setSlotStreamingStatus(slotId, 'idle')
          frameIndexRef.current = 0
          setCurrentFrameIndex(0)
          renderFrame(result.frames, 0)
        } else {
          setSlotStreamingStatus(slotId, 'error', result.error)
        }
      }
    )

    return () => {
      // cleanup - 로딩 취소는 하지 않음 (캐시 유지)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance?.sopInstanceUid, globalResolution])

  // ========== 캔버스 렌더링 ==========

  const renderFrame = useCallback((frames: HTMLImageElement[], index: number) => {
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = frames[index]
    if (!img) return

    // 캔버스 크기를 이미지에 맞춤
    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width
      canvas.height = img.height
    }

    ctx.drawImage(img, 0, 0)
  }, [])

  // ========== 애니메이션 루프 ==========

  const animate = useCallback((timestamp: number) => {
    const frames = getCachedFrames()
    if (frames.length === 0) return

    const elapsed = timestamp - lastFrameTimeRef.current

    if (elapsed >= frameInterval) {
      lastFrameTimeRef.current = timestamp - (elapsed % frameInterval)

      const nextIndex = (frameIndexRef.current + 1) % frames.length
      frameIndexRef.current = nextIndex
      setCurrentFrameIndex(nextIndex)

      renderFrame(frames, nextIndex)
    }

    animationIdRef.current = requestAnimationFrame(animate)
  }, [getCachedFrames, frameInterval, renderFrame])

  // ========== 재생/일시정지 제어 ==========

  useEffect(() => {
    if (isPlaying && isCached) {
      lastFrameTimeRef.current = performance.now()
      animationIdRef.current = requestAnimationFrame(animate)
    } else {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
    }
  }, [isPlaying, isCached, animate])

  // ========== 드래그앤드롭 ==========

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    try {
      const data = e.dataTransfer.getData('application/json')
      if (data) {
        const instanceData: MjpegInstanceSummary = JSON.parse(data)
        assignInstanceToSlot(slotId, instanceData)
      }
    } catch (err) {
      console.error('Failed to parse dropped data:', err)
    }
  }, [slotId, assignInstanceToSlot])

  // ========== 클릭으로 재생/일시정지 토글 ==========

  const handleCanvasClick = useCallback(() => {
    if (!instance || !isCached) return

    if (isPlaying) {
      setSlotStreamingStatus(slotId, 'idle')
    } else {
      setSlotStreamingStatus(slotId, 'streaming')
    }
  }, [instance, isCached, isPlaying, slotId, setSlotStreamingStatus])

  // ========== 상태 배지 색상 ==========

  const getStatusBadgeClass = () => {
    if (isPlaying) return 'bg-green-600'
    if (isLoading) return 'bg-yellow-600'
    if (isPaused) return 'bg-blue-600'
    if (isError) return 'bg-red-600'
    return 'bg-gray-600'
  }

  const getStatusText = () => {
    if (isPlaying) return 'playing'
    if (isLoading) return `loading ${loadProgress}%`
    if (isPaused) return 'ready'
    if (isError) return 'error'
    return 'idle'
  }

  return (
    <div
      className={`relative w-full h-full bg-black border rounded overflow-hidden transition-colors ${
        isDragOver
          ? 'border-green-500 border-2 bg-green-900/20'
          : 'border-gray-700'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 빈 슬롯 */}
      {!instance && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${
          isDragOver ? 'text-green-400' : 'text-gray-500'
        }`}>
          <ImageOff className="w-10 h-10 mb-2" />
          <span className="text-sm font-medium">Slot {slotId + 1}</span>
          <span className="text-xs mt-1">
            {isDragOver ? 'Drop to assign' : 'Drop instance here'}
          </span>
        </div>
      )}

      {/* Canvas (프레임 렌더링) */}
      {instance && (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain cursor-pointer"
          onClick={handleCanvasClick}
        />
      )}

      {/* 오버레이들 */}
      {instance && (
        <>
          {/* 상단 정보 바 */}
          <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <div className="text-white text-xs flex items-center justify-between">
              <span className="truncate font-medium">
                #{instance.instanceNumber ?? slotId + 1}
              </span>
              <div className="flex items-center gap-1">
                {isCached && (
                  <span className="flex items-center gap-0.5 bg-green-600 px-1.5 py-0.5 rounded text-[10px]">
                    <CheckCircle className="w-3 h-3" />
                    Cached
                  </span>
                )}
                <span className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
                  {instance.numberOfFrames}f
                </span>
              </div>
            </div>
          </div>

          {/* 로딩 인디케이터 */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
              <span className="text-white text-sm">Loading frames...</span>
              <div className="w-32 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <span className="text-gray-400 text-xs mt-1">{loadProgress}%</span>
            </div>
          )}

          {/* 재생 버튼 오버레이 (캐시 완료 + 일시정지 상태) */}
          {isPaused && !isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer hover:bg-black/50 transition-colors"
              onClick={handleCanvasClick}
            >
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <Play className="w-12 h-12 text-white" />
              </div>
            </div>
          )}

          {/* 에러 표시 */}
          {isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-red-400">
              <AlertCircle className="w-8 h-8 mb-2" />
              <span className="text-sm text-center px-4">{errorMessage || 'Failed to load'}</span>
            </div>
          )}

          {/* 하단 정보 바 */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
            <div className="flex items-center justify-between text-white text-xs">
              <span className="bg-gray-700/80 px-1.5 py-0.5 rounded">{globalResolution}px</span>
              <span className="font-mono">
                {isCached ? `${currentFrameIndex + 1}/${cachedFrameCount}` : `0/${instance.numberOfFrames}`}
              </span>
              <span className="bg-gray-700/80 px-1.5 py-0.5 rounded">{globalFrameRate}fps</span>
              <span className={`px-1.5 py-0.5 rounded ${getStatusBadgeClass()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>

          {/* 재생 중 일시정지 버튼 */}
          {isPlaying && (
            <button
              className="absolute bottom-10 left-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
              onClick={handleCanvasClick}
            >
              <Pause className="w-4 h-4 text-white" />
            </button>
          )}
        </>
      )}
    </div>
  )
}
