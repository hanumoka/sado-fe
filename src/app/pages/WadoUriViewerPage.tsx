/**
 * WadoUriViewerPage - WADO-URI 기반 Series Viewer (POC)
 *
 * WADO-URI API + cornerstoneWADOImageLoader 사용
 * 공유 컴포넌트 사용으로 코드 간소화
 *
 * 라우트: /viewer/wado-uri/:studyInstanceUid/:seriesInstanceUid
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RenderingEngine } from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { useInstances } from '@/features/dicom-viewer/hooks/useInstances'
import {
  useWadoUriMultiViewerStore,
  WadoUriSlot,
  WADO_URI_TOOL_GROUP_ID,
} from '@/features/dicom-viewer-wado-uri'
import { initCornerstone } from '@/lib/cornerstone/initCornerstone'
import { BaseViewerLayout, useViewerPage, wadoUriStrategy } from '@/features/dicom-viewer-shared'
import type { WadoUriInstanceSummary } from '@/features/dicom-viewer-wado-uri'
import type { BaseInstanceInfo, GridLayout } from '@/features/dicom-viewer-shared'

// 디버그 로그 플래그
const DEBUG_PAGE = false

// WADO-URI 전용 RenderingEngine ID
const WADO_URI_RENDERING_ENGINE_ID = 'wadoUriViewerEngine'

export default function WadoUriViewerPage() {
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()
  const navigate = useNavigate()
  const [isInitialized, setIsInitialized] = useState(false)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)

  // Instance 목록 조회
  const { data, isLoading, error } = useInstances(
    studyInstanceUid || '',
    seriesInstanceUid || ''
  )

  // WADO-URI 전용 store
  const {
    layout: storeLayout,
    globalFps,
    setGlobalFps,
    setLayout: setStoreLayout,
    assignInstanceToSlot,
    playAll,
    pauseAll,
    stopAll,
    clearAllSlots,
    setTotalThumbnailCount,
    markThumbnailLoaded,
    resetThumbnailTracking,
  } = useWadoUriMultiViewerStore()

  // 인스턴스를 BaseInstanceInfo로 변환 (memoize하여 무한 루프 방지)
  const instances: BaseInstanceInfo[] = useMemo(() =>
    (data?.instances || []).map((inst) => ({
      sopInstanceUid: inst.sopInstanceUid,
      studyInstanceUid: studyInstanceUid || '',
      seriesInstanceUid: seriesInstanceUid || '',
      numberOfFrames: inst.numberOfFrames || 1,
      instanceNumber: inst.instanceNumber,
      transferSyntaxUid: inst.transferSyntaxUid,
    })),
    [data?.instances, studyInstanceUid, seriesInstanceUid]
  )

  // 공유 훅 사용
  const {
    layout,
    setLayout,
    currentLayoutSlots,
    selectedSlot,
    setSelectedSlot,
    handleSlotClick,
    instanceFilter,
    setInstanceFilter,
    filteredInstances,
    playableCount,
    totalCount,
    handleThumbnailLoad,
    handleThumbnailError,
  } = useViewerPage({
    instances,
    initialLayout: storeLayout,
    initialFilter: 'playable',
    onLayoutChange: setStoreLayout,
    onThumbnailLoad: markThumbnailLoaded,
    setTotalThumbnailCount,
    resetThumbnailTracking,
  })

  // ==================== Cornerstone 및 ToolGroup 초기화 ====================
  useEffect(() => {
    const init = async () => {
      try {
        if (DEBUG_PAGE) console.log('[WadoUriViewerPage] Starting initialization...')
        await initCornerstone()

        if (renderingEngineRef.current) {
          setIsInitialized(true)
          return
        }

        renderingEngineRef.current = new RenderingEngine(WADO_URI_RENDERING_ENGINE_ID)

        // WADO-URI 전용 ToolGroup 생성
        let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_URI_TOOL_GROUP_ID)
        if (!toolGroup) {
          toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(WADO_URI_TOOL_GROUP_ID)
          if (toolGroup) {
            toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName)
            toolGroup.addTool(cornerstoneTools.PanTool.toolName)
            toolGroup.addTool(cornerstoneTools.ZoomTool.toolName)
            toolGroup.addTool(cornerstoneTools.StackScrollTool.toolName)

            toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
            })
            toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
            })
            toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
            })
            toolGroup.setToolActive(cornerstoneTools.StackScrollTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
            })
          }
        }

        setIsInitialized(true)
        if (DEBUG_PAGE) console.log('[WadoUriViewerPage] ✅ Initialized')
      } catch (error) {
        if (DEBUG_PAGE) console.error('[WadoUriViewerPage] ❌ Initialization failed:', error)
      }
    }
    init()
  }, [])

  // 클린업
  useEffect(() => {
    return () => {
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.destroy()
        } catch (e) {
          if (DEBUG_PAGE) console.warn('[WadoUriViewerPage] Error destroying RenderingEngine:', e)
        }
        renderingEngineRef.current = null
      }
      try {
        const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_URI_TOOL_GROUP_ID)
        if (toolGroup) {
          cornerstoneTools.ToolGroupManager.destroyToolGroup(WADO_URI_TOOL_GROUP_ID)
        }
      } catch (e) {
        if (DEBUG_PAGE) console.warn('[WadoUriViewerPage] Error destroying ToolGroup:', e)
      }
      clearAllSlots()
    }
  }, [clearAllSlots])

  // ==================== 레이아웃 동기화 ====================
  useEffect(() => {
    setStoreLayout(layout)
  }, [layout, setStoreLayout])

  // ==================== 자동 슬롯 할당 ====================
  useEffect(() => {
    if (!isInitialized || !filteredInstances.length || !studyInstanceUid || !seriesInstanceUid) {
      return
    }

    filteredInstances.slice(0, currentLayoutSlots).forEach((instance, index) => {
      const instanceSummary: WadoUriInstanceSummary = {
        sopInstanceUid: instance.sopInstanceUid,
        studyInstanceUid: studyInstanceUid,
        seriesInstanceUid: seriesInstanceUid,
        numberOfFrames: instance.numberOfFrames || 1,
      }
      assignInstanceToSlot(index, instanceSummary)
    })
  }, [isInitialized, filteredInstances, studyInstanceUid, seriesInstanceUid, currentLayoutSlots, assignInstanceToSlot])

  // ==================== 핸들러 ====================
  const handleBack = useCallback(() => navigate(-1), [navigate])

  const handleThumbnailClick = useCallback((instanceIndex: number) => {
    const instance = filteredInstances[instanceIndex]
    if (!instance || !studyInstanceUid || !seriesInstanceUid) return

    const instanceSummary: WadoUriInstanceSummary = {
      sopInstanceUid: instance.sopInstanceUid,
      studyInstanceUid,
      seriesInstanceUid,
      numberOfFrames: instance.numberOfFrames || 1,
    }

    assignInstanceToSlot(selectedSlot, instanceSummary)
    setSelectedSlot((selectedSlot + 1) % currentLayoutSlots)
  }, [filteredInstances, studyInstanceUid, seriesInstanceUid, selectedSlot, currentLayoutSlots, assignInstanceToSlot, setSelectedSlot])

  const handleLayoutChange = useCallback((newLayout: GridLayout) => {
    setLayout(newLayout)

    if (filteredInstances.length && studyInstanceUid && seriesInstanceUid) {
      const newSlots = newLayout === '1x1' ? 1 : newLayout === '2x2' ? 4 : newLayout === '3x3' ? 9 : newLayout === '4x4' ? 16 : 25
      filteredInstances.slice(0, newSlots).forEach((instance, index) => {
        const instanceSummary: WadoUriInstanceSummary = {
          sopInstanceUid: instance.sopInstanceUid,
          studyInstanceUid,
          seriesInstanceUid,
          numberOfFrames: instance.numberOfFrames || 1,
        }
        assignInstanceToSlot(index, instanceSummary)
      })
    }
  }, [filteredInstances, studyInstanceUid, seriesInstanceUid, assignInstanceToSlot, setLayout])

  // 슬롯 렌더링 (Render Prop)
  const renderSlot = useCallback((slotId: number) => (
    <WadoUriSlot slotId={slotId} renderingEngineId={WADO_URI_RENDERING_ENGINE_ID} />
  ), [])

  return (
    <BaseViewerLayout
      strategy={wadoUriStrategy}
      modality={data?.series?.modality}
      seriesDescription={data?.series?.seriesDescription}
      layout={layout}
      isInitialized={isInitialized}
      isLoading={isLoading}
      error={error}
      selectedSlot={selectedSlot}
      filteredInstances={filteredInstances}
      instanceFilter={instanceFilter}
      playableCount={playableCount}
      totalCount={totalCount}
      globalFps={globalFps}
      onLayoutChange={handleLayoutChange}
      onSlotClick={handleSlotClick}
      onThumbnailClick={handleThumbnailClick}
      onFilterChange={setInstanceFilter}
      onFpsChange={setGlobalFps}
      onPlayAll={playAll}
      onPauseAll={pauseAll}
      onStopAll={stopAll}
      onBack={handleBack}
      onThumbnailLoad={handleThumbnailLoad}
      onThumbnailError={handleThumbnailError}
      renderSlot={renderSlot}
    />
  )
}
