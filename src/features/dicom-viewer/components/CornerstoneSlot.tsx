/**
 * CornerstoneSlot - 개별 슬롯 뷰어 컴포넌트
 *
 * Cornerstone Stack Viewport 기반 멀티프레임 DICOM 뷰어
 * WADO-RS Rendered API + requestAnimationFrame Cine 재생
 *
 * mini-pacs-poc 참고 - 구조 개선:
 * - instance가 없으면 early return (viewport 미생성)
 * - instance가 있을 때만 viewport 생성/렌더링
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import {
  Enums,
  getRenderingEngine as csGetRenderingEngine,
  imageLoader,
  type Types,
} from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { useCornerstoneMultiViewerStore } from '../stores'
import { createWadoRsRenderedImageIds } from '@/lib/cornerstone/wadoRsRenderedLoader'
import { CornerstoneSlotOverlay } from './CornerstoneSlotOverlay'
import { CornerstoneSlotControls } from './CornerstoneSlotControls'
import { TOOL_GROUP_ID } from './CornerstoneMultiViewer'
import type { InstanceSummary } from '../types/multiSlotViewer'

interface CornerstoneSlotProps {
  slotId: number
  renderingEngineId: string
}

export function CornerstoneSlot({ slotId, renderingEngineId }: CornerstoneSlotProps) {
  // Zustand store에서 slot 가져오기 (렌더 로그에서 사용하기 위해 먼저 선언)
  const slot = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId] || {
      instance: null,
      currentFrame: 0,
      isPlaying: false,
      isPreloading: false,
      isPreloaded: false,
      preloadProgress: 0,
      loading: false,
      error: null,
      performanceStats: { fps: 0, avgFps: 0, frameDrops: 0, totalFramesRendered: 0, fpsHistory: [], lastFrameTime: 0 }
    }
  )

  // DEBUG: 컴포넌트 렌더링 확인
  console.log(`[CornerstoneSlot ${slotId}] RENDER - instance:`, !!slot.instance, 'loading:', slot.loading)

  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Types.IStackViewport | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const [isStackLoaded, setIsStackLoaded] = useState(false)
  const [isViewportReady, setIsViewportReady] = useState(false)

  // 전역 상태 및 액션 (slot은 위에서 이미 선언됨)
  const globalFps = useCornerstoneMultiViewerStore((state) => state.globalFps)
  const nextFrameSlot = useCornerstoneMultiViewerStore((state) => state.nextFrameSlot)
  const updateSlotPerformance = useCornerstoneMultiViewerStore((state) => state.updateSlotPerformance)
  const assignInstanceToSlot = useCornerstoneMultiViewerStore((state) => state.assignInstanceToSlot)
  const preloadSlotFrames = useCornerstoneMultiViewerStore((state) => state.preloadSlotFrames)
  const viewportId = `cs-slot-${slotId}`

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

  // ==================== Viewport 초기화 ====================
  // containerRef만 체크 (slot.instance 체크 제거 - mini-pacs-poc 참조)

  useEffect(() => {
    // DEBUG: 이 로그가 출력되지 않으면 useEffect 자체가 실행 안됨
    console.log(`[CornerstoneSlot ${slotId}] Viewport init effect CALLED - containerRef:`, !!containerRef.current, 'instance:', !!slot.instance, 'loading:', slot.loading)

    // containerRef만 체크 - slot.instance 체크 제거!
    if (!containerRef.current) {
      console.log(`[CornerstoneSlot ${slotId}] Early return - no containerRef`)
      return
    }

    console.log(`[CornerstoneSlot ${slotId}] Viewport init effect triggered`)

    const renderingEngine = csGetRenderingEngine(renderingEngineId)
    if (!renderingEngine) {
      console.warn(`[CornerstoneSlot ${slotId}] RenderingEngine not found`)
      return
    }

    try {
      // 기존 뷰포트가 있으면 제거
      const existingViewport = renderingEngine.getViewport(viewportId)
      if (existingViewport) {
        renderingEngine.disableElement(viewportId)
      }

      // 새 Stack Viewport 생성
      renderingEngine.enableElement({
        viewportId,
        type: Enums.ViewportType.STACK,
        element: containerRef.current,
        defaultOptions: {
          background: [0, 0, 0] as Types.Point3,
        },
      })

      viewportRef.current = renderingEngine.getViewport(viewportId) as Types.IStackViewport
      setIsViewportReady(true)
      console.log(`[CornerstoneSlot ${slotId}] Viewport created, isViewportReady: true`)

      // ToolGroup에 viewport 연결
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
      if (toolGroup) {
        try {
          toolGroup.addViewport(viewportId, renderingEngineId)
          console.log(`[CornerstoneSlot ${slotId}] Viewport added to ToolGroup`)
        } catch (e) {
          // 이미 추가된 경우 무시
        }
      }
    } catch (error) {
      console.error(`[CornerstoneSlot ${slotId}] Viewport creation failed:`, error)
    }

    return () => {
      setIsViewportReady(false)
      // ToolGroup에서 viewport 제거
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
      if (toolGroup) {
        try {
          toolGroup.removeViewports(renderingEngineId, viewportId)
        } catch (e) {
          // 이미 제거된 경우 무시
        }
      }
      const re = csGetRenderingEngine(renderingEngineId)
      if (re) {
        try {
          re.disableElement(viewportId)
          console.log(`[CornerstoneSlot ${slotId}] Viewport disabled (cleanup)`)
        } catch (e) {
          // 이미 제거된 경우 무시
        }
      }
      viewportRef.current = null
    }
  }, [!!slot.instance, slot.loading, slotId, viewportId, renderingEngineId])  // slot.loading 추가: loading 완료 후 effect 재실행

  // ==================== Stack 설정 ====================

  useEffect(() => {
    console.log(`[CornerstoneSlot ${slotId}] Stack effect - isViewportReady:`, isViewportReady, 'viewportRef:', !!viewportRef.current, 'instance:', !!slot.instance)

    if (!viewportRef.current || !slot.instance || !isViewportReady) {
      setIsStackLoaded(false)
      return
    }

    const loadStack = async () => {
      setIsStackLoaded(false)

      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, numberOfFrames } =
        slot.instance!

      console.log(`[CornerstoneSlot ${slotId}] Loading stack:`, {
        sopInstanceUid: sopInstanceUid.slice(0, 20) + '...',
        numberOfFrames,
      })

      // WADO-RS Rendered imageIds 생성
      const imageIds = createWadoRsRenderedImageIds(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames
      )

      try {
        console.log(`[CornerstoneSlot ${slotId}] Calling setStack with ${imageIds.length} imageIds...`)
        await viewportRef.current!.setStack(imageIds)
        console.log(`[CornerstoneSlot ${slotId}] setStack completed`)

        // 첫 프레임 로드 - loadImage 사용 (참조 프로젝트와 동일)
        if (imageIds.length > 0) {
          console.log(`[CornerstoneSlot ${slotId}] Calling loadImage for first frame...`)
          const loadResult = await imageLoader.loadImage(imageIds[0])
          console.log(`[CornerstoneSlot ${slotId}] loadImage completed:`, loadResult)
        }

        // 인덱스 설정 및 렌더링
        console.log(`[CornerstoneSlot ${slotId}] Setting imageIdIndex to 0...`)
        viewportRef.current!.setImageIdIndex(0)

        // CRITICAL: viewport resize 및 카메라 리셋 (컬러 이미지 렌더링에 필요할 수 있음)
        const renderingEngine = csGetRenderingEngine(renderingEngineId)
        if (renderingEngine) {
          renderingEngine.resize()
        }
        viewportRef.current!.resetCamera()
        viewportRef.current!.render()

        // DEBUG: 렌더링 상태 확인
        const canvas = viewportRef.current!.getCanvas()
        const element = containerRef.current!
        console.log(`[CornerstoneSlot ${slotId}] DEBUG after render:`, {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          elementClientWidth: element.clientWidth,
          elementClientHeight: element.clientHeight,
          currentImageIdIndex: viewportRef.current!.getCurrentImageIdIndex(),
          imageIdsLength: viewportRef.current!.getImageIds().length,
        })

        setIsStackLoaded(true)
        console.log(`[CornerstoneSlot ${slotId}] Stack loaded with ${imageIds.length} frames`)
      } catch (error) {
        console.error(`[CornerstoneSlot ${slotId}] Stack load failed:`, error)
        setIsStackLoaded(false)
      }
    }

    loadStack()
  }, [slot.instance?.sopInstanceUid, slot.loading, slotId, isViewportReady])  // isViewportReady 추가: viewport 생성 후 stack 로드

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

  // ==================== 렌더링 ====================

  const totalFrames = slot.instance?.numberOfFrames || 0

  // 빈 슬롯 - viewport 생성하지 않음 (early return)
  // CRITICAL: key="empty"로 React가 viewport와 다른 컴포넌트로 인식하게 함
  if (!slot.instance) {
    console.log(`[CornerstoneSlot ${slotId}] Returning EMPTY slot JSX`)
    return (
      <div
        key="empty"
        className="relative bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center min-h-[200px] w-full h-full"
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
    console.log(`[CornerstoneSlot ${slotId}] Returning LOADING JSX`)
    return (
      <div className="relative bg-gray-900 rounded-lg flex items-center justify-center min-h-[200px] w-full h-full">
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
      <div className="relative bg-red-900/30 rounded-lg border border-red-600 flex items-center justify-center min-h-[200px] w-full h-full">
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

  // 정상 상태 - viewport 렌더링
  // CRITICAL: key="viewport"로 React가 empty와 다른 컴포넌트로 인식하게 함
  // → instance 할당 시 remount되어 useEffect 재실행
  console.log(`[CornerstoneSlot ${slotId}] Returning VIEWPORT JSX`)
  return (
    <div
      key="viewport"
      className="relative bg-black rounded-lg overflow-hidden flex flex-col w-full h-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Cornerstone Viewport 컨테이너 */}
      <div className="flex-1 relative min-h-[200px]">
        <div
          ref={containerRef}
          className="w-full h-full"
          onContextMenu={(e) => e.preventDefault()}
        />

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
