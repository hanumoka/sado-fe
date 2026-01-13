/**
 * MjpegControls Component (v2)
 *
 * MJPEG 뷰어 글로벌 컨트롤
 * - 레이아웃, 해상도, FPS 설정
 * - Load All / Play All / Pause All 버튼
 * - 캐시 통계 표시
 */

import { useMemo } from 'react'
import { useMjpegMultiViewerStore, useActiveSlots } from '../stores/mjpegMultiViewerStore'
import { cineFramesLoadingManager } from '../utils/CineFramesLoadingManager'
import type { MjpegGridLayout, MjpegResolution } from '../types'
import {
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  Square,
  Grip,
  GripHorizontal,
  Table2,
  LayoutDashboard,
  Trash2,
  Download,
  Play,
  Pause,
  Loader2,
  HardDrive,
  X,
} from 'lucide-react'

const LAYOUTS: { value: MjpegGridLayout; label: string; icon: React.ReactNode }[] = [
  { value: '1x1', label: '1x1', icon: <Square className="w-4 h-4" /> },
  { value: '2x2', label: '2x2', icon: <Grid2X2 className="w-4 h-4" /> },
  { value: '3x3', label: '3x3', icon: <Grid3X3 className="w-4 h-4" /> },
  { value: '4x4', label: '4x4', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: '5x5', label: '5x5', icon: <Grip className="w-4 h-4" /> },
  { value: '6x6', label: '6x6', icon: <GripHorizontal className="w-4 h-4" /> },
  { value: '7x7', label: '7x7', icon: <Table2 className="w-4 h-4" /> },
  { value: '8x8', label: '8x8', icon: <LayoutDashboard className="w-4 h-4" /> },
]

const RESOLUTIONS: MjpegResolution[] = [256, 128, 64, 32]
const FRAME_RATES = [10, 15, 20, 25, 30, 60]

/**
 * MJPEG 컨트롤 바
 */
export function MjpegControls() {
  const {
    layout,
    globalResolution,
    globalFrameRate,
    isLoadingAll,
    loadAllProgress,
    setLayout,
    setGlobalResolution,
    setGlobalFrameRate,
    clearAllSlots,
    loadAllSlots,
    cancelLoading,
    playAll,
    pauseAll,
    clearAllCache,
  } = useMjpegMultiViewerStore()

  const activeSlots = useActiveSlots()

  // 슬롯 통계 계산
  const slotStats = useMemo(() => {
    const withInstance = activeSlots.filter(s => s.instance !== null).length
    const cached = activeSlots.filter(s => s.isCached).length
    const playing = activeSlots.filter(s => s.streamingStatus === 'streaming').length
    const loading = activeSlots.filter(s => s.streamingStatus === 'loading').length

    return { withInstance, cached, playing, loading }
  }, [activeSlots])

  // 캐시 통계
  const cacheStats = useMemo(() => {
    return cineFramesLoadingManager.getCacheStats()
  }, [slotStats.cached]) // slotStats.cached가 변경될 때 재계산

  // 로딩 가능 여부 (Instance가 있고 캐시되지 않은 슬롯이 있을 때)
  const canLoad = slotStats.withInstance > slotStats.cached && !isLoadingAll

  // 재생 가능 여부 (캐시된 슬롯이 있을 때)
  const canPlay = slotStats.cached > 0

  // 현재 재생 중인지
  const isAnyPlaying = slotStats.playing > 0

  return (
    <div className="flex flex-col bg-gray-800 border-b border-gray-700">
      {/* 메인 컨트롤 바 */}
      <div className="flex items-center gap-4 p-2">
        {/* 레이아웃 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Layout:</span>
          <div className="flex gap-1">
            {LAYOUTS.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setLayout(value)}
                className={`p-1.5 rounded transition-colors ${
                  layout === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-600" />

        {/* 해상도 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Resolution:</span>
          <select
            value={globalResolution}
            onChange={(e) => setGlobalResolution(Number(e.target.value) as MjpegResolution)}
            className="px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600"
          >
            {RESOLUTIONS.map((res) => (
              <option key={res} value={res}>
                {res}px
              </option>
            ))}
          </select>
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-600" />

        {/* FPS 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">FPS:</span>
          <select
            value={globalFrameRate}
            onChange={(e) => setGlobalFrameRate(Number(e.target.value))}
            className="px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600"
          >
            {FRAME_RATES.map((fps) => (
              <option key={fps} value={fps}>
                {fps} fps
              </option>
            ))}
          </select>
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-600" />

        {/* 로드/재생 컨트롤 */}
        <div className="flex items-center gap-2">
          {/* Load All 버튼 */}
          {isLoadingAll ? (
            <button
              onClick={cancelLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel ({loadAllProgress}%)
            </button>
          ) : (
            <button
              onClick={loadAllSlots}
              disabled={!canLoad}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
                canLoad
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              title={canLoad ? 'Load all frames' : 'No slots to load'}
            >
              <Download className="w-4 h-4" />
              Load All
            </button>
          )}

          {/* Play All / Pause All 버튼 */}
          {isAnyPlaying ? (
            <button
              onClick={pauseAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause All
            </button>
          ) : (
            <button
              onClick={playAll}
              disabled={!canPlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
                canPlay
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              title={canPlay ? 'Play all cached slots' : 'No cached slots'}
            >
              <Play className="w-4 h-4" />
              Play All
            </button>
          )}
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-600" />

        {/* 캐시 정리 */}
        <button
          onClick={clearAllCache}
          disabled={slotStats.cached === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
            slotStats.cached > 0
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          title="Clear frame cache"
        >
          <HardDrive className="w-4 h-4" />
          Clear Cache
        </button>

        {/* 모두 삭제 */}
        <button
          onClick={clearAllSlots}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>

        {/* 우측 - 상태 표시 */}
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
          {/* 슬롯 상태 */}
          <div className="flex items-center gap-2">
            <span>Slots:</span>
            <span className="text-white">{slotStats.withInstance}</span>
            <span>/</span>
            <span className="text-green-400">{slotStats.cached} cached</span>
            {slotStats.loading > 0 && (
              <>
                <span>/</span>
                <span className="text-yellow-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {slotStats.loading} loading
                </span>
              </>
            )}
            {slotStats.playing > 0 && (
              <>
                <span>/</span>
                <span className="text-green-400">{slotStats.playing} playing</span>
              </>
            )}
          </div>

          {/* 캐시 메모리 */}
          {cacheStats.cachedSlots > 0 && (
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>{cacheStats.totalFrames} frames</span>
              <span>({cacheStats.estimatedMemoryMB} MB)</span>
            </div>
          )}
        </div>
      </div>

      {/* 로딩 진행률 바 */}
      {isLoadingAll && (
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${loadAllProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}
