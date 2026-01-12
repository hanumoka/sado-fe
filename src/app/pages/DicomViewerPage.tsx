/**
 * DicomViewerPage - Cornerstone 기반 Series Viewer
 *
 * WADO-RS Rendered API + 커스텀 로더 사용
 * 공유 컴포넌트 사용으로 코드 간소화
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RenderingEngine } from '@cornerstonejs/core'
import { useInstances } from '@/features/dicom-viewer/hooks/useInstances'
import { useCornerstoneMultiViewerStore } from '@/features/dicom-viewer/stores'
import { CornerstoneSlot } from '@/features/dicom-viewer/components'
import { initCornerstone } from '@/lib/cornerstone/initCornerstone'
import { BaseViewerLayout, useViewerPage, wadoRsRenderedStrategy } from '@/features/dicom-viewer-shared'
import type { InstanceSummary } from '@/features/dicom-viewer/types/multiSlotViewer'
import type { BaseInstanceInfo, GridLayout } from '@/features/dicom-viewer-shared'

// 디버그 로그 플래그
const DEBUG_PAGE = false

const RENDERING_ENGINE_ID = 'dicomViewerPageEngine'

export default function DicomViewerPage() {
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()
  const navigate = useNavigate()
  const [isInitialized, setIsInitialized] = useState(false)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)

  // WADO-RS로 Instance 목록 조회
  const { data, isLoading, error } = useInstances(
    studyInstanceUid || '',
    seriesInstanceUid || ''
  )

  // Cornerstone store
  const {
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
  } = useCornerstoneMultiViewerStore()

  // 인스턴스를 BaseInstanceInfo로 변환 (memoize하여 무한 루프 방지)
  const instances: BaseInstanceInfo[] = useMemo(() =>
    (data?.instances || []).map((inst) => ({
      sopInstanceUid: inst.sopInstanceUid,
      studyInstanceUid: studyInstanceUid || '',
      seriesInstanceUid: seriesInstanceUid || '',
      numberOfFrames: inst.numberOfFrames || 1,
      instanceNumber: inst.instanceNumber,
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
    initialLayout: '1x1',
    initialFilter: 'playable',
    onLayoutChange: setStoreLayout,
    onThumbnailLoad: markThumbnailLoaded,
    setTotalThumbnailCount,
    resetThumbnailTracking,
  })

  // ==================== Cornerstone 초기화 ====================
  useEffect(() => {
    const init = async () => {
      try {
        if (DEBUG_PAGE) console.log('[DicomViewerPage] Starting Cornerstone initialization...')
        await initCornerstone()

        if (renderingEngineRef.current) {
          setIsInitialized(true)
          return
        }

        renderingEngineRef.current = new RenderingEngine(RENDERING_ENGINE_ID)
        setIsInitialized(true)
        if (DEBUG_PAGE) console.log('[DicomViewerPage] ✅ Cornerstone initialized')
      } catch (error) {
        if (DEBUG_PAGE) console.error('[DicomViewerPage] ❌ Initialization failed:', error)
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
          if (DEBUG_PAGE) console.warn('[DicomViewerPage] Error destroying RenderingEngine:', e)
        }
        renderingEngineRef.current = null
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
      const instanceSummary: InstanceSummary = {
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

    const instanceSummary: InstanceSummary = {
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
      const newSlots = newLayout === '1x1' ? 1 : newLayout === '2x2' ? 4 : newLayout === '3x3' ? 9 : 16
      filteredInstances.slice(0, newSlots).forEach((instance, index) => {
        const instanceSummary: InstanceSummary = {
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
    <CornerstoneSlot slotId={slotId} renderingEngineId={RENDERING_ENGINE_ID} />
  ), [])

  return (
    <BaseViewerLayout
      strategy={wadoRsRenderedStrategy}
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
