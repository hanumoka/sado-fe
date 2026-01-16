/**
 * MjpegLayer Component
 *
 * MJPEG Canvas 렌더링 레이어
 * requestAnimationFrame 기반 프레임 재생
 * 루프 경계 감지 시 부모에게 알림
 *
 * 주의: useMjpegMultiViewerStore, cineFramesLoadingManager 사용 금지
 * hybridMultiViewerStore, hybridPreloadManager만 사용
 */

import { useCallback, useEffect, useRef } from 'react'
import { useHybridMultiViewerStore } from '../../stores/hybridMultiViewerStore'
import { hybridPreloadManager } from '../../utils/hybridPreloadManager'
import type { HybridInstanceSummary } from '../../types'

interface MjpegLayerProps {
  /** 슬롯 ID */
  slotId: number
  /** 할당된 인스턴스 */
  instance: HybridInstanceSummary | null
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 전환 준비 중 freeze 상태 (마지막 프레임 유지) */
  isFrozen?: boolean
  /** 루프 경계 도달 시 콜백 (frame=0으로 돌아갈 때) */
  onLoopBoundary?: () => void
  /** 프레임 변경 시 콜백 */
  onFrameChange?: (frameIndex: number, totalFrames: number) => void
  /** 캐시 완료 시 콜백 */
  onCacheComplete?: (frameCount: number) => void
  /** 에러 발생 시 콜백 */
  onError?: (error: string) => void
}

/**
 * MJPEG Canvas 렌더링 레이어
 */
export function MjpegLayer({
  slotId,
  instance,
  isPlaying,
  isFrozen = false,
  onLoopBoundary,
  onFrameChange,
  onCacheComplete,
  onError,
}: MjpegLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const frameIndexRef = useRef<number>(0)

  // 선택적 구독 - 필요한 필드만 구독하여 불필요한 re-render 방지
  // (pendingTransition 변경 시 MjpegLayer가 re-render되지 않도록)
  const globalFps = useHybridMultiViewerStore((state) => state.globalFps)
  const globalResolution = useHybridMultiViewerStore((state) => state.globalResolution)
  const updateMjpegState = useHybridMultiViewerStore((state) => state.updateMjpegState)

  // 프레임 간격 (ms)
  const frameInterval = 1000 / globalFps

  // 캐시된 프레임 가져오기
  const getCachedFrames = useCallback((): HTMLImageElement[] => {
    return hybridPreloadManager.getCachedFrames(slotId) ?? []
  }, [slotId])

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
  //
  // 중요: 콜백 의존성 최소화 - store 구독으로 인한 re-render 시 animate가 재생성되면
  // playback useEffect가 RAF를 취소하고 재시작하여 프레임 0에 도달하지 못함
  //
  // 해결책: onLoopBoundary 콜백 대신 Zustand getState()로 직접 전환 트리거

  const animate = useCallback(
    (timestamp: number) => {
      const frames = getCachedFrames()

      // 프레임이 없으면 다음 RAF만 스케줄하고 대기
      if (frames.length === 0) {
        animationIdRef.current = requestAnimationFrame(animate)
        return
      }

      const elapsed = timestamp - lastFrameTimeRef.current

      if (elapsed >= frameInterval) {
        lastFrameTimeRef.current = timestamp - (elapsed % frameInterval)

        const nextIndex = (frameIndexRef.current + 1) % frames.length

        // 프레임 인덱스 업데이트
        frameIndexRef.current = nextIndex
        onFrameChange?.(nextIndex, frames.length)
        updateMjpegState(slotId, { currentFrame: nextIndex })
        renderFrame(frames, nextIndex)

        // 루프 경계 도달 시 전환 처리 (콜백 대신 직접 Zustand 읽기)
        if (nextIndex === 0) {
          onLoopBoundary?.()

          // 직접 Zustand state 확인 및 전환 트리거
          const state = useHybridMultiViewerStore.getState()
          const currentSlot = state.slots[slotId]

          if (currentSlot?.transition.pendingTransition) {
            state.prepareTransition(slotId)
          }
        }
      }

      animationIdRef.current = requestAnimationFrame(animate)
    },
    [
      getCachedFrames,
      frameInterval,
      renderFrame,
      slotId,
      onLoopBoundary,
      onFrameChange,
      updateMjpegState,
    ]
  )

  // ========== Instance 변경 시 프레임 로드 ==========

  useEffect(() => {
    if (!instance) {
      frameIndexRef.current = 0
      updateMjpegState(slotId, {
        isCached: false,
        cachedFrameCount: 0,
        loadProgress: 0,
        currentFrame: 0,
      })
      return
    }

    // 이미 캐시되어 있으면 스킵
    if (hybridPreloadManager.isSlotCached(slotId)) {
      const frames = getCachedFrames()
      if (frames.length > 0) {
        updateMjpegState(slotId, {
          isCached: true,
          cachedFrameCount: frames.length,
          loadProgress: 100,
        })
        onCacheComplete?.(frames.length)
        renderFrame(frames, 0)
        return
      }
    }

    // 로딩 요청
    hybridPreloadManager.loadFrames(
      slotId,
      instance.sopInstanceUid,
      globalResolution,
      // onProgress
      (progress) => {
        updateMjpegState(slotId, { loadProgress: progress.progress })
        if (progress.status === 'error' && progress.error) {
          onError?.(progress.error)
        }
      },
      // onComplete
      (result) => {
        if (result.success) {
          updateMjpegState(slotId, {
            isCached: true,
            cachedFrameCount: result.frames.length,
            loadProgress: 100,
          })
          frameIndexRef.current = 0
          onCacheComplete?.(result.frames.length)
          renderFrame(result.frames, 0)
        } else {
          updateMjpegState(slotId, {
            isCached: false,
            errorMessage: result.error,
          })
          onError?.(result.error || 'Failed to load frames')
        }
      }
    )

    return () => {
      // cleanup - 로딩 취소는 하지 않음 (캐시 유지)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance?.sopInstanceUid, globalResolution])

  // ========== 재생/일시정지 제어 ==========

  useEffect(() => {
    const isCached = hybridPreloadManager.isSlotCached(slotId)

    // freeze 상태면 즉시 RAF 중단 (마지막 프레임 유지)
    if (isFrozen) {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
      return
    }

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
  }, [isPlaying, isFrozen, slotId, animate])

  // ========== 컴포넌트 언마운트 시 정리 ==========

  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain"
      style={{ backgroundColor: 'black' }}
    />
  )
}
