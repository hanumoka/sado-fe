/**
 * WadoRsViewerPage - WADO-RS BulkData 기반 Series Viewer (POC)
 *
 * WADO-RS BulkData API + cornerstoneDICOMImageLoader wadors: scheme 사용
 * 공유 컴포넌트 사용으로 코드 간소화
 *
 * 라우트: /viewer/wado-rs/:studyInstanceUid/:seriesInstanceUid
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RenderingEngine } from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { useInstances } from '@/features/dicom-viewer/hooks/useInstances'
import {
  useWadoRsBulkDataMultiViewerStore,
  WadoRsBulkDataSlot,
  WADO_RS_BULKDATA_TOOL_GROUP_ID,
  BatchSizeTestPanel,
  FormatSelectorPanel,
} from '@/features/dicom-viewer-wado-rs-bulkdata'
import { initCornerstone } from '@/lib/cornerstone/initCornerstone'
import { BaseViewerLayout, useViewerPage, wadoRsBulkDataStrategy, LAYOUT_OPTIONS } from '@/features/dicom-viewer-shared'
import type { WadoRsBulkDataInstanceSummary } from '@/features/dicom-viewer-wado-rs-bulkdata'
import type { BaseInstanceInfo, GridLayout } from '@/features/dicom-viewer-shared'

// WADO-RS BulkData는 3x3까지만 지원 (메모리/CPU 최적화)
const WADO_RS_LAYOUT_OPTIONS = LAYOUT_OPTIONS.filter(
  (option) => !['4x4', '5x5'].includes(option.value)
)

// 디버그 로그 플래그
const DEBUG_PAGE = false

// WADO-RS BulkData 전용 RenderingEngine ID
const WADO_RS_BULKDATA_RENDERING_ENGINE_ID = 'wadoRsBulkDataViewerEngine'

export default function WadoRsViewerPage() {
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

  // WADO-RS BulkData 전용 store
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
  } = useWadoRsBulkDataMultiViewerStore()

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
        if (DEBUG_PAGE) console.log('[WadoRsViewerPage] Starting initialization...')
        await initCornerstone()

        if (renderingEngineRef.current) {
          setIsInitialized(true)
          return
        }

        renderingEngineRef.current = new RenderingEngine(WADO_RS_BULKDATA_RENDERING_ENGINE_ID)

        // WADO-RS BulkData 전용 ToolGroup 생성
        let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_RS_BULKDATA_TOOL_GROUP_ID)
        if (!toolGroup) {
          toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(WADO_RS_BULKDATA_TOOL_GROUP_ID)
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
        if (DEBUG_PAGE) console.log('[WadoRsViewerPage] ✅ Initialized')
      } catch (error) {
        if (DEBUG_PAGE) console.error('[WadoRsViewerPage] ❌ Initialization failed:', error)
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
          if (DEBUG_PAGE) console.warn('[WadoRsViewerPage] Error destroying RenderingEngine:', e)
        }
        renderingEngineRef.current = null
      }
      try {
        const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_RS_BULKDATA_TOOL_GROUP_ID)
        if (toolGroup) {
          cornerstoneTools.ToolGroupManager.destroyToolGroup(WADO_RS_BULKDATA_TOOL_GROUP_ID)
        }
      } catch (e) {
        if (DEBUG_PAGE) console.warn('[WadoRsViewerPage] Error destroying ToolGroup:', e)
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
      const instanceSummary: WadoRsBulkDataInstanceSummary = {
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
    if (!studyInstanceUid || !seriesInstanceUid) return

    // 클릭한 인스턴스부터 시작해서 레이아웃 슬롯 수만큼 연속 할당
    for (let slotId = 0; slotId < currentLayoutSlots; slotId++) {
      const targetInstanceIndex = instanceIndex + slotId
      const instance = filteredInstances[targetInstanceIndex]

      if (instance) {
        const instanceSummary: WadoRsBulkDataInstanceSummary = {
          sopInstanceUid: instance.sopInstanceUid,
          studyInstanceUid,
          seriesInstanceUid,
          numberOfFrames: instance.numberOfFrames || 1,
        }
        assignInstanceToSlot(slotId, instanceSummary)
      }
    }

    // 첫 번째 슬롯을 선택 상태로 설정
    setSelectedSlot(0)
  }, [filteredInstances, studyInstanceUid, seriesInstanceUid, currentLayoutSlots, assignInstanceToSlot, setSelectedSlot])

  const handleLayoutChange = useCallback((newLayout: GridLayout) => {
    setLayout(newLayout)

    if (filteredInstances.length && studyInstanceUid && seriesInstanceUid) {
      const newSlots = newLayout === '1x1' ? 1 : newLayout === '2x2' ? 4 : newLayout === '3x3' ? 9 : newLayout === '4x4' ? 16 : 25
      filteredInstances.slice(0, newSlots).forEach((instance, index) => {
        const instanceSummary: WadoRsBulkDataInstanceSummary = {
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
    <WadoRsBulkDataSlot slotId={slotId} renderingEngineId={WADO_RS_BULKDATA_RENDERING_ENGINE_ID} />
  ), [])

  return (
    <BaseViewerLayout
      strategy={wadoRsBulkDataStrategy}
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
      extraControls={
        <>
          <FormatSelectorPanel />
          <BatchSizeTestPanel />
        </>
      }
      layoutOptions={WADO_RS_LAYOUT_OPTIONS}
    />
  )
}
