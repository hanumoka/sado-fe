/**
 * MjpegInstanceSidebar Component
 *
 * MJPEG 뷰어용 Instance 목록 사이드바
 * WADO-RS InstanceSidebar와 유사한 스타일
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useMjpegMultiViewerStore, useActiveSlots } from '../stores/mjpegMultiViewerStore'
import type { MjpegInstanceSummary } from '../types'
import { LAYOUT_SLOT_COUNTS } from '../types'
import { Film, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react'

/**
 * InstanceListItem을 MjpegInstanceSummary로 변환
 */
function toInstanceSummary(instance: InstanceListItem): MjpegInstanceSummary {
  return {
    id: instance.id,
    sopInstanceUid: instance.sopInstanceUid,
    studyInstanceUid: instance.studyInstanceUid,
    seriesInstanceUid: instance.seriesInstanceUid,
    numberOfFrames: instance.numberOfFrames || 1,
    frameRate: instance.frameRate || 30,
    instanceNumber: instance.instanceNumber ?? undefined,
  }
}

interface InstanceListItem {
  id: number
  sopInstanceUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  numberOfFrames: number
  frameRate: number | null
  instanceNumber: number | null
  transcodingStatus: string
}

interface MjpegInstanceSidebarProps {
  className?: string
}

/**
 * MJPEG Instance 사이드바
 *
 * 특징:
 * - 멀티프레임 Instance만 표시
 * - TranscodingStatus === COMPLETED만 스트리밍 가능
 * - 클릭으로 선택된 슬롯에 할당
 * - 드래그앤드롭으로 슬롯에 할당
 */
export function MjpegInstanceSidebar({ className = '' }: MjpegInstanceSidebarProps) {
  const [instances, setInstances] = useState<InstanceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'playable' | 'all'>('playable')
  const autoFilledRef = useRef(false) // 자동 채우기 완료 여부

  const { assignInstanceToSlot, layout } = useMjpegMultiViewerStore()
  const activeSlots = useActiveSlots()

  // 현재 레이아웃의 슬롯 수 (클라이언트 사이드 캐싱으로 제한 없음)
  const maxSlots = LAYOUT_SLOT_COUNTS[layout]

  // 스트리밍 가능한 Instance 목록
  const streamableInstances = instances.filter(
    (i) => i.transcodingStatus === 'COMPLETED' && (i.numberOfFrames || 1) > 1
  )

  // Instance 목록 로드
  useEffect(() => {
    const fetchInstances = async () => {
      try {
        setLoading(true)
        // Instance 목록 조회 (프론트엔드에서 멀티프레임 필터링)
        const response = await fetch('/api/instances?page=0&size=100')
        if (!response.ok) throw new Error('Failed to fetch instances')
        const data = await response.json()
        setInstances(data.data?.content || data.content || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchInstances()
  }, [])

  // 초기 로드 시 자동으로 슬롯 채우기
  useEffect(() => {
    if (
      !loading &&
      !autoFilledRef.current &&
      streamableInstances.length > 0
    ) {
      autoFilledRef.current = true
      // 첫 N개의 스트리밍 가능한 Instance로 슬롯 채우기
      streamableInstances.slice(0, maxSlots).forEach((instance, index) => {
        assignInstanceToSlot(index, toInstanceSummary(instance))
      })
    }
  }, [loading, streamableInstances, maxSlots, assignInstanceToSlot])

  // Instance 클릭 시 해당 Instance부터 모든 활성 슬롯 채우기
  const handleInstanceClick = useCallback(
    (instance: InstanceListItem) => {
      // 클릭한 Instance의 인덱스 찾기
      const clickedIndex = streamableInstances.findIndex(
        (i) => i.id === instance.id
      )
      if (clickedIndex === -1) return

      // 클릭한 Instance부터 maxSlots 개수만큼 채우기
      for (let slotId = 0; slotId < maxSlots; slotId++) {
        const instanceIndex = clickedIndex + slotId
        if (instanceIndex < streamableInstances.length) {
          assignInstanceToSlot(slotId, toInstanceSummary(streamableInstances[instanceIndex]))
        }
      }
    },
    [streamableInstances, maxSlots, assignInstanceToSlot]
  )

  // 드래그 시작
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, instance: InstanceListItem) => {
      e.dataTransfer.setData('application/json', JSON.stringify(toInstanceSummary(instance)))
      e.dataTransfer.effectAllowed = 'copy'
    },
    []
  )

  // 필터링된 Instance 목록
  const filteredInstances = filter === 'playable' ? streamableInstances : instances

  return (
    <aside className={`bg-gray-800 flex flex-col ${className}`}>
      {/* 헤더: 필터 + 통계 */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Instances</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('playable')}
              className={`px-2 py-1 text-xs rounded-l-md transition-colors ${
                filter === 'playable'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title="Show streamable only (multiframe + transcoded)"
            >
              <Film className="h-3 w-3" />
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 text-xs rounded-r-md transition-colors ${
                filter === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title="Show all instances"
            >
              <ImageIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {filteredInstances.length} / {instances.length} instances
          </span>
          <span className="text-green-400">
            {streamableInstances.length} streamable
          </span>
        </div>

        {/* 동작 설명 */}
        <div className="mt-2 text-xs text-gray-400">
          Click to fill all {maxSlots} slots from selected instance
        </div>

        {/* 슬롯 상태 표시 */}
        <div className="flex gap-1 mt-2">
          {Array.from({ length: maxSlots }, (_, i) => (
            <div
              key={i}
              className={`flex-1 py-1 text-xs rounded text-center ${
                activeSlots[i]?.instance
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
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
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* 인스턴스 리스트 */}
      {!loading && !error && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredInstances.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No instances found</p>
              {filter === 'playable' && (
                <p className="text-xs mt-1">
                  Try showing all instances
                </p>
              )}
            </div>
          ) : (
            filteredInstances.map((instance) => {
              const isStreamable =
                instance.transcodingStatus === 'COMPLETED' &&
                (instance.numberOfFrames || 1) > 1
              const isMultiframe = (instance.numberOfFrames || 1) > 1

              return (
                <button
                  key={instance.id}
                  onClick={() => isStreamable && handleInstanceClick(instance)}
                  draggable={isStreamable}
                  onDragStart={(e) => isStreamable && handleDragStart(e, instance)}
                  disabled={!isStreamable}
                  className={`w-full p-2 rounded-lg border transition-all text-left ${
                    isStreamable
                      ? 'border-green-600/50 bg-gray-900/50 hover:border-green-500 cursor-pointer'
                      : 'border-gray-700 bg-gray-900/30 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* 썸네일 placeholder */}
                    <div className="w-16 h-16 bg-black rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {isMultiframe ? (
                        <Film className="h-6 w-6 text-green-500" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-500" />
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">
                          #{instance.instanceNumber || '?'}
                        </span>
                        {isMultiframe && (
                          <span className="text-xs text-green-400">
                            <Film className="h-3 w-3 inline" />{' '}
                            {instance.numberOfFrames}f
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {instance.sopInstanceUid.slice(-12)}...
                      </p>
                      {/* Transcoding Status */}
                      <p className={`text-xs mt-0.5 ${
                        instance.transcodingStatus === 'COMPLETED'
                          ? 'text-green-400'
                          : instance.transcodingStatus === 'PENDING'
                            ? 'text-yellow-400'
                            : 'text-gray-500'
                      }`}>
                        {instance.transcodingStatus || 'N/A'}
                      </p>
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
