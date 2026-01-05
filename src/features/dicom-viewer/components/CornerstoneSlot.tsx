/**
 * CornerstoneSlot - 개별 슬롯 뷰어 컴포넌트
 *
 * Cornerstone Stack Viewport 기반 멀티프레임 DICOM 뷰어
 * WADO-RS Rendered API + requestAnimationFrame Cine 재생
 *
 * mini-pacs-poc 참고
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import {
  Enums,
  getRenderingEngine as csGetRenderingEngine,
  imageLoader,
  type Types,
} from '@cornerstonejs/core'
import { useCornerstoneMultiViewerStore } from '../stores'
import { createWadoRsRenderedImageIds } from '@/lib/cornerstone/wadoRsRenderedLoader'
import { CornerstoneSlotOverlay } from './CornerstoneSlotOverlay'
import { CornerstoneSlotControls } from './CornerstoneSlotControls'
import type { InstanceSummary } from '../types/multiSlotViewer'

interface CornerstoneSlotProps {
  slotId: number
  renderingEngineId: string
}

export function CornerstoneSlot({ slotId, renderingEngineId }: CornerstoneSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Types.IStackViewport | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const [isStackLoaded, setIsStackLoaded] = useState(false)

  const {
    slots,
    globalFps,
    availableInstances,
    nextFrameSlot,
    updateSlotPerformance,
    assignInstanceToSlot,
    preloadSlotFrames,
  } = useCornerstoneMultiViewerStore()

  const slot = slots[slotId]
  const viewportId = `cs-slot-${slotId}`

  // ==================== Viewport 초기화 ====================

  useEffect(() => {
    if (!containerRef.current) return

    const renderingEngine = csGetRenderingEngine(renderingEngineId)
    if (!renderingEngine) {
      console.warn(`[CornerstoneSlot ${slotId}] RenderingEngine not found`)
      return
    }

    try {
      // 기존 뷰포트 제거
      const existingViewport = renderingEngine.getViewport(viewportId)
      if (existingViewport) {
        renderingEngine.disableElement(viewportId)
      }

      // 새 Stack Viewport 생성
      const viewportInput: Types.PublicViewportInput = {
        viewportId,
        type: Enums.ViewportType.STACK,
        element: containerRef.current,
        defaultOptions: {
          background: [0, 0, 0] as Types.Point3,
        },
      }

      renderingEngine.enableElement(viewportInput)
      viewportRef.current = renderingEngine.getViewport(viewportId) as Types.IStackViewport
      console.log(`[CornerstoneSlot ${slotId}] Viewport created`)
    } catch (error) {
      console.error(`[CornerstoneSlot ${slotId}] Viewport creation failed:`, error)
    }

    return () => {
      const renderingEngine = csGetRenderingEngine(renderingEngineId)
      if (renderingEngine) {
        try {
          renderingEngine.disableElement(viewportId)
          console.log(`[CornerstoneSlot ${slotId}] Viewport disabled`)
        } catch (e) {
          // 이미 제거된 경우 무시
        }
      }
      viewportRef.current = null
    }
  }, [slotId, viewportId, renderingEngineId])

  // ==================== Stack 설정 ====================

  useEffect(() => {
    if (!viewportRef.current || !slot.instance) {
      setIsStackLoaded(false)
      return
    }

    const loadStack = async () => {
      setIsStackLoaded(false)

      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, numberOfFrames } =
        slot.instance!

      // WADO-RS Rendered imageIds 생성
      const imageIds = createWadoRsRenderedImageIds(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames
      )

      try {
        await viewportRef.current!.setStack(imageIds)

        // CRITICAL: 첫 프레임을 먼저 로드하여 캐시에 저장
        if (imageIds.length > 0) {
          await imageLoader.loadImage(imageIds[0])
        }

        // 캐시된 이미지로 인덱스 설정 및 렌더링
        viewportRef.current!.setImageIdIndex(0)
        viewportRef.current!.render()

        setIsStackLoaded(true)
        console.log(`[CornerstoneSlot ${slotId}] Stack loaded with ${imageIds.length} frames`)
      } catch (error) {
        console.error(`[CornerstoneSlot ${slotId}] Stack load failed:`, error)
        setIsStackLoaded(false)
      }
    }

    loadStack()
  }, [slot.instance?.sopInstanceUid, slotId])

  // ==================== 자동 프리로드 ====================

  useEffect(() => {
    if (!slot.instance || slot.isPreloaded || slot.isPreloading) return
    if (slot.instance.numberOfFrames <= 1) return

    // 인스턴스 할당 후 자동 프리로드
    preloadSlotFrames(slotId)
  }, [slot.instance?.sopInstanceUid, slot.isPreloaded, slot.isPreloading, slotId, preloadSlotFrames])

  // ==================== 프레임 변경 시 뷰포트 업데이트 ====================

  useEffect(() => {
    if (!viewportRef.current || !slot.instance || !isStackLoaded) return

    try {
      viewportRef.current.setImageIdIndex(slot.currentFrame)
      // CRITICAL: 프레임 변경 후 렌더링 필수
      viewportRef.current.render()
    } catch (error) {
      console.warn(`[CornerstoneSlot ${slotId}] Frame ${slot.currentFrame} not ready yet`)
    }
  }, [slot.currentFrame, slot.instance, isStackLoaded, slotId])

  // ==================== Cine 재생 루프 ====================

  useEffect(() => {
    // 재생 조건 미충족 시 cleanup만 수행
    if (!slot.isPlaying || !slot.instance || slot.instance.numberOfFrames <= 1) {
      return
    }

    // 재생 시작 시 lastTime 초기화
    lastTimeRef.current = null
    const frameTime = 1000 / globalFps

    const animate = (currentTime: number) => {
      // 첫 프레임은 시간만 기록
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const elapsed = currentTime - lastTimeRef.current

      if (elapsed >= frameTime) {
        lastTimeRef.current = currentTime

        // 다음 프레임으로 이동
        nextFrameSlot(slotId)

        // 성능 통계 업데이트
        const actualFps = 1000 / elapsed
        updateSlotPerformance(slotId, actualFps, currentTime)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    // Cleanup: 재생 중지 시 애니메이션 취소
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      lastTimeRef.current = null
    }
  }, [slot.isPlaying, slot.instance, globalFps, slotId, nextFrameSlot, updateSlotPerformance])

  // ==================== 드래그 앤 드롭 ====================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const instanceData = e.dataTransfer.getData('application/json')
      if (!instanceData) return

      try {
        const instance: InstanceSummary = JSON.parse(instanceData)
        assignInstanceToSlot(slotId, instance)
      } catch (error) {
        console.error('[CornerstoneSlot] Drop failed:', error)
      }
    },
    [slotId, assignInstanceToSlot]
  )

  // ==================== 렌더링 ====================

  const totalFrames = slot.instance?.numberOfFrames || 0

  // 빈 슬롯
  if (!slot.instance) {
    return (
      <div
        className="relative bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center min-h-[200px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-gray-400 text-center p-4">
          <svg
            className="mx-auto h-12 w-12 mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <p className="text-sm">Slot {slotId + 1}</p>
          <p className="text-xs mt-1 opacity-75">Drag DICOM here</p>
        </div>
      </div>
    )
  }

  // 로딩 상태
  if (slot.loading) {
    return (
      <div className="relative bg-gray-900 rounded-lg flex items-center justify-center min-h-[200px]">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (slot.error) {
    return (
      <div className="relative bg-red-900/30 rounded-lg border border-red-600 flex items-center justify-center min-h-[200px]">
        <div className="text-center text-red-400 p-4">
          <svg
            className="mx-auto h-8 w-8 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm">{slot.error}</p>
        </div>
      </div>
    )
  }

  // 정상 상태: Cornerstone Viewport + Overlay + Controls
  return (
    <div
      className="relative bg-black rounded-lg overflow-hidden flex flex-col"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Cornerstone Viewport 컨테이너 */}
      <div className="flex-1 relative min-h-[200px]">
        <div ref={containerRef} className="w-full h-full" onContextMenu={(e) => e.preventDefault()} />

        {/* 성능 오버레이 */}
        <CornerstoneSlotOverlay
          slotId={slotId}
          currentFrame={slot.currentFrame}
          totalFrames={totalFrames}
          fps={slot.performanceStats.fps}
          avgFps={slot.performanceStats.avgFps}
          frameDrops={slot.performanceStats.frameDrops}
          preloadProgress={slot.preloadProgress}
          isPreloading={slot.isPreloading}
          isPreloaded={slot.isPreloaded}
          isPlaying={slot.isPlaying}
        />
      </div>

      {/* 슬롯 컨트롤 */}
      <CornerstoneSlotControls
        slotId={slotId}
        isPlaying={slot.isPlaying}
        currentFrame={slot.currentFrame}
        totalFrames={totalFrames}
        isPreloaded={slot.isPreloaded}
      />
    </div>
  )
}
