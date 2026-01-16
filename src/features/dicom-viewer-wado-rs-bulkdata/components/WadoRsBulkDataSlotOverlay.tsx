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
  /** 사전 디코딩 중 여부 */
  isPreDecoding?: boolean
  /** 사전 디코딩 완료 여부 */
  isPreDecoded?: boolean
  /** 사전 디코딩 진행률 (0-100) */
  preDecodeProgress?: number
}

export function WadoRsBulkDataSlotOverlay({
  slotId,
  totalFrames,
  preloadProgress,
  isPreloading,
  isPreloaded,
  isPlaying,
  metadataError,
  isPreDecoding,
  isPreDecoded,
  preDecodeProgress,
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
      // 사전 디코딩 상태
      isPreDecoding={isPreDecoding}
      isPreDecoded={isPreDecoded}
      preDecodeProgress={preDecodeProgress}
      decodeProgressBarColor="bg-purple-500"
      decodeProgressTextColor="text-purple-400"
    />
  )
}
