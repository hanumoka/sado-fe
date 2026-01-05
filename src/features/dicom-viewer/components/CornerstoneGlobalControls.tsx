/**
 * CornerstoneGlobalControls - 전체 재생 컨트롤
 *
 * 레이아웃 선택, API 타입 선택, 전체 재생/정지, FPS 조절
 *
 * mini-pacs-poc 참고
 */
import { useCornerstoneMultiViewerStore } from '../stores'
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

const FPS_OPTIONS = [10, 15, 20, 25, 30, 60]

export function CornerstoneGlobalControls() {
  const {
    layout,
    apiType,
    globalFps,
    slots,
    setLayout,
    setApiType,
    setGlobalFps,
    playAll,
    pauseAll,
    clearAllSlots,
  } = useCornerstoneMultiViewerStore()

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

      {/* API 설명 */}
      <div className="mt-2 text-xs text-gray-500">
        {API_OPTIONS.find((opt) => opt.value === apiType)?.description}
      </div>
    </div>
  )
}
