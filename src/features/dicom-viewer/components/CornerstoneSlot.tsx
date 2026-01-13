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
import { cineAnimationManager } from '../utils/cineAnimationManager'
import { useShallow } from 'zustand/react/shallow'
import { CornerstoneSlotOverlay } from './CornerstoneSlotOverlay'
import { TOOL_GROUP_ID } from './CornerstoneMultiViewer'
import type { InstanceSummary } from '../types/multiSlotViewer'

interface CornerstoneSlotProps {
  slotId: number
  renderingEngineId: string
}

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_SLOT = false

export function CornerstoneSlot({ slotId, renderingEngineId }: CornerstoneSlotProps) {
  // ==================== Zustand Selector 분리 (리렌더링 최적화) ====================
  // 기존: 전체 slot 객체 선택 → currentFrame 변경 시 전체 리렌더링
  // 개선: 필드별 개별 선택 → 해당 필드 변경 시에만 리렌더링

  // 원시 타입 필드 (개별 선택)
  const currentFrame = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.currentFrame ?? 0
  )
  const isPlaying = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.isPlaying ?? false
  )
  const isPreloading = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.isPreloading ?? false
  )
  const isPreloaded = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.isPreloaded ?? false
  )
  const preloadProgress = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.preloadProgress ?? 0
  )
  const loading = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.loading ?? false
  )
  const error = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.error ?? null
  )

  // Progressive Playback 필드
  const isBuffering = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.isBuffering ?? false
  )
  const loadedFrameCount = useCornerstoneMultiViewerStore(
    (state) => state.getLoadedFrameCount(slotId)
  )

  // Stack 재로드 트리거 (캐시 클리어 시 증가)
  const stackVersion = useCornerstoneMultiViewerStore(
    (state) => state.slots[slotId]?.stackVersion ?? 0
  )

  // 객체 타입 필드 (shallow 비교로 불필요한 리렌더링 방지)
  const instance = useCornerstoneMultiViewerStore(
    useShallow((state) => state.slots[slotId]?.instance ?? null)
  )
  // performanceStats 제거 - Phase 2 최적화로 재생 중 업데이트 없음

  // DEBUG: 컴포넌트 렌더링 확인 (조건부)
  if (DEBUG_SLOT) {
    console.log(`[CornerstoneSlot ${slotId}] RENDER - instance:`, !!instance, 'loading:', loading)
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Types.IStackViewport | null>(null)
  const [isStackLoaded, setIsStackLoaded] = useState(false)
  const [isViewportReady, setIsViewportReady] = useState(false)

  // 전역 상태 및 액션 (slot은 위에서 이미 선언됨)
  const globalFps = useCornerstoneMultiViewerStore((state) => state.globalFps)
  const globalResolution = useCornerstoneMultiViewerStore((state) => state.globalResolution)
  const allThumbnailsLoaded = useCornerstoneMultiViewerStore((state) => state.allThumbnailsLoaded)
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
    if (DEBUG_SLOT) {
      console.log(`[CornerstoneSlot ${slotId}] Viewport init effect CALLED - containerRef:`, !!containerRef.current, 'instance:', !!instance, 'loading:', loading)
    }

    // containerRef만 체크 - instance 체크 제거!
    if (!containerRef.current) {
      if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Early return - no containerRef`)
      return
    }

    if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Viewport init effect triggered`)

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
      if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Viewport created, isViewportReady: true`)

      // ToolGroup에 viewport 연결
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
      if (toolGroup) {
        try {
          toolGroup.addViewport(viewportId, renderingEngineId)
          if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Viewport added to ToolGroup`)
        } catch (e) {
          // 이미 추가된 경우 무시
        }
      }
    } catch (error) {
      if (DEBUG_SLOT) console.error(`[CornerstoneSlot ${slotId}] Viewport creation failed:`, error)
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
          if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Viewport disabled (cleanup)`)
        } catch (e) {
          // 이미 제거된 경우 무시
        }
      }
      viewportRef.current = null
    }
  }, [!!instance, loading, slotId, viewportId, renderingEngineId])  // loading 추가: loading 완료 후 effect 재실행

  // ==================== Stack 설정 ====================

  useEffect(() => {
    if (DEBUG_SLOT) {
      console.log(`[CornerstoneSlot ${slotId}] Stack effect - isViewportReady:`, isViewportReady, 'viewportRef:', !!viewportRef.current, 'instance:', !!instance)
    }

    if (!viewportRef.current || !instance || !isViewportReady) {
      setIsStackLoaded(false)
      return
    }

    const loadStack = async () => {
      setIsStackLoaded(false)

      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, numberOfFrames } = instance

      if (DEBUG_SLOT) {
        console.log(`[CornerstoneSlot ${slotId}] Loading stack:`, {
          sopInstanceUid: sopInstanceUid.slice(0, 20) + '...',
          numberOfFrames,
        })
      }

      // WADO-RS Rendered imageIds 생성 (resolution 포함)
      const imageIds = createWadoRsRenderedImageIds(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames,
        globalResolution
      )

      try {
        if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Calling setStack with ${imageIds.length} imageIds...`)
        await viewportRef.current!.setStack(imageIds)
        if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] setStack completed`)

        // 첫 프레임 로드 - loadImage 사용 (참조 프로젝트와 동일)
        if (imageIds.length > 0) {
          if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Calling loadImage for first frame...`)
          await imageLoader.loadImage(imageIds[0])
          if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] loadImage completed`)
        }

        // 인덱스 설정 및 렌더링
        if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Setting imageIdIndex to 0...`)
        viewportRef.current!.setImageIdIndex(0)

        // CRITICAL: viewport resize 및 카메라 리셋 (컬러 이미지 렌더링에 필요할 수 있음)
        const renderingEngine = csGetRenderingEngine(renderingEngineId)
        if (renderingEngine) {
          renderingEngine.resize()
        }
        viewportRef.current!.resetCamera()
        viewportRef.current!.render()

        // DEBUG: 렌더링 상태 확인
        if (DEBUG_SLOT) {
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
        }

        setIsStackLoaded(true)
        if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Stack loaded with ${imageIds.length} frames`)

        // Phase 2: Viewport를 CineAnimationManager에 등록
        cineAnimationManager.registerViewport(slotId, viewportRef.current!, numberOfFrames)
      } catch (error) {
        console.error(`[CornerstoneSlot ${slotId}] Stack load failed:`, error)
        setIsStackLoaded(false)
      }
    }

    loadStack()

    // Cleanup: Viewport 등록 해제
    return () => {
      cineAnimationManager.unregisterViewport(slotId)
    }
  }, [instance?.sopInstanceUid, loading, slotId, isViewportReady, renderingEngineId, globalResolution, stackVersion])  // stackVersion 추가: 캐시 클리어 시 Stack 재설정

  // ==================== 자동 프리로드 ====================
  // Phase 2: 썸네일 로딩 완료 후 프리로드 시작 (썸네일 우선 전략)

  useEffect(() => {
    if (!instance || isPreloaded || isPreloading) return
    if (instance.numberOfFrames <= 1) return

    // 썸네일 로딩 완료 대기 (썸네일 우선 전략)
    if (!allThumbnailsLoaded) {
      if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Waiting for thumbnails before preload`)
      return
    }

    // 인스턴스 할당 후 자동 프리로드
    if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Starting preload (thumbnails loaded)`)
    preloadSlotFrames(slotId)
  }, [instance?.sopInstanceUid, isPreloaded, isPreloading, allThumbnailsLoaded, slotId, preloadSlotFrames])

  // ==================== 프레임 변경 시 뷰포트 업데이트 ====================
  // Phase 2: 재생 중에는 CineAnimationManager가 직접 viewport를 업데이트하므로 스킵

  useEffect(() => {
    if (!viewportRef.current || !instance || !isStackLoaded) return

    // Phase 2: 재생 중에는 CineAnimationManager가 직접 처리하므로 React에서 업데이트하지 않음
    if (isPlaying) return

    try {
      viewportRef.current.setImageIdIndex(currentFrame)
      viewportRef.current.render()
    } catch (error) {
      if (DEBUG_SLOT) console.warn(`[CornerstoneSlot ${slotId}] Frame ${currentFrame} not ready yet`)
    }
  }, [currentFrame, instance, isStackLoaded, isPlaying, slotId])

  // ==================== Cine 재생 루프 (CineAnimationManager 연동) ====================
  // 기존: 각 슬롯이 독립적인 requestAnimationFrame 루프 실행 → 타이밍 드리프트 발생
  // 개선: 중앙 집중식 CineAnimationManager로 모든 슬롯 동시 업데이트
  // Phase 2: CineAnimationManager가 직접 viewport를 조작 (React 상태 업데이트 없음)

  useEffect(() => {
    // 재생 조건 체크
    if (isPlaying && instance && instance.numberOfFrames > 1) {
      // Phase 2: 재생 시작 시 현재 프레임 인덱스를 CineAnimationManager에 동기화
      cineAnimationManager.setCurrentIndex(slotId, currentFrame)
      // CineAnimationManager에 등록 → 중앙 rAF 루프에서 직접 viewport 업데이트
      cineAnimationManager.registerSlot(slotId)
    } else {
      // CineAnimationManager에서 등록 해제 (내부에서 Zustand에 프레임 동기화)
      cineAnimationManager.unregisterSlot(slotId)
    }

    // Cleanup: 컴포넌트 언마운트 시 등록 해제
    return () => {
      cineAnimationManager.unregisterSlot(slotId)
    }
  }, [isPlaying, instance, slotId, currentFrame])

  // globalFps 변경 시 CineAnimationManager에 반영
  useEffect(() => {
    cineAnimationManager.setFrameTime(globalFps)
  }, [globalFps])

  // ==================== 렌더링 ====================

  const totalFrames = instance?.numberOfFrames || 0

  // 빈 슬롯 - viewport 생성하지 않음 (early return)
  // CRITICAL: key="empty"로 React가 viewport와 다른 컴포넌트로 인식하게 함
  if (!instance) {
    if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Returning EMPTY slot JSX`)
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
  if (loading) {
    if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Returning LOADING JSX`)
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
  // CRITICAL: key="viewport"로 React가 empty와 다른 컴포넌트로 인식하게 함
  // → instance 할당 시 remount되어 useEffect 재실행
  if (DEBUG_SLOT) console.log(`[CornerstoneSlot ${slotId}] Returning VIEWPORT JSX`)
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
        <CornerstoneSlotOverlay
          slotId={slotId}
          totalFrames={totalFrames}
          preloadProgress={preloadProgress}
          isPreloading={isPreloading}
          isPreloaded={isPreloaded}
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          loadedFrameCount={loadedFrameCount}
        />
      </div>
    </div>
  )
}
