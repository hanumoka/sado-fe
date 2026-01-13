/**
 * MJPEG Viewer Module
 *
 * 4번째 독립적인 DICOM 뷰어 파이프라인
 * 기존 3개 뷰어 (WADO-RS Rendered, WADO-RS BulkData, WADO-URI)와 완전 독립
 */

// Components
export { MjpegMultiViewer } from './components/MjpegMultiViewer'
export { MjpegSlot } from './components/MjpegSlot'
export { MjpegControls } from './components/MjpegControls'
export { MjpegInstanceSidebar } from './components/MjpegInstanceSidebar'

// Store
export { useMjpegMultiViewerStore, useActiveSlots } from './stores/mjpegMultiViewerStore'

// Utils
export { buildMjpegStreamUrl, buildMjpegInfoUrl } from './utils/mjpegUrlBuilder'

// Types
export type {
  MjpegInstanceSummary,
  MjpegSlotState,
  MjpegGridLayout,
  MjpegResolution,
  MjpegStreamInfo,
} from './types'
export { LAYOUT_SLOT_COUNTS, LAYOUT_GRID_CLASSES } from './types'
