/**
 * MJPEG Viewer Types
 *
 * MJPEG 스트리밍 뷰어 전용 타입 정의
 * 기존 3개 뷰어 (WADO-RS Rendered, WADO-RS BulkData, WADO-URI)와 완전 독립
 */

/**
 * MJPEG 스트리밍용 Instance 정보
 */
export interface MjpegInstanceSummary {
  /** Instance Primary Key */
  id: number
  /** SOP Instance UID */
  sopInstanceUid: string
  /** Study Instance UID */
  studyInstanceUid: string
  /** Series Instance UID */
  seriesInstanceUid: string
  /** 프레임 수 */
  numberOfFrames: number
  /** 프레임 레이트 (fps) */
  frameRate: number
  /** Instance Number */
  instanceNumber?: number
}

/**
 * MJPEG 슬롯 상태
 */
export interface MjpegSlotState {
  /** 슬롯 ID (0-63) */
  slotId: number
  /** 할당된 Instance (없으면 null) */
  instance: MjpegInstanceSummary | null
  /** 스트리밍 상태 */
  streamingStatus: 'idle' | 'loading' | 'streaming' | 'error'
  /** 에러 메시지 (있으면) */
  errorMessage?: string
}

/**
 * 그리드 레이아웃 타입
 */
export type MjpegGridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '5x5' | '6x6' | '7x7' | '8x8'

/**
 * 지원 해상도
 */
export type MjpegResolution = 256 | 128 | 64 | 32

/**
 * MJPEG 스트리밍 정보 (Backend /info 응답)
 */
export interface MjpegStreamInfo {
  sopInstanceUid: string
  numberOfFrames: number
  frameRate: number
  transcodingStatus: string
  streamable: boolean
  supportedResolutions: number[]
  defaultResolution: number
  defaultFrameRate: number
  streamUrl: string
  estimatedDurationSeconds: number
}

/**
 * 레이아웃별 슬롯 수
 */
export const LAYOUT_SLOT_COUNTS: Record<MjpegGridLayout, number> = {
  '1x1': 1,
  '2x2': 4,
  '3x3': 9,
  '4x4': 16,
  '5x5': 25,
  '6x6': 36,
  '7x7': 49,
  '8x8': 64,
}

/**
 * 레이아웃별 Grid 클래스
 */
export const LAYOUT_GRID_CLASSES: Record<MjpegGridLayout, string> = {
  '1x1': 'grid-cols-1 grid-rows-1',
  '2x2': 'grid-cols-2 grid-rows-2',
  '3x3': 'grid-cols-3 grid-rows-3',
  '4x4': 'grid-cols-4 grid-rows-4',
  '5x5': 'grid-cols-5 grid-rows-5',
  '6x6': 'grid-cols-6 grid-rows-6',
  '7x7': 'grid-cols-7 grid-rows-7',
  '8x8': 'grid-cols-8 grid-rows-8',
}
