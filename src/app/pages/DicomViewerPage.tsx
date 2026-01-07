import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Loader2, AlertCircle } from 'lucide-react'
import { useInstances } from '@/features/dicom-viewer/hooks/useInstances'
import { getRenderedFrameUrl } from '@/lib/services/dicomWebService'

interface SlotState {
  isPlaying: boolean
  currentFrame: number
  imageError?: boolean
}

type GridLayout = '1x1' | '2x2' | '3x3' | '4x4'

const LAYOUT_OPTIONS: { value: GridLayout; label: string; slots: number }[] = [
  { value: '1x1', label: '1×1', slots: 1 },
  { value: '2x2', label: '2×2', slots: 4 },
  { value: '3x3', label: '3×3', slots: 9 },
  { value: '4x4', label: '4×4', slots: 16 },
]

/**
 * DicomViewerPage - Series Viewer 레이아웃
 *
 * 레이아웃 구조:
 * - Header: 뒤로가기 + Series 정보 + 그리드 선택
 * - Main: 왼쪽(Viewer Grid 70%) + 오른쪽(Instance 목록 30%)
 * - Footer: Global Playback Controller
 */
export default function DicomViewerPage() {
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()
  const navigate = useNavigate()
  const [layout, setLayout] = useState<GridLayout>('2x2')

  // WADO-RS로 Instance 목록 조회
  const { data, isLoading, error } = useInstances(
    studyInstanceUid || '',
    seriesInstanceUid || ''
  )

  // 슬롯별 상태 (재생 여부 + 현재 프레임)
  const [slotStates, setSlotStates] = useState<Record<number, SlotState>>({})
  // FPS 설정
  const [fps, setFps] = useState(30)
  // 슬롯 할당: 슬롯 인덱스 → Instance 인덱스 (null이면 기본값 사용)
  const [slotAssignments, setSlotAssignments] = useState<Record<number, number | null>>({})
  // 현재 선택된 슬롯 (썸네일 클릭 시 이 슬롯에 할당)
  const [selectedSlot, setSelectedSlot] = useState<number>(0)
  // 썸네일 이미지 에러 상태
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({})

  const handleBack = () => {
    navigate(-1)
  }

  // 슬롯 재생/일시정지 토글
  const toggleSlotPlay = (slotId: number) => {
    setSlotStates((prev) => {
      const current = prev[slotId] || { isPlaying: false, currentFrame: 1 }
      return {
        ...prev,
        [slotId]: {
          ...current,
          isPlaying: !current.isPlaying,
        },
      }
    })
  }

  // 전체 재생
  const playAll = () => {
    const slots = LAYOUT_OPTIONS.find((o) => o.value === layout)?.slots || 1
    setSlotStates((prev) => {
      const newState = { ...prev }
      for (let i = 0; i < slots; i++) {
        const instance = getSlotInstance(i)
        const isMultiframe = (instance?.numberOfFrames || 1) > 1
        if (instance && isMultiframe) {
          newState[i] = {
            isPlaying: true,
            currentFrame: prev[i]?.currentFrame || 1,
          }
        }
      }
      return newState
    })
  }

  // 전체 일시정지
  const pauseAll = () => {
    setSlotStates((prev) => {
      const newState = { ...prev }
      Object.keys(newState).forEach((key) => {
        newState[Number(key)] = {
          ...newState[Number(key)],
          isPlaying: false,
        }
      })
      return newState
    })
  }

  // 슬롯 이미지 에러 핸들러
  const handleSlotImageError = (slotId: number) => {
    setSlotStates((prev) => ({
      ...prev,
      [slotId]: {
        ...(prev[slotId] || { isPlaying: false, currentFrame: 1 }),
        imageError: true,
      },
    }))
  }

  // 슬롯 이미지 로드 성공 핸들러 (에러 상태 초기화)
  const handleSlotImageLoad = (slotId: number) => {
    setSlotStates((prev) => {
      if (prev[slotId]?.imageError) {
        return {
          ...prev,
          [slotId]: {
            ...prev[slotId],
            imageError: false,
          },
        }
      }
      return prev
    })
  }

  // 썸네일 클릭 → 선택된 슬롯에 할당
  const handleThumbnailClick = (instanceIndex: number) => {
    setSlotAssignments((prev) => ({
      ...prev,
      [selectedSlot]: instanceIndex,
    }))
    // 에러 상태 초기화
    setSlotStates((prev) => ({
      ...prev,
      [selectedSlot]: {
        isPlaying: false,
        currentFrame: 1,
        imageError: false,
      },
    }))
    // 다음 슬롯 선택 (순환)
    setSelectedSlot((prev) => (prev + 1) % currentLayoutSlots)
  }

  // 슬롯 클릭 → 해당 슬롯 선택
  const handleSlotClick = (slotId: number) => {
    setSelectedSlot(slotId)
  }

  // 슬롯에 할당된 Instance 가져오기
  const getSlotInstance = (slotId: number) => {
    const assignedIndex = slotAssignments[slotId]
    if (assignedIndex !== undefined && assignedIndex !== null) {
      return instances[assignedIndex]
    }
    // 기본값: 슬롯 인덱스와 동일한 Instance
    return instances[slotId]
  }

  const currentLayoutSlots = LAYOUT_OPTIONS.find((o) => o.value === layout)?.slots || 1
  const instances = data?.instances || []

  // 멀티프레임 재생 로직
  useEffect(() => {
    const playingSlots = Object.entries(slotStates).filter(
      ([_, state]) => state.isPlaying
    )

    if (playingSlots.length === 0) return

    const interval = setInterval(() => {
      setSlotStates((prev) => {
        const updated = { ...prev }
        playingSlots.forEach(([slotIdStr]) => {
          const slotId = Number(slotIdStr)
          const instance = getSlotInstance(slotId)
          const totalFrames = instance?.numberOfFrames || 1
          const current = updated[slotId]?.currentFrame || 1
          const nextFrame = current >= totalFrames ? 1 : current + 1
          updated[slotId] = {
            ...updated[slotId],
            currentFrame: nextFrame,
          }
        })
        return updated
      })
    }, 1000 / fps)

    return () => clearInterval(interval)
  }, [slotStates, fps, instances, slotAssignments])

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
        </div>

        {/* 그리드 레이아웃 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Layout:</span>
          <div className="flex gap-1">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLayout(opt.value)}
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
          <div
            className={`w-full h-full grid gap-1 ${
              layout === '1x1'
                ? 'grid-cols-1 grid-rows-1'
                : layout === '2x2'
                  ? 'grid-cols-2 grid-rows-2'
                  : layout === '3x3'
                    ? 'grid-cols-3 grid-rows-3'
                    : 'grid-cols-4 grid-rows-4'
            }`}
          >
            {Array.from({ length: currentLayoutSlots }, (_, i) => {
              const instance = getSlotInstance(i)
              const slotState = slotStates[i] || { isPlaying: false, currentFrame: 1 }
              const isPlaying = slotState.isPlaying
              const currentFrame = slotState.currentFrame
              const hasError = slotState.imageError
              const isMultiframe = (instance?.numberOfFrames || 1) > 1
              const isSelected = selectedSlot === i

              return (
                <div
                  key={i}
                  onClick={() => handleSlotClick(i)}
                  className={`bg-gray-900 rounded border-2 flex flex-col overflow-hidden cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {/* Viewer 영역 */}
                  <div className="flex-1 flex items-center justify-center relative bg-black">
                    {instance ? (
                      hasError ? (
                        // 에러 폴백 UI
                        <div className="text-center text-red-400">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs">이미지 로드 실패</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {instance.sopInstanceUid?.slice(0, 16)}...
                          </p>
                        </div>
                      ) : (
                        <>
                          <img
                            src={getRenderedFrameUrl(
                              studyInstanceUid || '',
                              seriesInstanceUid || '',
                              instance.sopInstanceUid,
                              currentFrame
                            )}
                            alt={`Instance ${i + 1}, Frame ${currentFrame}`}
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                            onError={() => handleSlotImageError(i)}
                            onLoad={() => handleSlotImageLoad(i)}
                          />
                          {/* 프레임 정보 오버레이 */}
                          {isMultiframe && (
                            <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                              Frame {currentFrame} / {instance.numberOfFrames}
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      <div className="text-center text-gray-600">
                        <div className="text-2xl mb-1">+</div>
                        <p className="text-xs">Empty Slot {i + 1}</p>
                      </div>
                    )}
                    {/* 선택된 슬롯 표시 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-blue-500 px-2 py-0.5 rounded text-xs text-white">
                        선택됨
                      </div>
                    )}
                  </div>

                  {/* 슬롯 개별 컨트롤 */}
                  <div className="bg-gray-800 px-2 py-1.5 flex items-center justify-between border-t border-gray-700">
                    <button
                      onClick={() => toggleSlotPlay(i)}
                      disabled={!instance || !isMultiframe}
                      className={`p-1.5 rounded transition-colors ${
                        !instance || !isMultiframe
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : isPlaying
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </button>

                    <span className="text-xs text-gray-400">
                      {instance && isMultiframe
                        ? `${currentFrame} / ${instance.numberOfFrames}`
                        : '-'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: Instance List Panel (30%) */}
        <div className="w-[30%] h-full bg-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            <h2 className="text-white font-medium">Instance 목록</h2>
            <p className="text-gray-400 text-sm">{instances.length} images</p>
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
            ) : instances.length === 0 ? (
              <div className="text-gray-500 text-sm p-2 text-center">
                Instance가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {instances.map((instance, index) => {
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
                          loading="lazy"
                          onError={() => setThumbnailErrors(prev => ({ ...prev, [instance.sopInstanceUid]: true }))}
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
        <div className="flex items-center justify-center gap-6">
          {/* 전체 재생 */}
          <button
            onClick={playAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
          >
            <Play className="h-4 w-4" />
            <span className="text-sm font-medium">Play All</span>
          </button>

          {/* 전체 중지 */}
          <button
            onClick={pauseAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            <Pause className="h-4 w-4" />
            <span className="text-sm font-medium">Pause All</span>
          </button>

          {/* 구분선 */}
          <div className="h-8 w-px bg-gray-600" />

          {/* FPS 선택 */}
          <select
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
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
