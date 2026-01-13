/**
 * WadoUriSlotOverlay - WADO-URI 뷰어용 슬롯 오버레이
 *
 * BaseSlotOverlay를 사용하여 노란색 테마 + (URI) 배지 표시
 */

import { BaseSlotOverlay } from '@/components/viewer/BaseSlotOverlay'

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
    <BaseSlotOverlay
      slotId={slotId}
      totalFrames={totalFrames}
      preloadProgress={preloadProgress}
      isPreloading={isPreloading}
      isPreloaded={isPreloaded}
      isPlaying={isPlaying}
      // WADO-URI: 노란색 테마 + (URI) 배지
      typeBadge="(URI)"
      typeBadgeColor="text-yellow-400"
      progressBarColor="bg-yellow-500"
      progressTextColor="text-yellow-400"
    />
  )
}
