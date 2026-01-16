/**
 * MjpegWadoRsViewerPage.tsx
 *
 * MJPEG + WADO-RS 하이브리드 뷰어 페이지
 *
 * 특징:
 * - 초기: MJPEG로 즉시 재생 시작 (~100ms)
 * - 백그라운드: WADO-RS Cornerstone 프리로딩
 * - 전환: 루프 경계에서 Cornerstone3D로 자연스러운 전환
 * - 최종: W/L 조정, 측정 도구 등 인터랙션 가능
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { initCornerstone } from '@/lib/cornerstone/initCornerstone'
import {
  HybridMultiViewer,
  HybridControls,
  HybridInstanceSidebar,
  useHybridMultiViewerStore,
} from '@/features/dicom-viewer-mjpeg-wado-rs'
import type { HybridInstanceSummary } from '@/features/dicom-viewer-mjpeg-wado-rs'
import { HYBRID_LAYOUT_CONFIG } from '@/features/dicom-viewer-mjpeg-wado-rs/types'

/**
 * DICOMweb 응답을 HybridInstanceSummary로 변환
 */
function adaptDicomWebToHybridInstance(
  dicomInstance: Record<string, unknown>,
  studyInstanceUid: string,
  seriesInstanceUid: string
): HybridInstanceSummary {
  // DICOM JSON에서 값 추출 헬퍼
  const getValue = <T,>(tag: string): T | undefined => {
    const element = dicomInstance[tag] as { Value?: T[] } | undefined
    return element?.Value?.[0]
  }

  const sopInstanceUid = getValue<string>('00080018') ?? ''
  const numberOfFrames = parseInt(getValue<string>('00280008') ?? '1', 10)
  const instanceNumber = getValue<number>('00200013')

  // Frame Rate 추출 (여러 태그에서 시도)
  let frameRate = 0
  const frameTime = getValue<number>('00181063') // Frame Time
  const recommendedDisplayFrameRate = getValue<number>('00082144') // Recommended Display Frame Rate
  const cineRate = getValue<number>('00180040') // Cine Rate

  if (recommendedDisplayFrameRate) {
    frameRate = recommendedDisplayFrameRate
  } else if (frameTime && frameTime > 0) {
    frameRate = Math.round(1000 / frameTime)
  } else if (cineRate) {
    frameRate = cineRate
  } else if (numberOfFrames > 1) {
    frameRate = 30 // 기본값
  }

  return {
    id: 0, // DICOMweb에서는 내부 ID가 없으므로 0
    sopInstanceUid,
    studyInstanceUid,
    seriesInstanceUid,
    numberOfFrames,
    frameRate,
    instanceNumber,
  }
}

export default function MjpegWadoRsViewerPage() {
  const navigate = useNavigate()
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()

  const [selectedSlot, setSelectedSlot] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const initRef = useRef(false)

  // Store 액션
  const {
    layout,
    assignInstanceToSlot,
    clearAllSlots,
  } = useHybridMultiViewerStore()

  // Cornerstone 초기화
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const init = async () => {
      try {
        await initCornerstone()
        setIsInitialized(true)
      } catch (error) {
        console.error('[MjpegWadoRsViewerPage] Cornerstone initialization failed:', error)
      }
    }
    init()
  }, [])

  // Instance 목록 조회 (DICOMweb QIDO-RS)
  const {
    data: instances = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['hybrid-instances', studyInstanceUid, seriesInstanceUid],
    queryFn: async () => {
      if (!studyInstanceUid || !seriesInstanceUid) {
        return []
      }

      const response = await api.get<Record<string, unknown>[]>(
        `/dicomweb/studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances`
      )

      return (response ?? []).map((item) =>
        adaptDicomWebToHybridInstance(item, studyInstanceUid, seriesInstanceUid)
      )
    },
    enabled: !!studyInstanceUid && !!seriesInstanceUid,
  })

  // Playable (멀티프레임) 인스턴스만 필터링
  const playableInstances = useMemo(
    () => instances.filter((inst) => inst.numberOfFrames > 1),
    [instances]
  )

  // 페이지 로드 시 자동으로 playable 인스턴스를 슬롯에 할당
  useEffect(() => {
    if (playableInstances.length === 0) return

    // 슬롯 초기화
    clearAllSlots()

    // 현재 레이아웃의 슬롯 수에 맞게 인스턴스 할당
    const slotCount = HYBRID_LAYOUT_CONFIG[layout].slots
    playableInstances.slice(0, slotCount).forEach((instance, index) => {
      assignInstanceToSlot(index, instance)
    })
  }, [playableInstances, layout, assignInstanceToSlot, clearAllSlots])

  const handleBack = useCallback(() => navigate(-1), [navigate])

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* ========== Header ========== */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
              MJPEG+WADO-RS
            </span>
            <h1 className="text-lg font-semibold text-white">Hybrid Cine Viewer</h1>
            <span className="text-xs text-purple-400">(Progressive Enhancement)</span>
          </div>

          {/* Series Info */}
          {studyInstanceUid && seriesInstanceUid && (
            <div className="ml-auto text-xs text-gray-400 font-mono">
              <span className="text-gray-500">Series: </span>
              {seriesInstanceUid.slice(0, 20)}...
            </div>
          )}
        </div>
      </header>

      {/* ========== Main Content ========== */}
      <main className="flex-1 flex overflow-hidden">
        {/* 왼쪽: Controls */}
        <div className="w-[280px] flex-shrink-0 border-r border-gray-700 overflow-y-auto">
          <HybridControls />
        </div>

        {/* 중앙: Viewer Grid */}
        <div className="flex-1 h-full bg-black">
          {!isInitialized || isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                <p>{!isInitialized ? 'Initializing Cornerstone...' : 'Loading instances...'}</p>
              </div>
            </div>
          ) : (
            <HybridMultiViewer />
          )}
        </div>

        {/* 오른쪽: Instance Sidebar */}
        <HybridInstanceSidebar
          instances={instances}
          isLoading={isLoading}
          error={error as Error | null}
          selectedSlot={selectedSlot}
          slotCount={HYBRID_LAYOUT_CONFIG[layout].slots}
          onThumbnailClick={() => {
            // 첫 번째 슬롯 선택 (WADO-RS와 동일)
            setSelectedSlot(0)
          }}
        />
      </main>
    </div>
  )
}
