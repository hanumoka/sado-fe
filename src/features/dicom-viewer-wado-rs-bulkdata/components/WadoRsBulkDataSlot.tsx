/**
 * WadoRsBulkDataSlot - WADO-RS BulkData 개별 슬롯 뷰어 컴포넌트
 *
 * Cornerstone Stack Viewport 기반 멀티프레임 DICOM 뷰어
 * WADO-RS BulkData API + requestAnimationFrame Cine 재생
 *
 * dicom-viewer, dicom-viewer-wado-uri의 Slot과 완전 독립적인 구현
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import {
  Enums,
  getRenderingEngine as csGetRenderingEngine,
  imageLoader,
  type Types,
} from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { useWadoRsBulkDataMultiViewerStore } from '../stores/wadoRsBulkDataMultiViewerStore'
import { handleDicomError } from '@/lib/errors'
import { createWadoRsBulkDataImageIds } from '../utils/wadoRsBulkDataImageIdHelper'
import { createWadoRsRenderedImageIds } from '@/lib/cornerstone/wadoRsRenderedLoader'
import { wadoRsBulkDataCineAnimationManager } from '../utils/wadoRsBulkDataCineAnimationManager'
import { fetchAndCacheMetadata } from '../utils/wadoRsBulkDataMetadataProvider'
import { useShallow } from 'zustand/react/shallow'
import { WadoRsBulkDataSlotOverlay } from './WadoRsBulkDataSlotOverlay'
import type { WadoRsBulkDataInstanceSummary } from '../types/wadoRsBulkDataTypes'

// WADO-RS BulkData 전용 Tool Group ID
export const WADO_RS_BULKDATA_TOOL_GROUP_ID = 'wado-rs-bulkdata-tool-group'

interface WadoRsBulkDataSlotProps {
  slotId: number
  renderingEngineId: string
}

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_SLOT = false

export function WadoRsBulkDataSlot({ slotId, renderingEngineId }: WadoRsBulkDataSlotProps) {
  // ==================== Zustand Selector 분리 (리렌더링 최적화) ====================

  // 원시 타입 필드 (개별 선택)
  const currentFrame = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.currentFrame ?? 0
  )
  const isPlaying = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.isPlaying ?? false
  )
  const isPreloading = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.isPreloading ?? false
  )
  const isPreloaded = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.isPreloaded ?? false
  )
  const preloadProgress = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.preloadProgress ?? 0
  )
  const loading = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.loading ?? false
  )
  const error = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.error ?? null
  )
  const metadataError = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.metadataError ?? null
  )

  // Stack 재로드 트리거 (캐시 클리어 시 증가)
  const stackVersion = useWadoRsBulkDataMultiViewerStore(
    (state) => state.slots[slotId]?.stackVersion ?? 0
  )

  // 객체 타입 필드 (shallow 비교로 불필요한 리렌더링 방지)
  const instance = useWadoRsBulkDataMultiViewerStore(
    useShallow((state) => state.slots[slotId]?.instance ?? null)
  )

  if (DEBUG_SLOT) {
    if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] RENDER - instance:`, !!instance, 'loading:', loading)
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Types.IStackViewport | null>(null)
  const [isStackLoaded, setIsStackLoaded] = useState(false)
  const [isViewportReady, setIsViewportReady] = useState(false)

  // 전역 상태 및 액션
  const globalFps = useWadoRsBulkDataMultiViewerStore((state) => state.globalFps)
  const globalFormat = useWadoRsBulkDataMultiViewerStore((state) => state.globalFormat)
  const globalResolution = useWadoRsBulkDataMultiViewerStore((state) => state.globalResolution)
  const syncMode = useWadoRsBulkDataMultiViewerStore((state) => state.syncMode)
  const assignInstanceToSlot = useWadoRsBulkDataMultiViewerStore((state) => state.assignInstanceToSlot)
  const preloadSlotFrames = useWadoRsBulkDataMultiViewerStore((state) => state.preloadSlotFrames)
  const setSlotMetadataError = useWadoRsBulkDataMultiViewerStore((state) => state.setSlotMetadataError)
  const viewportId = `wado-rs-bulkdata-slot-${slotId}`

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
        const instance: WadoRsBulkDataInstanceSummary = JSON.parse(instanceData)
        assignInstanceToSlot(slotId, instance)
      } catch (error) {
        if (DEBUG_SLOT) console.error('[WadoRsBulkDataSlot] Drop failed:', error)
      }
    },
    [slotId, assignInstanceToSlot]
  )

  // ==================== Viewport 초기화 ====================

  useEffect(() => {
    if (DEBUG_SLOT) {
      if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Viewport init effect CALLED - containerRef:`, !!containerRef.current, 'instance:', !!instance, 'loading:', loading)
    }

    if (!containerRef.current) {
      if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Early return - no containerRef`)
      return
    }

    if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Viewport init effect triggered`)

    const renderingEngine = csGetRenderingEngine(renderingEngineId)
    if (!renderingEngine) {
      if (DEBUG_SLOT) console.warn(`[WadoRsBulkDataSlot ${slotId}] RenderingEngine not found`)
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
      if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Viewport created, isViewportReady: true`)

      // ToolGroup에 viewport 연결
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_RS_BULKDATA_TOOL_GROUP_ID)
      if (toolGroup) {
        try {
          toolGroup.addViewport(viewportId, renderingEngineId)
          if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Viewport added to ToolGroup`)
        } catch (e) {
          // 이미 추가된 경우 무시
        }
      }
    } catch (error) {
      if (DEBUG_SLOT) if (DEBUG_SLOT) console.error(`[WadoRsBulkDataSlot ${slotId}] Viewport creation failed:`, error)
    }

    return () => {
      setIsViewportReady(false)
      // ToolGroup에서 viewport 제거
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_RS_BULKDATA_TOOL_GROUP_ID)
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
          if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Viewport disabled (cleanup)`)
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
      if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Stack effect - isViewportReady:`, isViewportReady, 'viewportRef:', !!viewportRef.current, 'instance:', !!instance)
    }

    if (!viewportRef.current || !instance || !isViewportReady) {
      setIsStackLoaded(false)
      return
    }

    const loadStack = async () => {
      setIsStackLoaded(false)

      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, numberOfFrames } = instance

      if (DEBUG_SLOT) {
        if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Loading stack:`, {
          sopInstanceUid: sopInstanceUid.slice(0, 20) + '...',
          numberOfFrames,
        })
      }

      // CRITICAL: 메타데이터를 먼저 로드해야 Cornerstone이 PixelData를 디코딩할 수 있음
      try {
        if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Fetching metadata before setStack...`)
        await fetchAndCacheMetadata(studyInstanceUid, seriesInstanceUid, sopInstanceUid)
        setSlotMetadataError(slotId, null) // 성공 시 에러 클리어
        if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Metadata cached`)
      } catch (metadataErr) {
        const errorMessage = handleDicomError(metadataErr, 'fetchMetadata')
        console.error(`[WadoRsBulkDataSlot ${slotId}] Failed to fetch metadata:`, metadataErr)
        setSlotMetadataError(slotId, errorMessage)
        // 메타데이터 실패해도 계속 진행 (fallback 값 사용)
      }

      // Data Source에 따른 imageIds 생성
      let imageIds: string[]
      if (globalFormat === 'rendered') {
        // Pre-rendered JPEG/PNG (resolution 지원)
        imageIds = createWadoRsRenderedImageIds(
          studyInstanceUid,
          seriesInstanceUid,
          sopInstanceUid,
          numberOfFrames,
          globalResolution
        )
      } else {
        // WADO-RS BulkData (jpeg-baseline/original/raw)
        imageIds = createWadoRsBulkDataImageIds(
          studyInstanceUid,
          seriesInstanceUid,
          sopInstanceUid,
          numberOfFrames,
          globalFormat  // 'jpeg-baseline' | 'original' | 'raw'
        )
      }

      try {
        if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Calling setStack with ${imageIds.length} imageIds...`)
        await viewportRef.current!.setStack(imageIds)
        if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] setStack completed`)

        // 첫 프레임 로드 (캐시에서 반환됨)
        if (imageIds.length > 0) {
          if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Calling loadImage for first frame (cache hit expected)...`)
          await imageLoader.loadImage(imageIds[0])
          if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] loadImage completed`)
        }

        // 인덱스 설정 및 렌더링
        if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Setting imageIdIndex to 0...`)
        viewportRef.current!.setImageIdIndex(0)

        // viewport resize 및 카메라 리셋
        const renderingEngine = csGetRenderingEngine(renderingEngineId)
        if (renderingEngine) {
          renderingEngine.resize()
        }
        viewportRef.current!.resetCamera()

        // Cornerstone 내부 상태 동기화를 위한 프레임 대기
        // 브라우저 레이아웃 계산 완료 후 렌더링해야 검은 화면 방지
        await new Promise(resolve => requestAnimationFrame(resolve))
        await new Promise(resolve => requestAnimationFrame(resolve))

        viewportRef.current!.render()

        if (DEBUG_SLOT) {
          const canvas = viewportRef.current!.getCanvas()
          const element = containerRef.current!
          if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] DEBUG after render:`, {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            elementClientWidth: element.clientWidth,
            elementClientHeight: element.clientHeight,
            currentImageIdIndex: viewportRef.current!.getCurrentImageIdIndex(),
            imageIdsLength: viewportRef.current!.getImageIds().length,
          })
        }

        // CRITICAL: registerViewport()를 먼저 호출해야 함!
        // setIsStackLoaded(true)가 Cine useEffect를 트리거하여 registerSlot() 호출
        // 이 시점에 viewport가 이미 등록되어 있어야 animation 루프에서 찾을 수 있음
        wadoRsBulkDataCineAnimationManager.registerViewport(slotId, viewportRef.current!, numberOfFrames)

        setIsStackLoaded(true)
        if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Stack loaded with ${imageIds.length} frames`)
      } catch (error) {
        if (DEBUG_SLOT) console.error(`[WadoRsBulkDataSlot ${slotId}] Stack load failed:`, error)
        setIsStackLoaded(false)
      }
    }

    loadStack()

    // Cleanup: Viewport 등록 해제
    return () => {
      wadoRsBulkDataCineAnimationManager.unregisterViewport(slotId)
    }
  }, [instance?.sopInstanceUid, loading, slotId, isViewportReady, renderingEngineId, stackVersion, globalFormat, globalResolution])  // stackVersion: 캐시 클리어 시 Stack 재설정, globalFormat/globalResolution: 포맷/해상도 변경 시 재설정

  // ==================== 사전 캐싱 (Phase 3 최적화) ====================
  // Stack 로드 완료 직후 프리로드 시작
  // - Independent 모드: 즉시 사전 캐싱 (빠른 재생 시작)
  // - Global Sync 모드: playAll()이 조정하므로 건너뜀 (동기화 보장)

  useEffect(() => {
    if (!instance || !isStackLoaded) return
    if (instance.numberOfFrames <= 1) return
    if (isPreloaded || isPreloading) return

    // Global Sync 모드: playAll()이 조정하므로 auto-preload 건너뜀
    // (playAll()에서 모든 슬롯을 동시에 프리로드하여 동기화 보장)
    if (syncMode === 'global-sync') {
      if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Global Sync - skipping auto-preload (playAll will coordinate)`)
      return
    }

    // Independent 모드: 즉시 프리로드 시작 (사전 캐싱)
    if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Pre-caching after stack loaded (Phase 3)`)
    preloadSlotFrames(slotId)
  }, [instance?.sopInstanceUid, isStackLoaded, isPreloaded, isPreloading, slotId, preloadSlotFrames, syncMode])

  // ==================== 프레임 변경 시 뷰포트 업데이트 ====================

  useEffect(() => {
    if (!viewportRef.current || !instance || !isStackLoaded) return

    // 재생 중에는 CineAnimationManager가 직접 처리
    if (isPlaying) return

    try {
      viewportRef.current.setImageIdIndex(currentFrame)
      viewportRef.current.render()
    } catch (error) {
      if (DEBUG_SLOT) if (DEBUG_SLOT) console.warn(`[WadoRsBulkDataSlot ${slotId}] Frame ${currentFrame} not ready yet`)
    }
  }, [currentFrame, instance, isStackLoaded, isPlaying, slotId])

  // ==================== Cine 재생 루프 (WadoRsBulkDataCineAnimationManager 연동) ====================

  useEffect(() => {
    // CRITICAL: currentFrame 의존성 제거!
    // 재생 중에는 BaseCineAnimationManager가 viewport를 직접 조작함 (setImageIdIndex)
    // currentFrame이 의존성에 있으면 매 프레임마다 cleanup(unregisterSlot) → effect(registerSlot) 반복
    // → 9개 슬롯이 동시에 등록/해제 반복 → RAF 콜백과 경합 → race condition (일부 슬롯만 재생)
    if (isPlaying && instance && instance.numberOfFrames > 1 && isStackLoaded) {
      // 재생 시작 시 현재 프레임 위치 설정 (한 번만 실행됨)
      wadoRsBulkDataCineAnimationManager.setCurrentIndex(slotId, currentFrame)
      wadoRsBulkDataCineAnimationManager.registerSlot(slotId)
    } else {
      wadoRsBulkDataCineAnimationManager.unregisterSlot(slotId)
    }

    return () => {
      wadoRsBulkDataCineAnimationManager.unregisterSlot(slotId)
    }
  }, [isPlaying, instance, slotId, isStackLoaded])  // currentFrame 제거됨!

  // globalFps 변경 시 CineAnimationManager에 반영
  useEffect(() => {
    wadoRsBulkDataCineAnimationManager.setFrameTime(globalFps)
  }, [globalFps])

  // ==================== 렌더링 ====================

  const totalFrames = instance?.numberOfFrames || 0

  // 빈 슬롯
  if (!instance) {
    if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Returning EMPTY slot JSX`)
    return (
      <div
        key="empty"
        className="relative bg-gray-800 rounded-lg border-2 border-dashed border-cyan-600/50 flex flex-col items-center justify-center min-h-[200px] w-full h-full"
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
          <p className="text-xs mt-1 text-cyan-500">(WADO-RS BulkData)</p>
        </div>
      </div>
    )
  }

  // 로딩 상태
  if (loading) {
    if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Returning LOADING JSX`)
    return (
      <div className="relative bg-gray-900 rounded-lg flex items-center justify-center min-h-[200px] w-full h-full">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-2" />
          <p className="text-sm">Loading (WADO-RS BulkData)...</p>
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
  if (DEBUG_SLOT) if (DEBUG_SLOT) console.log(`[WadoRsBulkDataSlot ${slotId}] Returning VIEWPORT JSX`)
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
        <WadoRsBulkDataSlotOverlay
          slotId={slotId}
          totalFrames={totalFrames}
          preloadProgress={preloadProgress}
          isPreloading={isPreloading}
          isPreloaded={isPreloaded}
          isPlaying={isPlaying}
          metadataError={metadataError}
        />
      </div>
    </div>
  )
}
