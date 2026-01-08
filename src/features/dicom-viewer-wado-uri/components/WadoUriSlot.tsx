/**
 * WadoUriSlot - WADO-URI 개별 슬롯 뷰어 컴포넌트
 *
 * Cornerstone Stack Viewport 기반 멀티프레임 DICOM 뷰어
 * WADO-URI API + requestAnimationFrame Cine 재생
 *
 * dicom-viewer의 CornerstoneSlot과 완전 독립적인 구현
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import {
  Enums,
  getRenderingEngine as csGetRenderingEngine,
  imageLoader,
  type Types,
} from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { useWadoUriMultiViewerStore } from '../stores/wadoUriMultiViewerStore'
import { createWadoUriImageIds } from '../utils/wadoUriImageIdHelper'
import { wadoUriCineAnimationManager } from '../utils/wadoUriCineAnimationManager'
import { useShallow } from 'zustand/react/shallow'
import { WadoUriSlotOverlay } from './WadoUriSlotOverlay'
import type { WadoUriInstanceSummary } from '../types/wadoUriTypes'

// WADO-URI 전용 Tool Group ID
export const WADO_URI_TOOL_GROUP_ID = 'wado-uri-tool-group'

interface WadoUriSlotProps {
  slotId: number
  renderingEngineId: string
}

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_SLOT = false

export function WadoUriSlot({ slotId, renderingEngineId }: WadoUriSlotProps) {
  // ==================== Zustand Selector 분리 (리렌더링 최적화) ====================

  // 원시 타입 필드 (개별 선택)
  const currentFrame = useWadoUriMultiViewerStore(
    (state) => state.slots[slotId]?.currentFrame ?? 0
  )
  const isPlaying = useWadoUriMultiViewerStore(
    (state) => state.slots[slotId]?.isPlaying ?? false
  )
  const isPreloading = useWadoUriMultiViewerStore(
    (state) => state.slots[slotId]?.isPreloading ?? false
  )
  const isPreloaded = useWadoUriMultiViewerStore(
    (state) => state.slots[slotId]?.isPreloaded ?? false
  )
  const preloadProgress = useWadoUriMultiViewerStore(
    (state) => state.slots[slotId]?.preloadProgress ?? 0
  )
  const loading = useWadoUriMultiViewerStore(
    (state) => state.slots[slotId]?.loading ?? false
  )
  const error = useWadoUriMultiViewerStore(
    (state) => state.slots[slotId]?.error ?? null
  )

  // 객체 타입 필드 (shallow 비교로 불필요한 리렌더링 방지)
  const instance = useWadoUriMultiViewerStore(
    useShallow((state) => state.slots[slotId]?.instance ?? null)
  )

  if (DEBUG_SLOT) {
    console.log(`[WadoUriSlot ${slotId}] RENDER - instance:`, !!instance, 'loading:', loading)
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Types.IStackViewport | null>(null)
  const [isStackLoaded, setIsStackLoaded] = useState(false)
  const [isViewportReady, setIsViewportReady] = useState(false)

  // 전역 상태 및 액션
  const globalFps = useWadoUriMultiViewerStore((state) => state.globalFps)
  const allThumbnailsLoaded = useWadoUriMultiViewerStore((state) => state.allThumbnailsLoaded)
  const assignInstanceToSlot = useWadoUriMultiViewerStore((state) => state.assignInstanceToSlot)
  const preloadSlotFrames = useWadoUriMultiViewerStore((state) => state.preloadSlotFrames)
  const viewportId = `wado-uri-slot-${slotId}`

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
        const instance: WadoUriInstanceSummary = JSON.parse(instanceData)
        assignInstanceToSlot(slotId, instance)
      } catch (error) {
        console.error('[WadoUriSlot] Drop failed:', error)
      }
    },
    [slotId, assignInstanceToSlot]
  )

  // ==================== Viewport 초기화 ====================

  useEffect(() => {
    if (DEBUG_SLOT) {
      console.log(`[WadoUriSlot ${slotId}] Viewport init effect CALLED - containerRef:`, !!containerRef.current, 'instance:', !!instance, 'loading:', loading)
    }

    if (!containerRef.current) {
      if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Early return - no containerRef`)
      return
    }

    if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Viewport init effect triggered`)

    const renderingEngine = csGetRenderingEngine(renderingEngineId)
    if (!renderingEngine) {
      console.warn(`[WadoUriSlot ${slotId}] RenderingEngine not found`)
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
      if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Viewport created, isViewportReady: true`)

      // ToolGroup에 viewport 연결
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_URI_TOOL_GROUP_ID)
      if (toolGroup) {
        try {
          toolGroup.addViewport(viewportId, renderingEngineId)
          if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Viewport added to ToolGroup`)
        } catch (e) {
          // 이미 추가된 경우 무시
        }
      }
    } catch (error) {
      if (DEBUG_SLOT) console.error(`[WadoUriSlot ${slotId}] Viewport creation failed:`, error)
    }

    return () => {
      setIsViewportReady(false)
      // ToolGroup에서 viewport 제거
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_URI_TOOL_GROUP_ID)
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
          if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Viewport disabled (cleanup)`)
        } catch (e) {
          // 이미 제거된 경우 무시
        }
      }
      viewportRef.current = null
    }
  }, [!!instance, loading, slotId, viewportId, renderingEngineId])

  // ==================== Stack 설정 ====================

  useEffect(() => {
    if (DEBUG_SLOT) {
      console.log(`[WadoUriSlot ${slotId}] Stack effect - isViewportReady:`, isViewportReady, 'viewportRef:', !!viewportRef.current, 'instance:', !!instance)
    }

    if (!viewportRef.current || !instance || !isViewportReady) {
      setIsStackLoaded(false)
      return
    }

    const loadStack = async () => {
      setIsStackLoaded(false)

      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, numberOfFrames } = instance

      if (DEBUG_SLOT) {
        console.log(`[WadoUriSlot ${slotId}] Loading stack:`, {
          sopInstanceUid: sopInstanceUid.slice(0, 20) + '...',
          numberOfFrames,
        })
      }

      // WADO-URI imageIds 생성
      const imageIds = createWadoUriImageIds(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames
      )

      try {
        if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Calling setStack with ${imageIds.length} imageIds...`)
        await viewportRef.current!.setStack(imageIds)
        if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] setStack completed`)

        // 첫 프레임 로드
        if (imageIds.length > 0) {
          if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Calling loadImage for first frame...`)
          await imageLoader.loadImage(imageIds[0])
          if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] loadImage completed`)
        }

        // 인덱스 설정 및 렌더링
        if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Setting imageIdIndex to 0...`)
        viewportRef.current!.setImageIdIndex(0)

        // viewport resize 및 카메라 리셋
        const renderingEngine = csGetRenderingEngine(renderingEngineId)
        if (renderingEngine) {
          renderingEngine.resize()
        }
        viewportRef.current!.resetCamera()
        viewportRef.current!.render()

        if (DEBUG_SLOT) {
          const canvas = viewportRef.current!.getCanvas()
          const element = containerRef.current!
          console.log(`[WadoUriSlot ${slotId}] DEBUG after render:`, {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            elementClientWidth: element.clientWidth,
            elementClientHeight: element.clientHeight,
            currentImageIdIndex: viewportRef.current!.getCurrentImageIdIndex(),
            imageIdsLength: viewportRef.current!.getImageIds().length,
          })
        }

        setIsStackLoaded(true)
        if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Stack loaded with ${imageIds.length} frames`)

        // Viewport를 WadoUriCineAnimationManager에 등록
        wadoUriCineAnimationManager.registerViewport(slotId, viewportRef.current!, numberOfFrames)
      } catch (error) {
        console.error(`[WadoUriSlot ${slotId}] Stack load failed:`, error)
        setIsStackLoaded(false)
      }
    }

    loadStack()

    // Cleanup: Viewport 등록 해제
    return () => {
      wadoUriCineAnimationManager.unregisterViewport(slotId)
    }
  }, [instance?.sopInstanceUid, loading, slotId, isViewportReady, renderingEngineId])

  // ==================== 자동 프리로드 ====================

  useEffect(() => {
    if (!instance || isPreloaded || isPreloading) return
    if (instance.numberOfFrames <= 1) return

    // 썸네일 로딩 완료 대기 (썸네일 우선 전략)
    if (!allThumbnailsLoaded) {
      if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Waiting for thumbnails before preload`)
      return
    }

    // 인스턴스 할당 후 자동 프리로드
    if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Starting preload (thumbnails loaded)`)
    preloadSlotFrames(slotId)
  }, [instance?.sopInstanceUid, isPreloaded, isPreloading, allThumbnailsLoaded, slotId, preloadSlotFrames])

  // ==================== 프레임 변경 시 뷰포트 업데이트 ====================

  useEffect(() => {
    if (!viewportRef.current || !instance || !isStackLoaded) return

    // 재생 중에는 CineAnimationManager가 직접 처리
    if (isPlaying) return

    try {
      viewportRef.current.setImageIdIndex(currentFrame)
      viewportRef.current.render()
    } catch (error) {
      if (DEBUG_SLOT) console.warn(`[WadoUriSlot ${slotId}] Frame ${currentFrame} not ready yet`)
    }
  }, [currentFrame, instance, isStackLoaded, isPlaying, slotId])

  // ==================== Cine 재생 루프 (WadoUriCineAnimationManager 연동) ====================

  useEffect(() => {
    if (isPlaying && instance && instance.numberOfFrames > 1) {
      wadoUriCineAnimationManager.setCurrentIndex(slotId, currentFrame)
      wadoUriCineAnimationManager.registerSlot(slotId)
    } else {
      wadoUriCineAnimationManager.unregisterSlot(slotId)
    }

    return () => {
      wadoUriCineAnimationManager.unregisterSlot(slotId)
    }
  }, [isPlaying, instance, slotId, currentFrame])

  // globalFps 변경 시 CineAnimationManager에 반영
  useEffect(() => {
    wadoUriCineAnimationManager.setFrameTime(globalFps)
  }, [globalFps])

  // ==================== 렌더링 ====================

  const totalFrames = instance?.numberOfFrames || 0

  // 빈 슬롯
  if (!instance) {
    if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Returning EMPTY slot JSX`)
    return (
      <div
        key="empty"
        className="relative bg-gray-800 rounded-lg border-2 border-dashed border-yellow-600/50 flex flex-col items-center justify-center min-h-[200px] w-full h-full"
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
          <p className="text-xs mt-1 text-yellow-500">(WADO-URI)</p>
        </div>
      </div>
    )
  }

  // 로딩 상태
  if (loading) {
    if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Returning LOADING JSX`)
    return (
      <div className="relative bg-gray-900 rounded-lg flex items-center justify-center min-h-[200px] w-full h-full">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-2" />
          <p className="text-sm">Loading (WADO-URI)...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
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
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // 정상 상태 - viewport 렌더링
  if (DEBUG_SLOT) console.log(`[WadoUriSlot ${slotId}] Returning VIEWPORT JSX`)
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

        {/* 슬롯 오버레이 */}
        <WadoUriSlotOverlay
          slotId={slotId}
          totalFrames={totalFrames}
          preloadProgress={preloadProgress}
          isPreloading={isPreloading}
          isPreloaded={isPreloaded}
          isPlaying={isPlaying}
        />
      </div>
    </div>
  )
}
