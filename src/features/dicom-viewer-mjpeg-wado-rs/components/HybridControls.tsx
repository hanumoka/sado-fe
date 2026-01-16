/**
 * HybridControls Component
 *
 * 하이브리드 뷰어 컨트롤 패널
 * - 레이아웃 선택
 * - FPS 조절
 * - MJPEG 해상도 선택
 * - 전체 재생/정지
 */

import { useHybridMultiViewerStore } from '../stores/hybridMultiViewerStore'
import type { HybridGridLayout, HybridMjpegResolution } from '../types'

/**
 * 하이브리드 뷰어 컨트롤 패널
 */
export function HybridControls() {
  const {
    layout,
    globalFps,
    globalResolution,
    setLayout,
    setGlobalFps,
    setGlobalResolution,
    playAll,
    pauseAll,
    stopAll,
  } = useHybridMultiViewerStore()

  // 레이아웃 옵션
  const layoutOptions: { value: HybridGridLayout; label: string }[] = [
    { value: '1x1', label: '1×1' },
    { value: '2x2', label: '2×2' },
    { value: '3x2', label: '3×2' },
    { value: '3x3', label: '3×3' },
  ]

  // 해상도 옵션
  const resolutionOptions: { value: HybridMjpegResolution; label: string }[] = [
    { value: 256, label: '256px' },
    { value: 128, label: '128px' },
  ]

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-white text-sm font-medium border-b border-gray-700 pb-2">
        Hybrid Viewer Controls
      </h3>

      {/* 레이아웃 선택 */}
      <div className="space-y-2">
        <label className="text-gray-400 text-xs">Layout</label>
        <div className="flex gap-2">
          {layoutOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setLayout(option.value)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                layout === option.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* FPS 조절 */}
      <div className="space-y-2">
        <label className="text-gray-400 text-xs">
          FPS: <span className="text-white">{globalFps}</span>
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={globalFps}
          onChange={(e) => setGlobalFps(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1</span>
          <span>30</span>
          <span>60</span>
        </div>
      </div>

      {/* MJPEG 해상도 선택 */}
      <div className="space-y-2">
        <label className="text-gray-400 text-xs">MJPEG Resolution</label>
        <div className="flex gap-2">
          {resolutionOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setGlobalResolution(option.value)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                globalResolution === option.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 재생 컨트롤 */}
      <div className="space-y-2">
        <label className="text-gray-400 text-xs">Playback</label>
        <div className="flex gap-2">
          <button
            onClick={playAll}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Play All
          </button>
          <button
            onClick={pauseAll}
            className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Pause
          </button>
        </div>
        <button
          onClick={stopAll}
          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
              clipRule="evenodd"
            />
          </svg>
          Stop All
        </button>
      </div>

      {/* 모드 설명 */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 space-y-1">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-600" />
            MJPEG: Fast preview (~100ms)
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Cornerstone: Full quality + tools
          </p>
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            Auto-transition at loop boundary
          </p>
        </div>
      </div>
    </div>
  )
}
