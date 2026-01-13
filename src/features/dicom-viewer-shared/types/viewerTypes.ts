/**
 * 공유 뷰어 타입 정의
 *
 * 3개의 DICOM 뷰어(WADO-RS Rendered, WADO-RS BulkData, WADO-URI)에서
 * 공통으로 사용되는 타입들을 정의합니다.
 */

// ==================== 레이아웃 ====================

/** 그리드 레이아웃 타입 */
export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4'

/** 레이아웃 옵션 */
export interface LayoutOption {
  value: GridLayout
  label: string
  slots: number
}

/** 레이아웃 옵션 목록 */
export const LAYOUT_OPTIONS: LayoutOption[] = [
  { value: '1x1', label: '1×1', slots: 1 },
  { value: '2x2', label: '2×2', slots: 4 },
  { value: '3x3', label: '3×3', slots: 9 },
  { value: '4x4', label: '4×4', slots: 16 },
]

// ==================== 인스턴스 ====================

/** Instance 필터 타입 */
export type InstanceFilter = 'all' | 'playable'

/** 공통 Instance 정보 */
export interface BaseInstanceInfo {
  sopInstanceUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  numberOfFrames: number
  patientName?: string
  modality?: string
  instanceNumber?: number
}

// ==================== 뷰어 테마 ====================

/** 뷰어 강조 색상 */
export type ViewerAccentColor = 'blue' | 'cyan' | 'yellow'

/** 뷰어 테마 설정 */
export interface ViewerTheme {
  accentColor: ViewerAccentColor
  borderClass: string
  textClass: string
  bgClass: string
}

/** 강조 색상별 테마 매핑 */
export const VIEWER_THEMES: Record<ViewerAccentColor, ViewerTheme> = {
  blue: {
    accentColor: 'blue',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500',
  },
  cyan: {
    accentColor: 'cyan',
    borderClass: 'border-cyan-500',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500',
  },
  yellow: {
    accentColor: 'yellow',
    borderClass: 'border-yellow-500',
    textClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500',
  },
}

// ==================== 로더 전략 ====================

/** 뷰어 로더 타입 */
export type ViewerLoaderType = 'wadors-rendered' | 'wadors' | 'wadouri'

/**
 * 뷰어 로더 전략 인터페이스
 *
 * Strategy Pattern을 사용하여 각 로더 타입별 동작을 캡슐화합니다.
 */
export interface ViewerLoaderStrategy {
  /** 로더 타입 식별자 */
  readonly loaderType: ViewerLoaderType
  /** 표시 이름 */
  readonly displayName: string
  /** 강조 색상 */
  readonly accentColor: ViewerAccentColor
  /** Cornerstone Tool Group ID */
  readonly toolGroupId: string
  /** Cornerstone Rendering Engine ID */
  readonly renderingEngineId: string

  /**
   * ImageId 배열 생성
   * @param studyUid Study Instance UID
   * @param seriesUid Series Instance UID
   * @param sopUid SOP Instance UID
   * @param numberOfFrames 프레임 수
   * @returns Cornerstone ImageId 배열
   */
  createImageIds: (
    studyUid: string,
    seriesUid: string,
    sopUid: string,
    numberOfFrames: number
  ) => string[]

  /**
   * 썸네일 URL 생성
   * @param studyUid Study Instance UID
   * @param seriesUid Series Instance UID
   * @param sopUid SOP Instance UID
   * @param frameNumber 프레임 번호 (1-based)
   * @returns 썸네일 이미지 URL
   */
  getThumbnailUrl: (
    studyUid: string,
    seriesUid: string,
    sopUid: string,
    frameNumber: number
  ) => string

  /**
   * Tool Group 초기화 (선택적)
   */
  initializeToolGroup?: () => void

  /**
   * 메타데이터 사전 로드 (선택적, WADO-RS BulkData용)
   */
  fetchMetadata?: (
    studyUid: string,
    seriesUid: string,
    sopUid: string
  ) => Promise<void>
}

// ==================== Store 공통 인터페이스 ====================

/** 슬롯 상태 공통 필드 */
export interface BaseSlotState {
  currentFrame: number
  isPlaying: boolean
  isPreloading: boolean
  isPreloaded: boolean
  preloadProgress: number
  loading: boolean
  error: string | null
}

/** 뷰어 Store 공통 액션 */
export interface ViewerStoreActions {
  // 레이아웃
  setLayout: (layout: GridLayout) => void
  setGlobalFps: (fps: number) => void

  // 재생 제어
  playAll: () => Promise<void>
  pauseAll: () => void
  stopAll: () => void

  // 슬롯 관리
  clearAllSlots: () => void

  // 썸네일 추적
  setTotalThumbnailCount: (count: number) => void
  markThumbnailLoaded: (sopInstanceUid: string) => void
  resetThumbnailTracking: () => void
}

// ==================== 컴포넌트 Props ====================

/** ViewerHeader Props */
export interface ViewerHeaderProps {
  modality?: string
  seriesDescription?: string
  displayName: string
  accentColor: ViewerAccentColor
  isLoading: boolean
  isInitialized: boolean
  layout: GridLayout
  onLayoutChange: (layout: GridLayout) => void
  onBack: () => void
}

/** ViewerFooter Props */
export interface ViewerFooterProps {
  globalFps: number
  onFpsChange: (fps: number) => void
  /** Resolution 선택 (512=PNG, 256=JPEG, 128=JPEG) */
  globalResolution?: number
  onResolutionChange?: (resolution: number) => void
  onPlayAll: () => void
  onPauseAll: () => void
  onStopAll: () => void
  accentColor: ViewerAccentColor
  displayName: string
  /** 추가 컨트롤 (예: BatchSizeTestPanel) */
  extraControls?: React.ReactNode
}

/** InstanceSidebar Props */
export interface InstanceSidebarProps<T extends BaseInstanceInfo> {
  filteredInstances: T[]
  instanceFilter: InstanceFilter
  onFilterChange: (filter: InstanceFilter) => void
  onThumbnailClick: (index: number) => void
  selectedSlot: number
  isLoading: boolean
  error: Error | null
  getThumbnailUrl: (instance: T) => string
  onThumbnailLoad: (sopInstanceUid: string) => void
  onThumbnailError: (sopInstanceUid: string) => void
  accentColor: ViewerAccentColor
  playableCount: number
  totalCount: number
}

/** ViewerGrid Props */
export interface ViewerGridProps {
  layout: GridLayout
  isInitialized: boolean
  selectedSlot: number
  onSlotClick: (slotId: number) => void
  accentColor: ViewerAccentColor
  /** Render prop으로 슬롯 컴포넌트 렌더링 */
  renderSlot: (slotId: number) => React.ReactNode
}
