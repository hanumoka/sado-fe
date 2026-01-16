/**
 * Hybrid MJPEG+WADO-RS Viewer
 *
 * 하이브리드 뷰어 모듈 진입점
 *
 * 특징:
 * - MJPEG 즉시 재생 (~100ms)
 * - WADO-RS Cornerstone 백그라운드 프리로드
 * - 루프 경계에서 자연스러운 전환
 * - 기존 4개 뷰어와 완전 격리
 */

// Types
export * from './types'

// Store
export { useHybridMultiViewerStore, useActiveHybridSlots, useHybridSlot } from './stores/hybridMultiViewerStore'

// Components
export { HybridMultiViewer } from './components/HybridMultiViewer'
export { HybridSlot } from './components/HybridSlot'
export { HybridControls } from './components/HybridControls'
export { HybridInstanceSidebar } from './components/HybridInstanceSidebar'
export { HybridSlotOverlay } from './components/HybridSlotOverlay'

// Layers
export { MjpegLayer } from './components/layers/MjpegLayer'
export { CornerstoneLayer, HYBRID_RENDERING_ENGINE_ID, HYBRID_TOOL_GROUP_ID } from './components/layers/CornerstoneLayer'

// Utils
export { hybridPreloadManager } from './utils/hybridPreloadManager'
export { hybridCineAnimationManager } from './utils/HybridCineAnimationManager'
export { createHybridImageId, createHybridImageIds, getFrameNumberFromImageId } from './utils/hybridImageIdHelper'
export { fetchHybridMetadata, registerHybridMetadataProvider, clearHybridMetadataCache } from './utils/hybridMetadataProvider'
