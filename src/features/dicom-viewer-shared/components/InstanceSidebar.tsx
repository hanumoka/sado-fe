/**
 * InstanceSidebar - 공유 인스턴스 사이드바 컴포넌트
 *
 * 모든 DICOM 뷰어에서 공통으로 사용하는 썸네일 목록 UI
 * - 필터 (All / Playable)
 * - 썸네일 리스트
 * - 드래그 앤 드롭 지원
 * - 통계 표시
 */
import { AlertCircle, Film, Image, Loader2 } from 'lucide-react'
import type {
  BaseInstanceInfo,
  InstanceSidebarProps,
} from '../types/viewerTypes'
import { VIEWER_THEMES } from '../types/viewerTypes'

export function InstanceSidebar<T extends BaseInstanceInfo>({
  filteredInstances,
  instanceFilter,
  onFilterChange,
  onThumbnailClick,
  selectedSlot,
  isLoading,
  error,
  getThumbnailUrl,
  onThumbnailLoad,
  onThumbnailError,
  accentColor,
  playableCount,
  totalCount,
}: InstanceSidebarProps<T>) {
  const theme = VIEWER_THEMES[accentColor]

  // 드래그 시작 핸들러
  const handleDragStart = (
    e: React.DragEvent<HTMLButtonElement>,
    instance: T
  ) => {
    e.dataTransfer.setData('application/json', JSON.stringify(instance))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className="w-[280px] bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* 헤더: 필터 + 통계 */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Instances</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onFilterChange('playable')}
              className={`px-2 py-1 text-xs rounded-l-md transition-colors ${
                instanceFilter === 'playable'
                  ? `${theme.bgClass} text-white`
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title="Show playable only (multiframe)"
            >
              <Film className="h-3 w-3" />
            </button>
            <button
              onClick={() => onFilterChange('all')}
              className={`px-2 py-1 text-xs rounded-r-md transition-colors ${
                instanceFilter === 'all'
                  ? `${theme.bgClass} text-white`
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
            {filteredInstances.length} / {totalCount} instances
          </span>
          <span className={theme.textClass}>
            {playableCount} playable
          </span>
        </div>

        {/* 선택된 슬롯 표시 */}
        <div className="mt-2 text-xs text-gray-400">
          Click to assign to{' '}
          <span className={`${theme.textClass} font-medium`}>
            Slot {selectedSlot + 1}
          </span>
          <span className="text-gray-500 ml-1">
            (or drag to any slot)
          </span>
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
                <p className="text-xs mt-1">
                  Try showing all instances
                </p>
              )}
            </div>
          ) : (
            filteredInstances.map((instance, index) => {
              const isMultiframe = (instance.numberOfFrames || 1) > 1
              const thumbnailUrl = getThumbnailUrl(instance)

              return (
                <button
                  key={instance.sopInstanceUid}
                  onClick={() => onThumbnailClick(index)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, instance)}
                  className={`w-full p-2 rounded-lg border transition-all hover:border-gray-500 ${
                    isMultiframe
                      ? `${theme.borderClass}/50 bg-gray-900/50`
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
                        onLoad={() => onThumbnailLoad(instance.sopInstanceUid)}
                        onError={() => onThumbnailError(instance.sopInstanceUid)}
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
                          <span className={`text-xs ${theme.textClass}`}>
                            <Film className="h-3 w-3 inline" />{' '}
                            {instance.numberOfFrames}f
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {instance.sopInstanceUid.slice(-12)}...
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
