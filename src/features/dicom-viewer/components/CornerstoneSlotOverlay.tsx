/**
 * CornerstoneSlotOverlay - Cornerstone 뷰어용 슬롯 오버레이
 *
 * BaseSlotOverlay를 사용하여 Progressive Playback (버퍼링) 기능 포함
 */

import { BaseSlotOverlay } from '@/components/viewer/BaseSlotOverlay'

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
    <BaseSlotOverlay
      slotId={slotId}
      totalFrames={totalFrames}
      preloadProgress={preloadProgress}
      isPreloading={isPreloading}
      isPreloaded={isPreloaded}
      isPlaying={isPlaying}
      // Cornerstone: 파란색 테마, 타입 배지 없음
      progressBarColor="bg-blue-500"
      progressTextColor="text-blue-400"
      // Progressive Playback
      isBuffering={isBuffering}
      loadedFrameCount={loadedFrameCount}
    />
  )
}
