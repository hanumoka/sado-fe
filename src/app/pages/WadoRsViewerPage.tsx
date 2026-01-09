/**
 * WadoRsViewerPage - WADO-RS BulkData 기반 Series Viewer (POC)
 *
 * dicom-viewer, dicom-viewer-wado-uri의 Viewer와 완전 독립적인 구현
 * WADO-RS BulkData API + cornerstoneDICOMImageLoader wadors: scheme 사용
 *
 * 라우트: /viewer/wado-rs/:studyInstanceUid/:seriesInstanceUid
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Square, Loader2, AlertCircle, Film, Image } from 'lucide-react'
import { RenderingEngine } from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { useInstances } from '@/features/dicom-viewer/hooks/useInstances'
import {
  useWadoRsBulkDataMultiViewerStore,
  WadoRsBulkDataSlot,
  WADO_RS_BULKDATA_TOOL_GROUP_ID,
  BatchSizeTestPanel,
} from '@/features/dicom-viewer-wado-rs-bulkdata'
import { initCornerstone, isInitialized as isCornerstoneInitialized } from '@/lib/cornerstone/initCornerstone'
import { getRenderedFrameUrl } from '@/lib/services/dicomWebService'
import type { WadoRsBulkDataInstanceSummary, WadoRsBulkDataGridLayout } from '@/features/dicom-viewer-wado-rs-bulkdata'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_PAGE = false

type InstanceFilter = 'all' | 'playable'

const LAYOUT_OPTIONS: { value: WadoRsBulkDataGridLayout; label: string; slots: number }[] = [
  { value: '1x1', label: '1×1', slots: 1 },
  { value: '2x2', label: '2×2', slots: 4 },
  { value: '3x3', label: '3×3', slots: 9 },
  { value: '4x4', label: '4×4', slots: 16 },
]

// WADO-RS BulkData 전용 RenderingEngine ID
const WADO_RS_BULKDATA_RENDERING_ENGINE_ID = 'wadoRsBulkDataViewerEngine'

export default function WadoRsViewerPage() {
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()
  const navigate = useNavigate()
  const [layout, setLayout] = useState<WadoRsBulkDataGridLayout>('1x1')
  const [isInitialized, setIsInitialized] = useState(false)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)

  // 현재 선택된 슬롯
  const [selectedSlot, setSelectedSlot] = useState<number>(0)
  // 썸네일 이미지 에러 상태
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({})
  // 인스턴스 필터
  const [instanceFilter, setInstanceFilter] = useState<InstanceFilter>('playable')

  // Instance 목록 조회 (공통 hook 재사용)
  const { data, isLoading, error } = useInstances(
    studyInstanceUid || '',
    seriesInstanceUid || ''
  )

  // WADO-RS BulkData 전용 store
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
  } = useWadoRsBulkDataMultiViewerStore()

  const instances = data?.instances || []
  const currentLayoutSlots = LAYOUT_OPTIONS.find((o) => o.value === layout)?.slots || 1

  // 필터링된 인스턴스 목록
  const filteredInstances = useMemo(() => {
    if (instanceFilter === 'playable') {
      return instances.filter((inst) => (inst.numberOfFrames || 1) > 1)
    }
    return instances
  }, [instances, instanceFilter])

  // 통계
  const playableCount = useMemo(() =>
    instances.filter((inst) => (inst.numberOfFrames || 1) > 1).length
  , [instances])
  const totalCount = instances.length

  // ==================== 썸네일 로딩 추적 ====================

  useEffect(() => {
    if (filteredInstances.length > 0) {
      setTotalThumbnailCount(filteredInstances.length)
    }
  }, [filteredInstances.length, setTotalThumbnailCount])

  useEffect(() => {
    return () => {
      resetThumbnailTracking()
    }
  }, [resetThumbnailTracking])

  // ==================== Cornerstone 초기화 ====================

  useEffect(() => {
    const init = async () => {
      try {
        if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] Starting Cornerstone initialization...')
        await initCornerstone()

        if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] initCornerstone completed, isCornerstoneInitialized:', isCornerstoneInitialized())

        // RenderingEngine이 이미 있으면 재사용
        if (renderingEngineRef.current) {
          if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] RenderingEngine already exists, reusing')
          setIsInitialized(true)
          return
        }

        // RenderingEngine 생성
        renderingEngineRef.current = new RenderingEngine(WADO_RS_BULKDATA_RENDERING_ENGINE_ID)

        // WADO-RS BulkData 전용 ToolGroup 생성
        let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(WADO_RS_BULKDATA_TOOL_GROUP_ID)
        if (!toolGroup) {
          toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(WADO_RS_BULKDATA_TOOL_GROUP_ID)
          if (toolGroup) {
            // 기본 도구 추가
            toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName)
            toolGroup.addTool(cornerstoneTools.PanTool.toolName)
            toolGroup.addTool(cornerstoneTools.ZoomTool.toolName)
            toolGroup.addTool(cornerstoneTools.StackScrollTool.toolName)

            // WindowLevel을 기본 도구로 설정
            toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
            })
            // Pan - 휠클릭
            toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
            })
            // Zoom - 우클릭
            toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
            })
            // StackScroll - 휠
            toolGroup.setToolActive(cornerstoneTools.StackScrollTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
            })
          }
        }

        setIsInitialized(true)
        if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] Cornerstone and RenderingEngine initialized')
      } catch (error) {
        if (DEBUG_PAGE) console.error('[WadoRsViewerPage] Cornerstone initialization failed:', error)
      }
    }

    init()
  }, [])

  // 클린업
  useEffect(() => {
    return () => {
      if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] Component unmounting - destroying RenderingEngine')
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.destroy()
        } catch (e) {
          if (DEBUG_PAGE) console.warn('[WadoRsViewerPage] Error destroying RenderingEngine:', e)
        }
        renderingEngineRef.current = null
      }
      // ToolGroup 정리
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

  // ==================== 인스턴스 자동 슬롯 할당 ====================

  useEffect(() => {
    if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] Auto-assign effect check:', {
      isInitialized,
      filteredInstancesLength: filteredInstances.length,
      studyInstanceUid: !!studyInstanceUid,
      seriesInstanceUid: !!seriesInstanceUid,
      currentLayoutSlots,
    })

    if (!isInitialized || !filteredInstances.length || !studyInstanceUid || !seriesInstanceUid) {
      if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] Auto-assign skipped - conditions not met')
      return
    }

    if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] Auto-assigning instances to slots...')

    setStoreLayout(layout)

    filteredInstances.slice(0, currentLayoutSlots).forEach((instance, index) => {
      const instanceSummary: WadoRsBulkDataInstanceSummary = {
        sopInstanceUid: instance.sopInstanceUid,
        studyInstanceUid: studyInstanceUid,
        seriesInstanceUid: seriesInstanceUid,
        numberOfFrames: instance.numberOfFrames || 1,
      }
      console.log(`[WadoRsViewerPage] Assigning to slot ${index}:`, instance.sopInstanceUid?.slice(0, 20) + '...')
      assignInstanceToSlot(index, instanceSummary)
    })

    if (DEBUG_PAGE) if (DEBUG_PAGE) console.log('[WadoRsViewerPage] Auto-assign completed')
  }, [isInitialized, filteredInstances, studyInstanceUid, seriesInstanceUid, currentLayoutSlots, assignInstanceToSlot, layout, setStoreLayout])

  // ==================== 핸들러 ====================

  const handleBack = () => {
    navigate(-1)
  }

  const handleThumbnailClick = useCallback((instanceIndex: number) => {
    const instance = filteredInstances[instanceIndex]
    if (!instance || !studyInstanceUid || !seriesInstanceUid) return

    const instanceSummary: WadoRsBulkDataInstanceSummary = {
      sopInstanceUid: instance.sopInstanceUid,
      studyInstanceUid: studyInstanceUid,
      seriesInstanceUid: seriesInstanceUid,
      numberOfFrames: instance.numberOfFrames || 1,
    }

    assignInstanceToSlot(selectedSlot, instanceSummary)
    setSelectedSlot((prev) => (prev + 1) % currentLayoutSlots)
  }, [filteredInstances, studyInstanceUid, seriesInstanceUid, selectedSlot, currentLayoutSlots, assignInstanceToSlot])

  const handleSlotClick = (slotId: number) => {
    setSelectedSlot(slotId)
  }

  const handleLayoutChange = (newLayout: WadoRsBulkDataGridLayout) => {
    setLayout(newLayout)
    setStoreLayout(newLayout)
    const newSlots = LAYOUT_OPTIONS.find((o) => o.value === newLayout)?.slots || 1

    if (filteredInstances.length && studyInstanceUid && seriesInstanceUid) {
      filteredInstances.slice(0, newSlots).forEach((instance, index) => {
        const instanceSummary: WadoRsBulkDataInstanceSummary = {
          sopInstanceUid: instance.sopInstanceUid,
          studyInstanceUid: studyInstanceUid,
          seriesInstanceUid: seriesInstanceUid,
          numberOfFrames: instance.numberOfFrames || 1,
        }
        assignInstanceToSlot(index, instanceSummary)
      })
    }
  }

  // ==================== 그리드 클래스 ====================

  const getGridClass = () => {
    switch (layout) {
      case '1x1':
        return 'grid-cols-1 grid-rows-1'
      case '2x2':
        return 'grid-cols-2 grid-rows-2'
      case '3x3':
        return 'grid-cols-3 grid-rows-3'
      case '4x4':
        return 'grid-cols-4 grid-rows-4'
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* ==================== Header ==================== */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">돌아가기</span>
          </button>

          <div>
            <h1 className="text-lg font-bold">
              {data?.series?.modality || 'Series'} Viewer
              <span className="ml-2 text-cyan-400 text-sm font-normal">(WADO-RS POC)</span>
            </h1>
            <p className="text-sm text-gray-400">
              {data?.series?.seriesDescription || seriesInstanceUid?.slice(0, 30) + '...'}
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}

          {!isInitialized && (
            <div className="flex items-center gap-2 text-cyan-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cornerstone 초기화 중...</span>
            </div>
          )}
        </div>

        {/* 그리드 레이아웃 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Layout:</span>
          <div className="flex gap-1">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleLayoutChange(opt.value)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  layout === opt.value
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ==================== Main Content ==================== */}
      <main className="flex-1 flex overflow-hidden">
        {/* 왼쪽: Viewer Grid Panel (70%) */}
        <div className="w-[70%] h-full bg-black border-r border-gray-700 p-1">
          {isInitialized ? (
            <div className={`w-full h-full grid gap-1 ${getGridClass()}`}>
              {Array.from({ length: currentLayoutSlots }, (_, i) => {
                const isSelected = selectedSlot === i

                return (
                  <div
                    key={i}
                    onClick={() => handleSlotClick(i)}
                    className={`relative bg-gray-900 rounded border-2 overflow-hidden cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-cyan-500'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {/* WADO-RS BulkData Slot */}
                    <WadoRsBulkDataSlot
                      slotId={i}
                      renderingEngineId={WADO_RS_BULKDATA_RENDERING_ENGINE_ID}
                    />

                    {/* 선택된 슬롯 표시 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-cyan-500 px-2 py-0.5 rounded text-xs text-white z-10">
                        선택됨
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Cornerstone 초기화 중...</p>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: Instance List Panel (30%) */}
        <div className="w-[30%] h-full bg-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            <h2 className="text-white font-medium mb-2">Instance 목록</h2>
            {/* 필터 버튼 */}
            <div className="flex gap-1">
              <button
                onClick={() => setInstanceFilter('playable')}
                className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                  instanceFilter === 'playable'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Film className="w-3 h-3 inline mr-1" />
                재생가능 ({playableCount})
              </button>
              <button
                onClick={() => setInstanceFilter('all')}
                className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                  instanceFilter === 'all'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Image className="w-3 h-3 inline mr-1" />
                전체 ({totalCount})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-red-400 text-sm p-2">
                데이터를 불러오는 중 오류가 발생했습니다.
              </div>
            ) : filteredInstances.length === 0 ? (
              <div className="text-gray-500 text-sm p-2 text-center">
                {instanceFilter === 'playable'
                  ? '재생 가능한 인스턴스가 없습니다'
                  : 'Instance가 없습니다.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredInstances.map((instance, index) => {
                  const isMultiframe = (instance.numberOfFrames || 1) > 1
                  const hasThumbnailError = thumbnailErrors[instance.sopInstanceUid]
                  return (
                    <div
                      key={instance.sopInstanceUid}
                      onClick={() => handleThumbnailClick(index)}
                      className="aspect-square bg-gray-700 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-cyan-500 transition-all relative"
                      title={`클릭하여 슬롯 ${selectedSlot + 1}에 할당`}
                    >
                      {hasThumbnailError ? (
                        <div className="w-full h-full flex items-center justify-center text-red-400">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                      ) : (
                        <img
                          src={getRenderedFrameUrl(
                            studyInstanceUid || '',
                            seriesInstanceUid || '',
                            instance.sopInstanceUid,
                            1
                          )}
                          alt={`Instance ${index + 1}`}
                          className="w-full h-full object-cover"
                          onLoad={() => markThumbnailLoaded(instance.sopInstanceUid)}
                          onError={() => {
                            setThumbnailErrors(prev => ({ ...prev, [instance.sopInstanceUid]: true }))
                            markThumbnailLoaded(instance.sopInstanceUid)
                          }}
                        />
                      )}
                      {/* 인덱스 배지 */}
                      <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs text-white">
                        #{index + 1}
                      </div>
                      {/* 멀티프레임 배지 */}
                      {isMultiframe && (
                        <div className="absolute bottom-1 right-1 bg-cyan-600/80 px-1.5 py-0.5 rounded text-xs text-white">
                          {instance.numberOfFrames}f
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ==================== Footer: Global Playback Controller ==================== */}
      <footer className="bg-gray-800 text-white p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 재생 컨트롤 */}
          <div className="flex items-center gap-4">
            {/* 전체 재생 */}
            <button
              onClick={playAll}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              <Play className="h-4 w-4" />
              <span className="text-sm font-medium">Play All</span>
            </button>

            {/* 전체 일시정지 */}
            <button
              onClick={pauseAll}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
            >
              <Pause className="h-4 w-4" />
              <span className="text-sm font-medium">Pause All</span>
            </button>

            {/* 전체 정지 */}
            <button
              onClick={stopAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              <Square className="h-4 w-4" />
              <span className="text-sm font-medium">Stop All</span>
            </button>

            {/* 구분선 */}
            <div className="h-8 w-px bg-gray-600" />

            {/* FPS 선택 */}
            <select
              value={globalFps}
              onChange={(e) => setGlobalFps(Number(e.target.value))}
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
            >
              <option value={15}>15 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>

          {/* 오른쪽: 배치 테스트 패널 */}
          <div className="flex items-center gap-4">
            <BatchSizeTestPanel />
            {/* WADO-RS 표시 */}
            <div className="text-cyan-400 text-sm">
              WADO-RS Mode
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
