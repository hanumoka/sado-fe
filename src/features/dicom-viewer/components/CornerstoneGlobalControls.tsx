/**
 * CornerstoneGlobalControls - 전체 재생 컨트롤
 *
 * 레이아웃 선택, API 타입 선택, 전체 재생/정지, FPS 조절
 *
 * mini-pacs-poc 참고
 */
import { useState, useCallback } from 'react'
import { useCornerstoneMultiViewerStore } from '../stores'
import { getRenderedCacheStats } from '../utils/wadoRsRenderedCache'
import { formatBytes } from '@/lib/utils'
import type { GridLayout, DataSourceType, SyncMode, RenderingMode } from '../types/multiSlotViewer'
import { DATA_SOURCE_CONFIG } from '../types/multiSlotViewer'

const LAYOUT_OPTIONS: { value: GridLayout; label: string }[] = [
  { value: '1x1', label: '1×1' },
  { value: '2x2', label: '2×2' },
  { value: '3x2', label: '3×2' },
  { value: '3x3', label: '3×3' },
]

const DATA_SOURCE_OPTIONS: { value: DataSourceType; label: string; description: string }[] = [
  {
    value: 'rendered',
    label: 'Pre-rendered',
    description: DATA_SOURCE_CONFIG.rendered.description,
  },
  {
    value: 'original',
    label: 'Original',
    description: DATA_SOURCE_CONFIG.original.description,
  },
  {
    value: 'raw',
    label: 'Raw',
    description: DATA_SOURCE_CONFIG.raw.description,
  },
]

const FPS_OPTIONS = [5, 10, 15, 20, 25, 30, 60]

const SYNC_MODE_OPTIONS: { value: SyncMode; label: string; description: string }[] = [
  {
    value: 'global-sync',
    label: 'Global Sync',
    description: '모든 슬롯이 동시에 재생/일시정지 (버퍼링 시 모든 슬롯 대기)',
  },
  {
    value: 'independent',
    label: 'Independent',
    description: '각 슬롯이 독립적으로 재생 (버퍼링 없이 개별 속도)',
  },
]

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
    dataSourceType,
    globalFps,
    globalResolution,
    syncMode,
    renderingMode,
    isRenderingModeChanging,
    gpuSupported,
    slots,
    setLayout,
    setDataSourceType,
    setGlobalFps,
    setGlobalResolution,
    setSyncMode,
    setRenderingMode,
    playAll,
    pauseAll,
    clearAllSlots,
  } = useCornerstoneMultiViewerStore()

  // GPU 모드 전환 경고 모달 상태
  const [showGpuWarning, setShowGpuWarning] = useState(false)

  // 캐시 통계 상태
  const [showStats, setShowStats] = useState(false)
  const [cacheStats, setCacheStats] = useState<{ size: number; entries: number; hitRate: number } | null>(null)

  // 통계 새로고침
  const refreshStats = useCallback(() => {
    const cache = getRenderedCacheStats()
    setCacheStats({ size: cache.size, entries: cache.entries, hitRate: cache.hitRate })
  }, [])

  // 통계 토글
  const toggleStats = useCallback(() => {
    if (!showStats) {
      refreshStats()
    }
    setShowStats((prev) => !prev)
  }, [showStats, refreshStats])

  // 렌더링 모드 변경 핸들러
  const handleRenderingModeChange = useCallback((mode: RenderingMode) => {
    if (mode === renderingMode || isRenderingModeChanging) return

    // GPU 모드로 전환 시 경고 모달 표시
    if (mode === 'gpu') {
      setShowGpuWarning(true)
    } else {
      // CPU 모드로 전환은 바로 실행
      setRenderingMode(mode)
    }
  }, [renderingMode, isRenderingModeChanging, setRenderingMode])

  // GPU 전환 확인
  const confirmGpuSwitch = useCallback(async () => {
    setShowGpuWarning(false)
    await setRenderingMode('gpu')
  }, [setRenderingMode])

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

        {/* Data Source 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Source:</span>
          <select
            value={dataSourceType}
            onChange={(e) => setDataSourceType(e.target.value as DataSourceType)}
            className="bg-gray-700 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DATA_SOURCE_OPTIONS.map((opt) => (
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

        {/* Sync Mode 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Sync:</span>
          <select
            value={syncMode}
            onChange={(e) => setSyncMode(e.target.value as SyncMode)}
            className="bg-gray-700 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={SYNC_MODE_OPTIONS.find((opt) => opt.value === syncMode)?.description}
          >
            {SYNC_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rendering Mode 선택 (CPU/GPU) */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Render:</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleRenderingModeChange('cpu')}
              disabled={isRenderingModeChanging}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                renderingMode === 'cpu'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${isRenderingModeChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="CPU 렌더링 (안정적, 높은 CPU 사용)"
            >
              CPU
            </button>
            <button
              onClick={() => handleRenderingModeChange('gpu')}
              disabled={isRenderingModeChanging || !gpuSupported}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                renderingMode === 'gpu'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${isRenderingModeChanging || !gpuSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={gpuSupported ? 'GPU 렌더링 (빠름, RGBA 첫 사이클 깨짐 가능)' : 'GPU 렌더링 미지원 (WebGL2 필요)'}
            >
              GPU{!gpuSupported && ' (N/A)'}
            </button>
          </div>
          {isRenderingModeChanging && (
            <span className="text-xs text-yellow-400 animate-pulse">전환 중...</span>
          )}
        </div>

        {/* Resolution 선택 (Pre-rendered일 때만 표시) */}
        {dataSourceType === 'rendered' && (
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
        )}

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

      {/* Data Source 설명 및 Sync Mode 설명 */}
      <div className="mt-2 flex items-center gap-4">
        <div className="text-xs text-gray-500">
          <span className="text-gray-400">[Source]</span>{' '}
          {DATA_SOURCE_OPTIONS.find((opt) => opt.value === dataSourceType)?.description}
          {!DATA_SOURCE_CONFIG[dataSourceType].supportsWindowLevel && (
            <span className="ml-2 text-yellow-500">(W/L 조절 불가)</span>
          )}
          <span className="mx-2">|</span>
          <span className="text-gray-400">[Sync]</span>{' '}
          {SYNC_MODE_OPTIONS.find((opt) => opt.value === syncMode)?.description}
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

      {/* 캐시 통계 패널 */}
      {showStats && (
        <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
          <div className="text-sm text-gray-300 font-medium mb-2">캐시 상태</div>

          {cacheStats ? (
            <div className="text-xs text-gray-400">
              크기: {formatBytes(cacheStats.size)} ({cacheStats.entries}개 프레임) | 히트율: {cacheStats.hitRate}%
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">
              캐시 정보 없음
            </div>
          )}
        </div>
      )}

      {/* GPU 전환 경고 모달 */}
      {showGpuWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 border border-gray-600 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">GPU 렌더링으로 전환</h3>
            <div className="text-gray-300 text-sm space-y-3">
              <p>
                GPU 렌더링 시 RGBA 이미지(WADO-RS Rendered)의 첫 사이클에서 깨짐 현상이 발생할 수 있습니다.
              </p>
              <p>
                이 작업은 현재 진행 중인 재생을 중단하고 뷰포트를 재설정합니다.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowGpuWarning(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmGpuSwitch}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
              >
                GPU로 전환
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
