/**
 * ViewerFooter - 공유 뷰어 푸터 컴포넌트
 *
 * 모든 DICOM 뷰어에서 공통으로 사용하는 푸터 UI
 * - 글로벌 재생 컨트롤 (Play All, Pause All, Stop All)
 * - FPS 설정
 * - 추가 컨트롤 슬롯 (extraControls)
 */
import { useState, useCallback } from 'react'
import { Play, Pause, Square, BarChart3 } from 'lucide-react'
import type { ViewerFooterProps } from '../types/viewerTypes'
import { VIEWER_THEMES } from '../types/viewerTypes'
import { formatBytes } from '@/lib/utils'

// WADO-RS Rendered 캐시 통계 (동적 import로 의존성 분리)
let getRenderedCacheStats: (() => { size: number; entries: number; hitRate: number }) | null = null

// WADO-RS Rendered 캐시 통계 함수 로드 (lazy)
async function loadRenderedCacheStats() {
  if (!getRenderedCacheStats) {
    const cache = await import('@/features/dicom-viewer/utils/wadoRsRenderedCache')
    getRenderedCacheStats = cache.getRenderedCacheStats
  }
  return getRenderedCacheStats
}

const FPS_OPTIONS = [5, 10, 15, 30, 60]

const RESOLUTION_OPTIONS = [
  { value: 512, label: '512px' },
  { value: 256, label: '256px' },
  { value: 128, label: '128px' },
  { value: 64, label: '64px' },
  { value: 32, label: '32px' },
]

export function ViewerFooter({
  globalFps,
  onFpsChange,
  globalResolution,
  onResolutionChange,
  resolutionMode,
  onResolutionModeChange,
  onPlayAll,
  onPauseAll,
  onStopAll,
  accentColor,
  displayName,
  extraControls,
}: ViewerFooterProps) {
  const theme = VIEWER_THEMES[accentColor]

  // WADO-RS Rendered 캐시 통계 상태
  const isWadoRsRendered = displayName === 'WADO-RS Rendered'
  const [showStats, setShowStats] = useState(false)
  const [statsData, setStatsData] = useState<{
    cacheSize: number
    cacheEntries: number
    hitRate: number
  } | null>(null)

  // 통계 새로고침
  const refreshStats = useCallback(async () => {
    try {
      const getCache = await loadRenderedCacheStats()
      if (getCache) {
        const cacheStats = getCache()
        setStatsData({
          cacheSize: cacheStats.size,
          cacheEntries: cacheStats.entries,
          hitRate: cacheStats.hitRate,
        })
      }
    } catch (error) {
      console.warn('Failed to load stats:', error)
    }
  }, [])

  // 통계 토글
  const toggleStats = useCallback(async () => {
    if (!showStats) {
      await refreshStats()
    }
    setShowStats((prev) => !prev)
  }, [showStats, refreshStats])

  return (
    <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* 왼쪽: 재생 컨트롤 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 mr-2">Global:</span>
          <button
            onClick={onPlayAll}
            className={`p-2 ${theme.bgClass} hover:opacity-80 rounded-lg transition-colors`}
            title="Play All"
          >
            <Play className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={onPauseAll}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Pause All"
          >
            <Pause className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={onStopAll}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Stop All"
          >
            <Square className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* 중앙: 추가 컨트롤 */}
        {extraControls && (
          <div className="flex items-center gap-4">
            {extraControls}
          </div>
        )}

        {/* 오른쪽: FPS + Resolution 설정 + 뷰어 타입 표시 */}
        <div className="flex items-center gap-4">
          {/* FPS 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">FPS:</span>
            {FPS_OPTIONS.map((fps) => (
              <button
                key={fps}
                onClick={() => onFpsChange(fps)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  globalFps === fps
                    ? `${theme.bgClass} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {fps}
              </button>
            ))}
          </div>

          {/* Resolution 선택 */}
          {globalResolution !== undefined && onResolutionChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Resolution:</span>
              {/* Auto 버튼 */}
              {onResolutionModeChange && (
                <button
                  onClick={() => onResolutionModeChange('auto')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    resolutionMode === 'auto'
                      ? `${theme.bgClass} text-white`
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title="레이아웃에 따라 자동 해상도 선택"
                >
                  Auto
                </button>
              )}
              {/* 수동 해상도 버튼들 */}
              {RESOLUTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onResolutionChange(opt.value)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    resolutionMode !== 'auto' && globalResolution === opt.value
                      ? `${theme.bgClass} text-white`
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* WADO-RS Rendered 통계 버튼 */}
          {isWadoRsRendered && (
            <button
              onClick={toggleStats}
              className={`p-2 rounded-lg transition-colors ${
                showStats ? theme.bgClass : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="크기 통계 보기"
            >
              <BarChart3 className="h-4 w-4 text-white" />
            </button>
          )}

          {/* 뷰어 타입 표시 */}
          <span className={`text-xs ${theme.textClass} font-medium`}>
            {displayName}
          </span>
        </div>
      </div>

      {/* WADO-RS Rendered 통계 패널 */}
      {isWadoRsRendered && showStats && (
        <div className="border-t border-gray-700 px-4 py-3 bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300 font-medium">Resolution별 프레임 크기 통계</span>
            <button
              onClick={refreshStats}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              새로고침
            </button>
          </div>

          {statsData ? (
            <div className="text-xs text-gray-400">
              캐시: {formatBytes(statsData.cacheSize)} ({statsData.cacheEntries}개 프레임) | 히트율: {statsData.hitRate}%
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">
              캐시 정보 없음
            </div>
          )}
        </div>
      )}
    </footer>
  )
}
