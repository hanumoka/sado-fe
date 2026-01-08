/**
 * InstanceSidebar - 인스턴스 목록 사이드바
 *
 * 드래그 앤 드롭으로 슬롯에 인스턴스를 할당할 수 있는 목록
 * 필터: 전체 / 재생가능 (멀티프레임)
 */
import { useState, useEffect, useMemo } from 'react'
import { Loader2, Film, Image, RefreshCw } from 'lucide-react'
import {
  searchStudies,
  searchSeries,
  searchInstances,
  type DicomInstance,
} from '@/lib/services/dicomWebService'
import type { InstanceSummary } from '../types/multiSlotViewer'

type FilterType = 'all' | 'playable'

interface InstanceSidebarProps {
  className?: string
}

export function InstanceSidebar({ className = '' }: InstanceSidebarProps) {
  const [instances, setInstances] = useState<DicomInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('playable')

  // 인스턴스 목록 조회
  const fetchInstances = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. 모든 Study 조회
      const studies = await searchStudies({ limit: 100 })

      // 2. 각 Study의 Series 조회 후 Instance 조회
      const allInstances: DicomInstance[] = []

      for (const study of studies) {
        const seriesList = await searchSeries(study.studyInstanceUid)

        for (const series of seriesList) {
          const instanceList = await searchInstances(
            study.studyInstanceUid,
            series.seriesInstanceUid
          )
          allInstances.push(...instanceList)
        }
      }

      setInstances(allInstances)
    } catch (err) {
      console.error('[InstanceSidebar] Failed to fetch instances:', err)
      setError(err instanceof Error ? err.message : 'Failed to load instances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstances()
  }, [])

  // 필터링된 인스턴스 목록
  const filteredInstances = useMemo(() => {
    if (filter === 'playable') {
      return instances.filter((inst) => (inst.numberOfFrames ?? 1) > 1)
    }
    return instances
  }, [instances, filter])

  // 드래그 시작 핸들러
  const handleDragStart = (e: React.DragEvent, instance: DicomInstance) => {
    const data: InstanceSummary = {
      sopInstanceUid: instance.sopInstanceUid,
      studyInstanceUid: instance.studyInstanceUid,
      seriesInstanceUid: instance.seriesInstanceUid,
      numberOfFrames: instance.numberOfFrames ?? 1,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // 통계
  const totalCount = instances.length
  const playableCount = instances.filter((inst) => (inst.numberOfFrames ?? 1) > 1).length

  return (
    <div className={`bg-gray-800 flex flex-col h-full ${className}`}>
      {/* 헤더 */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Instances</h2>
          <button
            onClick={fetchInstances}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 필터 버튼 */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('playable')}
            className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
              filter === 'playable'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Film className="w-3.5 h-3.5 inline mr-1.5" />
            재생가능 ({playableCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Image className="w-3.5 h-3.5 inline mr-1.5" />
            전체 ({totalCount})
          </button>
        </div>
      </div>

      {/* 인스턴스 목록 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm p-3 bg-red-900/30 rounded">
            {error}
          </div>
        )}

        {!loading && !error && filteredInstances.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-8">
            {filter === 'playable'
              ? '재생 가능한 인스턴스가 없습니다'
              : '인스턴스가 없습니다'}
          </div>
        )}

        {!loading &&
          filteredInstances.map((instance) => (
            <div
              key={instance.sopInstanceUid}
              draggable
              onDragStart={(e) => handleDragStart(e, instance)}
              className="bg-gray-700 hover:bg-gray-600 rounded p-2 cursor-grab active:cursor-grabbing transition-colors"
            >
              <div className="flex items-center gap-2">
                {(instance.numberOfFrames ?? 1) > 1 ? (
                  <Film className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <Image className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-mono truncate">
                    {instance.sopInstanceUid.slice(-12)}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {(instance.numberOfFrames ?? 1) > 1 ? (
                      <span className="text-green-400">
                        {instance.numberOfFrames} frames
                      </span>
                    ) : (
                      <span>1 frame</span>
                    )}
                    {instance.rows && instance.columns && (
                      <span className="ml-2">
                        {instance.rows}x{instance.columns}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* 하단 안내 */}
      <div className="p-2 border-t border-gray-700">
        <p className="text-gray-500 text-xs text-center">
          Drag to slot to assign
        </p>
      </div>
    </div>
  )
}
