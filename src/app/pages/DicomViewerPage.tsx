/**
 * DicomViewerPage - Cornerstone 기반 Series Viewer
 *
 * 레이아웃 구조:
 * - Header: 뒤로가기 + Series 정보 + 그리드 선택
 * - Main: 왼쪽(Viewer Grid 70%) + 오른쪽(Instance 목록 30%)
 * - Footer: Global Playback Controller
 *
 * Cornerstone.js 기반 WADO-RS Rendered API 사용
 * 프리로딩 + requestAnimationFrame cine 재생
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Square, Loader2, AlertCircle, Film, Image } from 'lucide-react'
import { RenderingEngine } from '@cornerstonejs/core'
import { useInstances } from '@/features/dicom-viewer/hooks/useInstances'
import { useCornerstoneMultiViewerStore } from '@/features/dicom-viewer/stores'
import { CornerstoneSlot } from '@/features/dicom-viewer/components'
import { initCornerstone, isInitialized as isCornerstoneInitialized } from '@/lib/cornerstone/initCornerstone'
import { getRenderedFrameUrl } from '@/lib/services/dicomWebService'
import type { InstanceSummary } from '@/features/dicom-viewer/types/multiSlotViewer'

type GridLayout = '1x1' | '2x2' | '3x3' | '4x4'
type InstanceFilter = 'all' | 'playable'

const LAYOUT_OPTIONS: { value: GridLayout; label: string; slots: number }[] = [
  { value: '1x1', label: '1×1', slots: 1 },
  { value: '2x2', label: '2×2', slots: 4 },
  { value: '3x3', label: '3×3', slots: 9 },
  { value: '4x4', label: '4×4', slots: 16 },
]

const RENDERING_ENGINE_ID = 'dicomViewerPageEngine'

export default function DicomViewerPage() {
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()
  const navigate = useNavigate()
  const [layout, setLayout] = useState<GridLayout>('1x1')
  const [isInitialized, setIsInitialized] = useState(false)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)

  // 현재 선택된 슬롯 (썸네일 클릭 시 이 슬롯에 할당)
  const [selectedSlot, setSelectedSlot] = useState<number>(0)
  // 썸네일 이미지 에러 상태
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({})
  // 인스턴스 필터 (기본: 재생가능)
  const [instanceFilter, setInstanceFilter] = useState<InstanceFilter>('playable')

  // WADO-RS로 Instance 목록 조회
  const { data, isLoading, error } = useInstances(
    studyInstanceUid || '',
    seriesInstanceUid || ''
  )

  // DEBUG: useInstances 상태 로깅
  console.log('[DicomViewerPage] useInstances state:', {
    isLoading,
    error: error?.message,
    instancesCount: data?.instances?.length,
    hasData: !!data,
  })

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
    // 썸네일 로딩 추적
    setTotalThumbnailCount,
    markThumbnailLoaded,
    resetThumbnailTracking,
  } = useCornerstoneMultiViewerStore()

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
  // 필터링된 인스턴스 개수가 변경되면 썸네일 총 개수 설정
  useEffect(() => {
    if (filteredInstances.length > 0) {
      setTotalThumbnailCount(filteredInstances.length)
    }
  }, [filteredInstances.length, setTotalThumbnailCount])

  // 페이지 언마운트 시 썸네일 추적 리셋
  useEffect(() => {
    return () => {
      resetThumbnailTracking()
    }
  }, [resetThumbnailTracking])

  // ==================== Cornerstone 초기화 ====================
  // React StrictMode에서 useEffect가 두 번 실행되는 문제 대응
  // mounted 플래그 대신 initCornerstone의 전역 상태(isInitialized)를 사용하여 race condition 방지

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[DicomViewerPage] Starting Cornerstone initialization...')
        await initCornerstone()

        // initCornerstone이 완료되면 전역 initialized = true
        // 이 시점에서 Cornerstone은 확실히 초기화됨
        console.log('[DicomViewerPage] initCornerstone completed, isCornerstoneInitialized:', isCornerstoneInitialized())

        // RenderingEngine이 이미 있으면 재사용 (StrictMode 대응)
        if (renderingEngineRef.current) {
          console.log('[DicomViewerPage] RenderingEngine already exists, reusing')
          setIsInitialized(true)
          return
        }

        // RenderingEngine 생성
        renderingEngineRef.current = new RenderingEngine(RENDERING_ENGINE_ID)
        setIsInitialized(true)
        console.log('[DicomViewerPage] ✅ Cornerstone and RenderingEngine initialized')
      } catch (error) {
        console.error('[DicomViewerPage] ❌ Cornerstone initialization failed:', error)
      }
    }

    init()
  }, [])

  // 별도 클린업 effect - 컴포넌트가 완전히 unmount될 때만 실행
  useEffect(() => {
    return () => {
      console.log('[DicomViewerPage] Component unmounting - destroying RenderingEngine')
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.destroy()
        } catch (e) {
          console.warn('[DicomViewerPage] Error destroying RenderingEngine:', e)
        }
        renderingEngineRef.current = null
      }
      clearAllSlots()
    }
  }, [clearAllSlots])

  // ==================== 인스턴스 목록 로드 시 자동 슬롯 할당 ====================

  useEffect(() => {
    // DEBUG: 자동 할당 조건 확인
    console.log('[DicomViewerPage] Auto-assign effect check:', {
      isInitialized,
      filteredInstancesLength: filteredInstances.length,
      studyInstanceUid: !!studyInstanceUid,
      seriesInstanceUid: !!seriesInstanceUid,
      currentLayoutSlots,
    })

    if (!isInitialized || !filteredInstances.length || !studyInstanceUid || !seriesInstanceUid) {
      console.log('[DicomViewerPage] Auto-assign skipped - conditions not met')
      return
    }

    console.log('[DicomViewerPage] Auto-assigning instances to slots...')

    // Store layout 동기화 (assignInstanceToSlot의 maxSlots 검사를 위해 필요)
    setStoreLayout(layout)

    // 필터링된 인스턴스 목록에서 첫 N개를 슬롯에 자동 할당
    filteredInstances.slice(0, currentLayoutSlots).forEach((instance, index) => {
      const instanceSummary: InstanceSummary = {
        sopInstanceUid: instance.sopInstanceUid,
        studyInstanceUid: studyInstanceUid,
        seriesInstanceUid: seriesInstanceUid,
        numberOfFrames: instance.numberOfFrames || 1,
      }
      console.log(`[DicomViewerPage] Assigning to slot ${index}:`, instance.sopInstanceUid?.slice(0, 20) + '...')
      assignInstanceToSlot(index, instanceSummary)
    })

    console.log('[DicomViewerPage] Auto-assign completed')
  }, [isInitialized, filteredInstances, studyInstanceUid, seriesInstanceUid, currentLayoutSlots, assignInstanceToSlot, layout, setStoreLayout])

  // ==================== 핸들러 ====================

  const handleBack = () => {
    navigate(-1)
  }

  // 썸네일 클릭 → 선택된 슬롯에 할당
  const handleThumbnailClick = useCallback((instanceIndex: number) => {
    const instance = filteredInstances[instanceIndex]
    if (!instance || !studyInstanceUid || !seriesInstanceUid) return

    const instanceSummary: InstanceSummary = {
      sopInstanceUid: instance.sopInstanceUid,
      studyInstanceUid: studyInstanceUid,
      seriesInstanceUid: seriesInstanceUid,
      numberOfFrames: instance.numberOfFrames || 1,
    }

    assignInstanceToSlot(selectedSlot, instanceSummary)

    // 다음 슬롯 선택 (순환)
    setSelectedSlot((prev) => (prev + 1) % currentLayoutSlots)
  }, [filteredInstances, studyInstanceUid, seriesInstanceUid, selectedSlot, currentLayoutSlots, assignInstanceToSlot])

  // 슬롯 클릭 → 해당 슬롯 선택
  const handleSlotClick = (slotId: number) => {
    setSelectedSlot(slotId)
  }

  // 레이아웃 변경 시 슬롯 재할당
  const handleLayoutChange = (newLayout: GridLayout) => {
    setLayout(newLayout)
    setStoreLayout(newLayout) // Store layout도 업데이트 (assignInstanceToSlot의 maxSlots 검사에 필요)
    const newSlots = LAYOUT_OPTIONS.find((o) => o.value === newLayout)?.slots || 1

    // 새 레이아웃에 맞게 필터링된 인스턴스 재할당
    if (filteredInstances.length && studyInstanceUid && seriesInstanceUid) {
      filteredInstances.slice(0, newSlots).forEach((instance, index) => {
        const instanceSummary: InstanceSummary = {
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
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">
                {data?.series?.modality || 'Series'} Viewer
              </h1>
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                WADO-RS Rendered
              </span>
            </div>
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
            <div className="flex items-center gap-2 text-yellow-400">
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
                    ? 'bg-blue-600 text-white'
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
                        ? 'border-blue-500'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {/* Cornerstone Slot */}
                    <CornerstoneSlot
                      slotId={i}
                      renderingEngineId={RENDERING_ENGINE_ID}
                    />

                    {/* 선택된 슬롯 표시 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-blue-500 px-2 py-0.5 rounded text-xs text-white z-10">
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
                    ? 'bg-blue-600 text-white'
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
                    ? 'bg-blue-600 text-white'
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
                      className="aspect-square bg-gray-700 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all relative"
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
                            markThumbnailLoaded(instance.sopInstanceUid) // 에러도 "완료"로 처리
                          }}
                        />
                      )}
                      {/* 인덱스 배지 */}
                      <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs text-white">
                        #{index + 1}
                      </div>
                      {/* 멀티프레임 배지 */}
                      {isMultiframe && (
                        <div className="absolute bottom-1 right-1 bg-blue-600/80 px-1.5 py-0.5 rounded text-xs text-white">
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
        <div className="flex items-center justify-center gap-4">
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
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
          >
            <Pause className="h-4 w-4" />
            <span className="text-sm font-medium">Pause All</span>
          </button>

          {/* 전체 정지 (처음으로 이동) */}
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
      </footer>
    </div>
  )
}
