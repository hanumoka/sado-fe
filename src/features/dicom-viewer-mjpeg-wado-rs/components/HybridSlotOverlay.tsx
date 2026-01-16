/**
 * HybridSlotOverlay Component
 *
 * 슬롯 상태 오버레이 (로딩 진행률, 모드 표시 등)
 */

import { useHybridMultiViewerStore } from '../stores/hybridMultiViewerStore'

interface HybridSlotOverlayProps {
  slotId: number
}

/**
 * 슬롯 상태 오버레이
 */
export function HybridSlotOverlay({ slotId }: HybridSlotOverlayProps) {
  const slot = useHybridMultiViewerStore((state) => state.slots[slotId])

  if (!slot?.instance) {
    return null
  }

  const { phase, mjpeg, cornerstone, transition } = slot

  // 상태별 배지 색상
  const getBadgeColor = () => {
    switch (phase) {
      case 'idle':
        return 'bg-gray-600'
      case 'mjpeg-loading':
        return 'bg-yellow-600'
      case 'mjpeg-playing':
        return 'bg-green-600'
      case 'transition-prepare':
        return 'bg-orange-600'
      case 'transitioning':
        return 'bg-purple-600'
      case 'cornerstone':
        return 'bg-blue-600'
      default:
        return 'bg-gray-600'
    }
  }

  // 상태별 레이블
  const getPhaseLabel = () => {
    switch (phase) {
      case 'idle':
        return 'Idle'
      case 'mjpeg-loading':
        return 'MJPEG Loading'
      case 'mjpeg-playing':
        return 'MJPEG'
      case 'transition-prepare':
        return 'Preparing...'
      case 'transitioning':
        return 'Transitioning'
      case 'cornerstone':
        return 'Cornerstone'
      default:
        return phase
    }
  }

  // 프레임 정보
  const currentFrame =
    phase === 'cornerstone' ? cornerstone.currentFrame : mjpeg.currentFrame
  const totalFrames = slot.instance.numberOfFrames

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-2">
      {/* 상단: 슬롯 번호 + 모드 배지 */}
      <div className="flex justify-between items-start">
        {/* 슬롯 번호 */}
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          Slot {slotId + 1}
        </span>

        {/* 모드 배지 */}
        <span className={`${getBadgeColor()} text-white text-xs px-2 py-1 rounded`}>
          {getPhaseLabel()}
        </span>
      </div>

      {/* 중앙: 로딩/전환 진행률 */}
      {(phase === 'mjpeg-loading' || phase === 'transitioning') && (
        <div className="flex items-center justify-center">
          {phase === 'mjpeg-loading' && (
            <div className="bg-black/70 rounded-lg p-3 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2" />
              <p className="text-white text-xs">MJPEG Loading</p>
              <p className="text-green-400 text-sm font-bold">{mjpeg.loadProgress}%</p>
            </div>
          )}

          {phase === 'transitioning' && (
            <div className="bg-black/70 rounded-lg p-3 text-center">
              <div className="animate-pulse">
                <div className="h-6 w-6 mx-auto mb-2 bg-purple-500 rounded-full" />
              </div>
              <p className="text-white text-xs">Transitioning...</p>
            </div>
          )}
        </div>
      )}

      {/* 하단: 프레임 정보 + 프리로드 진행률 */}
      <div className="flex justify-between items-end">
        {/* 프레임 카운터 */}
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          {currentFrame + 1} / {totalFrames}
        </span>

        {/* WADO-RS 프리로드 진행률 */}
        <div className="flex flex-col items-end gap-1">
          {/* 전환 대기 상태 표시 */}
          {transition.pendingTransition && (
            <span className="bg-purple-600/80 text-white text-xs px-2 py-1 rounded animate-pulse">
              Waiting for loop...
            </span>
          )}

          {/* 프리로드 진행률 (완료 전에만 표시) */}
          {phase !== 'cornerstone' && !cornerstone.isPreloaded && (
            <div className="bg-black/60 rounded px-2 py-1">
              <span className="text-blue-400 text-xs">
                WADO-RS: {cornerstone.preloadProgress}%
              </span>
            </div>
          )}

          {/* 프리로드 완료 표시 */}
          {phase !== 'cornerstone' && cornerstone.isPreloaded && (
            <span className="bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
              WADO-RS Ready
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
