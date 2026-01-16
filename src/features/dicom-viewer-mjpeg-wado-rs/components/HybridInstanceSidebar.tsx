/**
 * HybridInstanceSidebar Component
 *
 * 하이브리드 뷰어용 인스턴스 사이드바
 * Series 내 Instance 목록 표시 및 드래그 앤 드롭 지원
 */

import { useState, useCallback, useMemo } from 'react'
import { AlertCircle, Film, Image, Loader2, Archive } from 'lucide-react'
import { useHybridMultiViewerStore } from '../stores/hybridMultiViewerStore'
import type { HybridInstanceSummary } from '../types'

interface HybridInstanceSidebarProps {
  /** Instance 목록 */
  instances: HybridInstanceSummary[]
  /** 로딩 중 여부 */
  isLoading: boolean
  /** 에러 */
  error: Error | null
  /** 선택된 슬롯 ID */
  selectedSlot: number
  /** 현재 레이아웃의 슬롯 개수 */
  slotCount: number
  /** 썸네일 클릭 시 콜백 */
  onThumbnailClick?: (index: number) => void
}

type InstanceFilter = 'all' | 'playable'

/**
 * Transfer Syntax UID를 사람이 읽기 쉬운 라벨로 변환
 */
function getTransferSyntaxLabel(uid?: string): { label: string; isCompressed: boolean } {
  if (!uid) return { label: '', isCompressed: false }

  const syntaxMap: Record<string, { label: string; isCompressed: boolean }> = {
    '1.2.840.10008.1.2': { label: 'Implicit VR', isCompressed: false },
    '1.2.840.10008.1.2.1': { label: 'Explicit VR', isCompressed: false },
    '1.2.840.10008.1.2.2': { label: 'Explicit VR BE', isCompressed: false },
    '1.2.840.10008.1.2.4.50': { label: 'JPEG Baseline', isCompressed: true },
    '1.2.840.10008.1.2.4.51': { label: 'JPEG Extended', isCompressed: true },
    '1.2.840.10008.1.2.4.70': { label: 'JPEG Lossless', isCompressed: true },
    '1.2.840.10008.1.2.4.80': { label: 'JPEG-LS', isCompressed: true },
    '1.2.840.10008.1.2.4.81': { label: 'JPEG-LS Lossy', isCompressed: true },
    '1.2.840.10008.1.2.4.90': { label: 'JPEG 2000 LL', isCompressed: true },
    '1.2.840.10008.1.2.4.91': { label: 'JPEG 2000', isCompressed: true },
    '1.2.840.10008.1.2.5': { label: 'RLE', isCompressed: true },
  }

  return syntaxMap[uid] || { label: uid.slice(-8), isCompressed: false }
}

/**
 * 썸네일 URL 생성 (WADO-RS Rendered API 사용)
 */
function getThumbnailUrl(instance: HybridInstanceSummary): string {
  const { studyInstanceUid, seriesInstanceUid, sopInstanceUid } = instance
  return `/dicomweb/studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances/${sopInstanceUid}/rendered`
}

/**
 * 하이브리드 뷰어용 인스턴스 사이드바
 */
export function HybridInstanceSidebar({
  instances,
  isLoading,
  error,
  selectedSlot,
  slotCount,
  onThumbnailClick,
}: HybridInstanceSidebarProps) {
  const [instanceFilter, setInstanceFilter] = useState<InstanceFilter>('playable')
  const assignInstanceToSlot = useHybridMultiViewerStore((state) => state.assignInstanceToSlot)

  // 필터링된 인스턴스
  const filteredInstances = useMemo(() => {
    if (instanceFilter === 'playable') {
      return instances.filter((inst) => inst.numberOfFrames > 1)
    }
    return instances
  }, [instances, instanceFilter])

  // 통계
  const playableCount = useMemo(
    () => instances.filter((inst) => inst.numberOfFrames > 1).length,
    [instances]
  )

  // 드래그 시작 핸들러
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, instance: HybridInstanceSummary) => {
      e.dataTransfer.setData('application/json', JSON.stringify(instance))
      e.dataTransfer.effectAllowed = 'copy'
    },
    []
  )

  // 썸네일 클릭 핸들러 (WADO-RS 뷰어와 동일: 클릭한 인스턴스부터 모든 슬롯에 순차 할당)
  const handleThumbnailClick = useCallback(
    (index: number) => {
      for (let slotId = 0; slotId < slotCount; slotId++) {
        const targetIndex = index + slotId
        const instance = filteredInstances[targetIndex]

        if (instance) {
          assignInstanceToSlot(slotId, instance)
        }
      }

      // 첫 번째 슬롯 선택 (WADO-RS와 동일)
      onThumbnailClick?.(0)
    },
    [filteredInstances, slotCount, assignInstanceToSlot, onThumbnailClick]
  )

  return (
    <aside className="w-[280px] bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* 헤더: 필터 + 통계 */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Instances</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setInstanceFilter('playable')}
              className={`px-2 py-1 text-xs rounded-l-md transition-colors ${
                instanceFilter === 'playable'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title="Show playable only (multiframe)"
            >
              <Film className="h-3 w-3" />
            </button>
            <button
              onClick={() => setInstanceFilter('all')}
              className={`px-2 py-1 text-xs rounded-r-md transition-colors ${
                instanceFilter === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title="Show all instances"
            >
              <Image className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {filteredInstances.length} / {instances.length} instances
          </span>
          <span className="text-purple-400">{playableCount} playable</span>
        </div>

        {/* 클릭 안내 */}
        <div className="mt-2 text-xs text-gray-400">
          Click to{' '}
          <span className="text-purple-400 font-medium">fill all {slotCount} slots</span>
          <span className="text-gray-500 ml-1">(or drag to any slot)</span>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading instances...</p>
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-red-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      )}

      {/* 썸네일 리스트 */}
      {!isLoading && !error && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredInstances.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No instances found</p>
              {instanceFilter === 'playable' && (
                <p className="text-xs mt-1">Try showing all instances</p>
              )}
            </div>
          ) : (
            filteredInstances.map((instance, index) => {
              const isMultiframe = instance.numberOfFrames > 1
              const thumbnailUrl = getThumbnailUrl(instance)

              return (
                <button
                  key={instance.sopInstanceUid}
                  onClick={() => handleThumbnailClick(index)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, instance)}
                  className={`w-full p-2 rounded-lg border transition-all hover:border-gray-500 ${
                    isMultiframe
                      ? 'border-purple-500/50 bg-gray-900/50'
                      : 'border-gray-700 bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* 썸네일 이미지 */}
                    <div className="w-16 h-16 bg-black rounded overflow-hidden flex-shrink-0">
                      <img
                        src={thumbnailUrl}
                        alt={`Instance ${instance.instanceNumber || index + 1}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">
                          #{instance.instanceNumber || index + 1}
                        </span>
                        {isMultiframe && (
                          <span className="text-xs text-purple-400">
                            <Film className="h-3 w-3 inline" /> {instance.numberOfFrames}f
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {instance.sopInstanceUid.slice(-12)}...
                      </p>
                      {/* Frame Rate 표시 */}
                      {instance.frameRate > 0 && (
                        <p className="text-xs text-green-400 mt-0.5">
                          {instance.frameRate} fps
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </aside>
  )
}
