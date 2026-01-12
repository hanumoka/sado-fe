/**
 * CornerstoneSlotOverlay - 슬롯 오버레이 컴포넌트
 *
 * 슬롯 번호, 프리로드 상태, 버퍼링 상태 표시
 * Phase 2 최적화: 재생 중 React 상태 업데이트 없음 → 프레임/FPS 정보 제거
 * Progressive Playback: 버퍼링 중 스피너 표시
 *
 * mini-pacs-poc 참고
 */

interface CornerstoneSlotOverlayProps {
  slotId: number
  totalFrames: number
  preloadProgress: number
  isPreloading: boolean
  isPreloaded: boolean
  isPlaying: boolean
  isBuffering?: boolean
  loadedFrameCount?: number
}

export function CornerstoneSlotOverlay({
  slotId,
  totalFrames,
  preloadProgress,
  isPreloading,
  isPreloaded,
  isPlaying,
  isBuffering = false,
  loadedFrameCount = 0,
}: CornerstoneSlotOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 상단 좌측: 슬롯 번호 */}
      <div className="absolute top-2 left-2">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          Slot {slotId + 1}
        </span>
      </div>

      {/* 상단 우측: 총 프레임 수 (고정) */}
      <div className="absolute top-2 right-2 text-right">
        <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          <span className="font-mono">{totalFrames} frames</span>
        </div>
      </div>

      {/* 중앙: 버퍼링 스피너 (Progressive Playback) */}
      {isBuffering && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/70 px-4 py-3 rounded-lg flex flex-col items-center gap-2">
            {/* 스피너 */}
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-xs">Buffering...</span>
            <span className="text-gray-400 text-xs font-mono">
              {loadedFrameCount}/{totalFrames}
            </span>
          </div>
        </div>
      )}

      {/* 재생 중 표시 (버퍼링 중이 아닐 때만) */}
      {isPlaying && !isBuffering && (
        <div className="absolute bottom-2 left-2">
          <div className="bg-black/60 text-xs px-2 py-1 rounded">
            <span className="text-green-400 animate-pulse">Playing</span>
          </div>
        </div>
      )}

      {/* 하단 우측: 프리로드 상태 */}
      <div className="absolute bottom-2 right-2">
        {isPreloading && (
          <div className="bg-black/60 text-xs px-2 py-1 rounded">
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${preloadProgress}%` }}
                />
              </div>
              <span className="text-blue-400 font-mono">{preloadProgress}%</span>
            </div>
          </div>
        )}
        {isPreloaded && !isPreloading && (
          <div className="bg-black/60 text-xs px-2 py-1 rounded">
            <span className="text-green-400">Cached</span>
          </div>
        )}
      </div>
    </div>
  )
}
