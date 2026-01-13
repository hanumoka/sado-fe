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

// WADO-RS Rendered 통계 (동적 import로 의존성 분리)
let getRenderedPrefetcherStats: (() => {
  resolutionStats: Array<{
    resolution: number
    frameCount: number
    avgBytes: number
    minBytes: number
    maxBytes: number
    totalBytes: number
  }>
}) | null = null
let getRenderedCacheStats: (() => { size: number; entries: number; hitRate: number }) | null = null

// WADO-RS Rendered 통계 함수 로드 (lazy)
async function loadRenderedStats() {
  if (!getRenderedPrefetcherStats) {
    const prefetcher = await import('@/features/dicom-viewer/utils/wadoRsRenderedPrefetcher')
    const cache = await import('@/features/dicom-viewer/utils/wadoRsRenderedCache')
    getRenderedPrefetcherStats = prefetcher.getRenderedPrefetcherStats
    getRenderedCacheStats = cache.getRenderedCacheStats
  }
  return { getRenderedPrefetcherStats, getRenderedCacheStats }
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

  // WADO-RS Rendered 통계 상태
  const isWadoRsRendered = displayName === 'WADO-RS Rendered'
  const [showStats, setShowStats] = useState(false)
  const [statsData, setStatsData] = useState<{
    resolutionStats: Array<{
      resolution: number
      frameCount: number
      avgBytes: number
      minBytes: number
      maxBytes: number
      totalBytes: number
    }>
    cacheSize: number
    cacheEntries: number
    hitRate: number
  } | null>(null)

  // 통계 새로고침
  const refreshStats = useCallback(async () => {
    try {
      const { getRenderedPrefetcherStats: getPrefetcher, getRenderedCacheStats: getCache } = await loadRenderedStats()
      if (getPrefetcher && getCache) {
        const prefetcherStats = getPrefetcher()
        const cacheStats = getCache()
        setStatsData({
          resolutionStats: prefetcherStats.resolutionStats,
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

          {statsData && statsData.cacheEntries > 0 && (
            <div className="text-xs text-gray-400 mb-2">
              캐시: {formatBytes(statsData.cacheSize)} ({statsData.cacheEntries}개 프레임) | 히트율: {statsData.hitRate}%
            </div>
          )}

          {statsData && statsData.resolutionStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="text-left py-1 px-2">Resolution</th>
                    <th className="text-right py-1 px-2">프레임 수</th>
                    <th className="text-right py-1 px-2">평균 크기</th>
                    <th className="text-right py-1 px-2">최소</th>
                    <th className="text-right py-1 px-2">최대</th>
                    <th className="text-right py-1 px-2">총 크기</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.resolutionStats.map((stat) => (
                    <tr
                      key={stat.resolution}
                      className={`border-b border-gray-800 ${
                        stat.resolution === globalResolution ? 'bg-blue-900/30 text-blue-300' : 'text-gray-300'
                      }`}
                    >
                      <td className="py-1 px-2 font-medium">{stat.resolution}px</td>
                      <td className="text-right py-1 px-2">{stat.frameCount}</td>
                      <td className="text-right py-1 px-2 font-mono">{formatBytes(stat.avgBytes)}</td>
                      <td className="text-right py-1 px-2 font-mono text-gray-500">{formatBytes(stat.minBytes)}</td>
                      <td className="text-right py-1 px-2 font-mono text-gray-500">{formatBytes(stat.maxBytes)}</td>
                      <td className="text-right py-1 px-2 font-mono">{formatBytes(stat.totalBytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 크기 비교 */}
              {statsData.resolutionStats.length >= 2 && (
                <div className="mt-2 text-xs text-gray-500">
                  {(() => {
                    const sorted = [...statsData.resolutionStats].sort((a, b) => b.avgBytes - a.avgBytes)
                    const largest = sorted[0]
                    const smallest = sorted[sorted.length - 1]
                    if (largest && smallest && smallest.avgBytes > 0) {
                      const ratio = (largest.avgBytes / smallest.avgBytes).toFixed(1)
                      return `${largest.resolution}px는 ${smallest.resolution}px보다 평균 ${ratio}배 큼`
                    }
                    return null
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">
              아직 프리페치된 프레임이 없습니다. Play All을 실행하면 통계가 수집됩니다.
            </div>
          )}
        </div>
      )}
    </footer>
  )
}
