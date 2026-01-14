/**
 * Multi-Slot Viewer Types
 *
 * Cornerstone.js 기반 멀티 슬롯 뷰어를 위한 타입 정의
 * mini-pacs-poc 참고
 */

// ==================== 레이아웃 타입 ====================

/** 그리드 레이아웃 타입 (1x1, 2x2, 3x3, 4x4, 5x5) */
export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '5x5'

/** API 타입 (DICOM 이미지 로딩 방식) - deprecated, use DataSourceType */
export type ApiType = 'wado-rs' | 'wado-uri'

/** 데이터 소스 타입 (이미지 로딩 소스 선택) */
export type DataSourceType = 'rendered' | 'original' | 'raw'

/** 데이터 소스 설정 */
export interface DataSourceConfig {
  label: string
  description: string
  loaderScheme: string
  supportsWindowLevel: boolean
}

/** 데이터 소스별 설정 */
export const DATA_SOURCE_CONFIG: Record<DataSourceType, DataSourceConfig> = {
  rendered: {
    label: 'Pre-rendered (Fast)',
    description: 'JPEG/PNG, 빠른 로딩',
    loaderScheme: 'wadors-rendered',
    supportsWindowLevel: false,
  },
  original: {
    label: 'Original (Quality)',
    description: '원본 Transfer Syntax 유지',
    loaderScheme: 'wadors',
    supportsWindowLevel: true,
  },
  raw: {
    label: 'Raw (Accurate)',
    description: '디코딩된 픽셀, W/L 조절 가능',
    loaderScheme: 'wadors',
    supportsWindowLevel: true,
  },
}

// ==================== Instance 정보 ====================

/** Instance 요약 정보 (멀티 슬롯 뷰어용) */
export interface InstanceSummary {
  sopInstanceUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  numberOfFrames: number
  patientName?: string
  modality?: string
}

// ==================== 성능 통계 ====================

/** 슬롯별 성능 통계 */
export interface SlotPerformanceStats {
  /** 현재 FPS */
  fps: number
  /** 평균 FPS */
  avgFps: number
  /** 프레임 드롭 횟수 */
  frameDrops: number
  /** 렌더링된 총 프레임 수 */
  totalFramesRendered: number
  /** FPS 히스토리 (최근 30개) */
  fpsHistory: number[]
  /** 마지막 프레임 시간 */
  lastFrameTime: number
}

// ==================== 슬롯 상태 ====================

/** Cornerstone 슬롯 상태 */
export interface CornerstoneSlotState {
  /** 할당된 인스턴스 */
  instance: InstanceSummary | null
  /** 현재 프레임 인덱스 (0-based) */
  currentFrame: number
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 프리로딩 중 여부 */
  isPreloading: boolean
  /** 프리로드 완료 여부 */
  isPreloaded: boolean
  /** 프리로드 진행률 (0-100) */
  preloadProgress: number
  /** 로딩 중 여부 */
  loading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 성능 통계 */
  performanceStats: SlotPerformanceStats

  // Progressive Playback 지원 필드
  /** 로드 완료된 프레임 번호 Set (0-based) */
  loadedFrames: Set<number>
  /** 버퍼링 중 여부 (재생 일시 중단) */
  isBuffering: boolean

  // Stack 재로드 트리거
  /** Stack 버전 (캐시 클리어 시 증가하여 Stack 재설정 트리거) */
  stackVersion: number
}

// ==================== Store 상태 ====================

/** 해상도 모드 (auto: 레이아웃별 자동, manual: 수동 선택) */
export type ResolutionMode = 'auto' | 'manual'

/** Cornerstone Multi Viewer 전체 상태 */
export interface CornerstoneMultiViewerState {
  /** 레이아웃 (1x1, 2x2, 3x3) */
  layout: GridLayout
  /** API 타입 - deprecated, use dataSourceType */
  apiType: ApiType
  /** 데이터 소스 타입 (rendered/original/raw) */
  dataSourceType: DataSourceType
  /** 전역 FPS 설정 */
  globalFps: number
  /** 전역 해상도 설정 (512=PNG, 256=JPEG, 128=JPEG) */
  globalResolution: number
  /** 해상도 모드 (auto: 레이아웃별 자동, manual: 수동 선택) */
  resolutionMode: ResolutionMode
  /** 슬롯 상태 (최대 16개) */
  slots: Record<number, CornerstoneSlotState>
  /** 사용 가능한 인스턴스 목록 */
  availableInstances: InstanceSummary[]
  /** 썸네일 로딩 완료된 인스턴스 (sopInstanceUid Set) */
  thumbnailsLoaded: Set<string>
  /** 총 썸네일 개수 */
  totalThumbnailCount: number
  /** 모든 썸네일 로딩 완료 여부 */
  allThumbnailsLoaded: boolean
}

// ==================== 드래그 앤 드롭 ====================

/** 드래그앤드롭 데이터 */
export interface DragDropInstanceData {
  studyInstanceUid: string
  seriesInstanceUid: string
  sopInstanceUid: string
  instanceNumber?: number
}

// ==================== Cine 정보 ====================

/** Cine 재생 정보 (심장초음파 등) */
export interface CineInfo {
  sopInstanceUid: string
  numberOfFrames: number
  frameTime?: number
  cineRate?: number
  recommendedDisplayFrameRate?: number
  durationMs?: number
  hasColorDoppler?: boolean
}

/** 재생 가능한 Instance */
export interface PlayableInstance extends InstanceSummary {
  cineInfo?: CineInfo
  thumbnailUrl?: string
}
