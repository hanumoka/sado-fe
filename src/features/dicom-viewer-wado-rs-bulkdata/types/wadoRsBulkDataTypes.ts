/**
 * WADO-RS BulkData Multi-Slot Viewer Types
 *
 * WADO-RS BulkData 기반 멀티 슬롯 뷰어를 위한 타입 정의
 * dicom-viewer, dicom-viewer-wado-uri와 완전 독립적으로 정의
 */

// ==================== 레이아웃 타입 ====================

/**
 * 그리드 레이아웃 타입
 * 타입은 공유 GridLayout과 호환성 유지, 런타임에서 3x3까지만 제한
 * (UI에서 4x4, 5x5 버튼을 숨김으로써 실제로는 3x3까지만 사용됨)
 */
export type WadoRsBulkDataGridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '5x5'

/** 렌더링 모드 (CPU/GPU 선택) */
export type WadoRsBulkDataRenderingMode = 'cpu' | 'gpu'

// ==================== Instance 정보 ====================

/** Instance 요약 정보 (WADO-RS BulkData 멀티 슬롯 뷰어용) */
export interface WadoRsBulkDataInstanceSummary {
  sopInstanceUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  numberOfFrames: number
  patientName?: string
  modality?: string
}

// ==================== 성능 통계 ====================

/** 슬롯별 성능 통계 */
export interface WadoRsBulkDataSlotPerformanceStats {
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

/** WADO-RS BulkData 슬롯 상태 */
export interface WadoRsBulkDataSlotState {
  /** 할당된 인스턴스 */
  instance: WadoRsBulkDataInstanceSummary | null
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

  // Progressive Playback 필드
  /** 로드된 프레임 인덱스 Set (개별 프레임 추적) */
  loadedFrames: Set<number>
  /** 초기 버퍼 대기 중 여부 */
  isBuffering: boolean
  /** 로딩 중 여부 */
  loading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 메타데이터 fetch 에러 (non-fatal, fallback 값 사용 시 경고 표시) */
  metadataError: string | null
  /** 성능 통계 */
  performanceStats: WadoRsBulkDataSlotPerformanceStats

  // Stack 재로드 트리거
  /** Stack 버전 (캐시 클리어 시 증가하여 Stack 재설정 트리거) */
  stackVersion: number
}

// ==================== 프리로드 성능 ====================

/** 프리로드 성능 측정 결과 */
export interface WadoRsBulkDataPreloadPerformance {
  /** 총 로딩 시간 (ms) */
  loadTimeMs: number
  /** HTTP 요청 수 */
  requestCount: number
  /** 로드된 프레임 수 */
  framesLoaded: number
  /** 배치당 평균 시간 */
  avgTimePerBatch: number
}

// ==================== Store 상태 ====================

/** BulkData 포맷 타입 */
export type BulkDataFormat = 'rendered' | 'jpeg-baseline' | 'original' | 'raw'

/** BulkData 포맷 설정 */
export interface BulkDataFormatConfig {
  label: string
  description: string
  supportsWindowLevel: boolean
}

/** 포맷별 설정 */
export const BULK_DATA_FORMAT_CONFIG: Record<BulkDataFormat, BulkDataFormatConfig> = {
  rendered: {
    label: 'Pre-rendered',
    description: 'PNG/JPEG, Resolution 선택',
    supportsWindowLevel: false,
  },
  'jpeg-baseline': {
    label: 'JPEG Baseline',
    description: '원본 해상도 JPEG Baseline (90%, W/L 조절 가능)',
    supportsWindowLevel: true,
  },
  original: {
    label: 'Original',
    description: '원본 인코딩',
    supportsWindowLevel: true,
  },
  raw: {
    label: 'Raw',
    description: '디코딩된 픽셀',
    supportsWindowLevel: true,
  },
}

/** WADO-RS BulkData Multi Viewer 전체 상태 */
export interface WadoRsBulkDataMultiViewerState {
  /** 레이아웃 (1x1, 2x2, 3x3, 4x4) */
  layout: WadoRsBulkDataGridLayout
  /** 전역 FPS 설정 */
  globalFps: number
  /** 전역 포맷 설정 (rendered: Pre-rendered, raw: 디코딩된 픽셀, original: 원본 인코딩) */
  globalFormat: BulkDataFormat
  /** 전역 해상도 설정 (rendered 모드용, 512/256/128/64/32) */
  globalResolution: number
  /** 슬롯 상태 (최대 16개) */
  slots: Record<number, WadoRsBulkDataSlotState>
  /** 사용 가능한 인스턴스 목록 */
  availableInstances: WadoRsBulkDataInstanceSummary[]
  /** 썸네일 로딩 완료된 인스턴스 (sopInstanceUid Set) */
  thumbnailsLoaded: Set<string>
  /** 총 썸네일 개수 */
  totalThumbnailCount: number
  /** 모든 썸네일 로딩 완료 여부 */
  allThumbnailsLoaded: boolean
  /** 배치 사이즈 (프리로드 시 사용) */
  batchSize: number
  /** 프리로드 성능 측정 결과 */
  preloadPerformance: WadoRsBulkDataPreloadPerformance | null
  /** 리로딩 중 여부 */
  isReloading: boolean

  // 렌더링 모드 설정
  /** 렌더링 모드 (cpu: CPU 렌더링, gpu: GPU 렌더링) */
  renderingMode: WadoRsBulkDataRenderingMode
  /** 렌더링 모드 전환 중 여부 */
  isRenderingModeChanging: boolean
  /** GPU 렌더링 지원 여부 (WebGL2) */
  gpuSupported: boolean

  // 동기화 설정
  /** 동기화 모드 (independent, global-sync, master-slave) */
  syncMode: 'independent' | 'global-sync' | 'master-slave'
}

// ==================== 드래그 앤 드롭 ====================

/** 드래그앤드롭 데이터 */
export interface WadoRsBulkDataDragDropData {
  studyInstanceUid: string
  seriesInstanceUid: string
  sopInstanceUid: string
  instanceNumber?: number
}

// ==================== Cine 정보 ====================

/** Cine 재생 정보 (심장초음파 등) */
export interface WadoRsBulkDataCineInfo {
  sopInstanceUid: string
  numberOfFrames: number
  frameTime?: number
  cineRate?: number
  recommendedDisplayFrameRate?: number
  durationMs?: number
  hasColorDoppler?: boolean
}

/** 재생 가능한 Instance */
export interface WadoRsBulkDataPlayableInstance extends WadoRsBulkDataInstanceSummary {
  cineInfo?: WadoRsBulkDataCineInfo
  thumbnailUrl?: string
}
