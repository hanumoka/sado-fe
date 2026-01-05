/**
 * CornerstoneSlotOverlay - 슬롯 성능 오버레이 컴포넌트
 *
 * 프레임 정보, FPS, 프리로드 진행률 표시
 *
 * mini-pacs-poc 참고
 */

interface CornerstoneSlotOverlayProps {
  slotId: number
  currentFrame: number
  totalFrames: number
  fps: number
  avgFps: number
  frameDrops: number
  preloadProgress: number
  isPreloading: boolean
  isPreloaded: boolean
  isPlaying: boolean
}

export function CornerstoneSlotOverlay({
  slotId,
  currentFrame,
  totalFrames,
  fps,
  avgFps,
  frameDrops,
  preloadProgress,
  isPreloading,
  isPreloaded,
  isPlaying,
}: CornerstoneSlotOverlayProps) {
  /**
   * FPS 값에 따른 색상 결정
   */
  const getFpsColor = (fpsValue: number): string => {
    if (fpsValue >= 25) return 'text-green-400'
    if (fpsValue >= 15) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 상단 좌측: 슬롯 번호 */}
      <div className="absolute top-2 left-2">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          Slot {slotId + 1}
        </span>
      </div>

      {/* 상단 우측: 프레임 정보 */}
      <div className="absolute top-2 right-2 text-right">
        <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          <span className="font-mono">
            {currentFrame + 1}/{totalFrames}
          </span>
        </div>
      </div>

      {/* 하단 좌측: FPS 정보 (재생 중일 때만 표시) */}
      {isPlaying && (
        <div className="absolute bottom-2 left-2">
          <div className="bg-black/60 text-xs px-2 py-1 rounded space-y-0.5">
            <div className={`font-mono ${getFpsColor(fps)}`}>FPS: {fps.toFixed(1)}</div>
            <div className="text-gray-300 font-mono text-[10px]">
              Avg: {avgFps.toFixed(1)} | Drops: {frameDrops}
            </div>
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
