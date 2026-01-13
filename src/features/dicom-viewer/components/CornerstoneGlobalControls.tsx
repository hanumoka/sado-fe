/**
 * CornerstoneGlobalControls - 전체 재생 컨트롤
 *
 * 레이아웃 선택, API 타입 선택, 전체 재생/정지, FPS 조절
 *
 * mini-pacs-poc 참고
 */
import { useState, useCallback } from 'react'
import { useCornerstoneMultiViewerStore } from '../stores'
import { getRenderedPrefetcherStats, type ResolutionStatsInfo } from '../utils/wadoRsRenderedPrefetcher'
import { getRenderedCacheStats } from '../utils/wadoRsRenderedCache'
import { formatBytes } from '@/lib/utils'
import type { GridLayout, ApiType } from '../types/multiSlotViewer'

const LAYOUT_OPTIONS: { value: GridLayout; label: string }[] = [
  { value: '1x1', label: '1×1' },
  { value: '2x2', label: '2×2' },
  { value: '3x3', label: '3×3' },
]

const API_OPTIONS: { value: ApiType; label: string; description: string }[] = [
  {
    value: 'wado-rs',
    label: 'WADO-RS',
    description: '/dicomweb/studies/.../instances/.../frames/{n}/rendered',
  },
  {
    value: 'wado-uri',
    label: 'WADO-URI',
    description: '/dicomweb/wado?objectUID=...&frameNumber={n}',
  },
]

const FPS_OPTIONS = [5, 10, 15, 20, 25, 30, 60]

const RESOLUTION_OPTIONS = [
  { value: 512, label: '512px (PNG)' },
  { value: 256, label: '256px (JPEG)' },
  { value: 128, label: '128px (JPEG)' },
  { value: 64, label: '64px (JPEG)' },
  { value: 32, label: '32px (JPEG)' },
]

export function CornerstoneGlobalControls() {
  const {
    layout,
    apiType,
    globalFps,
    globalResolution,
    slots,
    setLayout,
    setApiType,
    setGlobalFps,
    setGlobalResolution,
    playAll,
    pauseAll,
    clearAllSlots,
  } = useCornerstoneMultiViewerStore()

  // Resolution별 크기 통계 상태
  const [showStats, setShowStats] = useState(false)
  const [resolutionStats, setResolutionStats] = useState<ResolutionStatsInfo[]>([])
  const [cacheStats, setCacheStats] = useState<{ size: number; entries: number; hitRate: number } | null>(null)

  // 통계 새로고침
  const refreshStats = useCallback(() => {
    const prefetcherStats = getRenderedPrefetcherStats()
    const cache = getRenderedCacheStats()
    setResolutionStats(prefetcherStats.resolutionStats)
    setCacheStats({ size: cache.size, entries: cache.entries, hitRate: cache.hitRate })
  }, [])

  // 통계 토글
  const toggleStats = useCallback(() => {
    if (!showStats) {
      refreshStats()
    }
    setShowStats((prev) => !prev)
  }, [showStats, refreshStats])

  // 현재 재생 중인 슬롯 수
  const playingCount = Object.values(slots).filter((s) => s.isPlaying).length

  // 할당된 슬롯 수
  const assignedCount = Object.values(slots).filter((s) => s.instance).length

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* 레이아웃 선택 */}
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

        {/* API 타입 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">API:</span>
          <select
            value={apiType}
            onChange={(e) => setApiType(e.target.value as ApiType)}
            className="bg-gray-700 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {API_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* FPS 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">FPS:</span>
          <select
            value={globalFps}
            onChange={(e) => setGlobalFps(parseInt(e.target.value, 10))}
            className="bg-gray-700 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FPS_OPTIONS.map((fps) => (
              <option key={fps} value={fps}>
                {fps}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Resolution:</span>
          <select
            value={globalResolution}
            onChange={(e) => setGlobalResolution(parseInt(e.target.value, 10))}
            className="bg-gray-700 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RESOLUTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 구분선 */}
        <div className="h-8 w-px bg-gray-600" />

        {/* 전체 재생 */}
        <button
          onClick={playAll}
          disabled={assignedCount === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
          title="Play all assigned slots"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play All
        </button>

        {/* 전체 정지 */}
        <button
          onClick={pauseAll}
          disabled={playingCount === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
          title="Pause all slots"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          Pause All
        </button>

        {/* 전체 클리어 */}
        <button
          onClick={clearAllSlots}
          disabled={assignedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-300 rounded text-sm transition-colors"
          title="Clear all slots"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
          Clear All
        </button>

        {/* 상태 표시 */}
        <div className="ml-auto text-gray-400 text-sm">
          <span className="text-blue-400">{playingCount}</span>
          <span> playing / </span>
          <span className="text-green-400">{assignedCount}</span>
          <span> assigned</span>
        </div>
      </div>

      {/* API 설명 및 통계 토글 */}
      <div className="mt-2 flex items-center gap-4">
        <div className="text-xs text-gray-500">
          {API_OPTIONS.find((opt) => opt.value === apiType)?.description}
        </div>
        <button
          onClick={toggleStats}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          {showStats ? '통계 숨기기' : '크기 통계 보기'}
        </button>
        {showStats && (
          <button
            onClick={refreshStats}
            className="text-xs text-gray-400 hover:text-gray-300"
          >
            [새로고침]
          </button>
        )}
      </div>

      {/* Resolution별 크기 통계 패널 */}
      {showStats && (
        <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
          <div className="text-sm text-gray-300 font-medium mb-2">Resolution별 프레임 크기 통계</div>

          {/* 캐시 상태 */}
          {cacheStats && (
            <div className="text-xs text-gray-400 mb-2">
              캐시: {formatBytes(cacheStats.size)} ({cacheStats.entries}개 프레임) | 히트율: {cacheStats.hitRate}%
            </div>
          )}

          {/* Resolution별 크기 테이블 */}
          {resolutionStats.length > 0 ? (
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
                {resolutionStats.map((stat) => (
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
          ) : (
            <div className="text-xs text-gray-500 italic">
              아직 프리페치된 프레임이 없습니다. Play All을 실행하면 통계가 수집됩니다.
            </div>
          )}

          {/* 크기 비교 설명 */}
          {resolutionStats.length >= 2 && (
            <div className="mt-2 text-xs text-gray-500">
              {(() => {
                const sorted = [...resolutionStats].sort((a, b) => b.avgBytes - a.avgBytes)
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
      )}
    </div>
  )
}
