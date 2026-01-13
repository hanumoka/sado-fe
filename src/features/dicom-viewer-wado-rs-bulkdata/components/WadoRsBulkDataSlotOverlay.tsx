/**
 * WadoRsBulkDataSlotOverlay - WADO-RS BulkData 뷰어용 슬롯 오버레이
 *
 * BaseSlotOverlay를 사용하여 시안 테마 + (RS-Bulk) 배지 + 메타데이터 에러 표시
 */

import { BaseSlotOverlay } from '@/components/viewer/BaseSlotOverlay'

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
    <BaseSlotOverlay
      slotId={slotId}
      totalFrames={totalFrames}
      preloadProgress={preloadProgress}
      isPreloading={isPreloading}
      isPreloaded={isPreloaded}
      isPlaying={isPlaying}
      // WADO-RS BulkData: 시안 테마 + (RS-Bulk) 배지
      typeBadge="(RS-Bulk)"
      typeBadgeColor="text-cyan-400"
      progressBarColor="bg-cyan-500"
      progressTextColor="text-cyan-400"
      // 메타데이터 에러 배너
      metadataError={metadataError}
    />
  )
}
