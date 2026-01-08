/**
 * WadoUriSlotOverlay - WADO-URI 슬롯 오버레이 컴포넌트
 *
 * 슬롯 번호, 프리로드 상태만 표시 (최소화)
 * Phase 2 최적화: 재생 중 React 상태 업데이트 없음 → 프레임/FPS 정보 제거
 *
 * dicom-viewer의 CornerstoneSlotOverlay와 완전 독립적인 구현
 */

interface WadoUriSlotOverlayProps {
  slotId: number
  totalFrames: number
  preloadProgress: number
  isPreloading: boolean
  isPreloaded: boolean
  isPlaying: boolean
}

export function WadoUriSlotOverlay({
  slotId,
  totalFrames,
  preloadProgress,
  isPreloading,
  isPreloaded,
  isPlaying,
}: WadoUriSlotOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 상단 좌측: 슬롯 번호 */}
      <div className="absolute top-2 left-2">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          Slot {slotId + 1}
        </span>
      </div>

      {/* 상단 우측: 총 프레임 수 + WADO-URI 표시 */}
      <div className="absolute top-2 right-2 text-right">
        <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          <span className="font-mono">{totalFrames} frames</span>
          <span className="ml-2 text-yellow-400">(URI)</span>
        </div>
      </div>

      {/* 재생 중 표시 */}
      {isPlaying && (
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
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${preloadProgress}%` }}
                />
              </div>
              <span className="text-yellow-400 font-mono">{preloadProgress}%</span>
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
