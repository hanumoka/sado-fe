/**
 * WadoRsBulkDataSlotOverlay - WADO-RS BulkData 슬롯 오버레이 컴포넌트
 *
 * 슬롯 번호, 프리로드 상태만 표시 (최소화)
 * Phase 2 최적화: 재생 중 React 상태 업데이트 없음 → 프레임/FPS 정보 제거
 *
 * dicom-viewer, dicom-viewer-wado-uri의 SlotOverlay와 완전 독립적인 구현
 */

interface WadoRsBulkDataSlotOverlayProps {
  slotId: number
  totalFrames: number
  preloadProgress: number
  isPreloading: boolean
  isPreloaded: boolean
  isPlaying: boolean
  /** 메타데이터 fetch 에러 (non-fatal 경고) */
  metadataError?: string | null
}

export function WadoRsBulkDataSlotOverlay({
  slotId,
  totalFrames,
  preloadProgress,
  isPreloading,
  isPreloaded,
  isPlaying,
  metadataError,
}: WadoRsBulkDataSlotOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 상단 좌측: 슬롯 번호 */}
      <div className="absolute top-2 left-2">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          Slot {slotId + 1}
        </span>
      </div>

      {/* 메타데이터 경고 배너 (non-fatal) */}
      {metadataError && (
        <div className="absolute top-10 left-2 right-2">
          <div className="bg-yellow-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="truncate">Metadata fallback</span>
          </div>
        </div>
      )}

      {/* 상단 우측: 총 프레임 수 + WADO-RS BulkData 표시 */}
      <div className="absolute top-2 right-2 text-right">
        <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          <span className="font-mono">{totalFrames} frames</span>
          <span className="ml-2 text-cyan-400">(RS-Bulk)</span>
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
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${preloadProgress}%` }}
                />
              </div>
              <span className="text-cyan-400 font-mono">{preloadProgress}%</span>
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
