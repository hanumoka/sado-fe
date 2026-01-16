/**
 * BaseSlotOverlay - 공통 슬롯 오버레이 컴포넌트
 *
 * 모든 뷰어 타입에서 공통으로 사용하는 슬롯 오버레이 UI
 * 각 뷰어는 색상 테마와 추가 기능을 props로 커스터마이징
 *
 * Phase 2 최적화: 재생 중 React 상태 업데이트 없음 → 프레임/FPS 정보 제거
 */

export interface BaseSlotOverlayProps {
  /** 슬롯 ID (0-based) */
  slotId: number
  /** 총 프레임 수 */
  totalFrames: number
  /** 프리로드 진행률 (0-100) */
  preloadProgress: number
  /** 프리로드 중 여부 */
  isPreloading: boolean
  /** 프리로드 완료 여부 */
  isPreloaded: boolean
  /** 재생 중 여부 */
  isPlaying: boolean

  // === 커스터마이징 옵션 ===

  /** 뷰어 타입 배지 (예: "(URI)", "(RS-Bulk)") */
  typeBadge?: string
  /** 배지 색상 클래스 (예: "text-yellow-400", "text-cyan-400") */
  typeBadgeColor?: string
  /** 프로그레스 바 배경색 클래스 (예: "bg-blue-500", "bg-yellow-500") */
  progressBarColor?: string
  /** 프로그레스 텍스트 색상 클래스 (예: "text-blue-400", "text-yellow-400") */
  progressTextColor?: string

  // === Progressive Playback (Cornerstone용) ===

  /** 버퍼링 중 여부 */
  isBuffering?: boolean
  /** 로드된 프레임 수 */
  loadedFrameCount?: number

  // === 메타데이터 에러 (WADO-RS BulkData용) ===

  /** 메타데이터 fetch 에러 (non-fatal 경고) */
  metadataError?: string | null

  // === Pre-decode (사전 디코딩) ===

  /** 사전 디코딩 중 여부 */
  isPreDecoding?: boolean
  /** 사전 디코딩 완료 여부 */
  isPreDecoded?: boolean
  /** 사전 디코딩 진행률 (0-100) */
  preDecodeProgress?: number
  /** 디코딩 프로그레스 바 색상 클래스 */
  decodeProgressBarColor?: string
  /** 디코딩 텍스트 색상 클래스 */
  decodeProgressTextColor?: string
}

export function BaseSlotOverlay({
  slotId,
  totalFrames,
  preloadProgress,
  isPreloading,
  isPreloaded,
  isPlaying,
  typeBadge,
  typeBadgeColor = 'text-blue-400',
  progressBarColor = 'bg-blue-500',
  progressTextColor = 'text-blue-400',
  isBuffering = false,
  loadedFrameCount = 0,
  metadataError,
  isPreDecoding = false,
  isPreDecoded = false,
  preDecodeProgress = 0,
  decodeProgressBarColor = 'bg-purple-500',
  decodeProgressTextColor = 'text-purple-400',
}: BaseSlotOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 상단 좌측: 슬롯 번호 */}
      <div className="absolute top-2 left-2">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          Slot {slotId + 1}
        </span>
      </div>

      {/* 메타데이터 경고 배너 (non-fatal) - WADO-RS BulkData용 */}
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

      {/* 상단 우측: 총 프레임 수 + 타입 배지 */}
      <div className="absolute top-2 right-2 text-right">
        <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          <span className="font-mono">{totalFrames} frames</span>
          {typeBadge && (
            <span className={`ml-2 ${typeBadgeColor}`}>{typeBadge}</span>
          )}
        </div>
      </div>

      {/* 중앙: 버퍼링 스피너 (Progressive Playback) - Cornerstone용 */}
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

      {/* 하단 우측: 프리로드 + 디코딩 상태 */}
      <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
        {/* 캐싱 상태 */}
        {isPreloading && (
          <div className="bg-black/60 text-xs px-2 py-1 rounded">
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full ${progressBarColor} transition-all duration-300`}
                  style={{ width: `${preloadProgress}%` }}
                />
              </div>
              <span className={`${progressTextColor} font-mono`}>{preloadProgress}%</span>
            </div>
          </div>
        )}
        {isPreloaded && !isPreloading && (
          <div className="bg-black/60 text-xs px-2 py-1 rounded">
            <span className="text-green-400">Cached</span>
          </div>
        )}

        {/* 디코딩 상태 (캐싱 완료 후에만 표시) */}
        {isPreloaded && isPreDecoding && (
          <div className="bg-black/60 text-xs px-2 py-1 rounded">
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full ${decodeProgressBarColor} transition-all duration-300`}
                  style={{ width: `${preDecodeProgress}%` }}
                />
              </div>
              <span className={`${decodeProgressTextColor} font-mono`}>{preDecodeProgress}%</span>
            </div>
          </div>
        )}
        {isPreloaded && isPreDecoded && !isPreDecoding && (
          <div className="bg-black/60 text-xs px-2 py-1 rounded">
            <span className="text-purple-400">Decoded</span>
          </div>
        )}
      </div>
    </div>
  )
}
