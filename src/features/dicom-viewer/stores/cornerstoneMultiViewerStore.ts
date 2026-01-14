/**
 * cornerstoneMultiViewerStore.ts
 *
 * Cornerstone.js 기반 멀티 슬롯 DICOM 뷰어 상태 관리 (Zustand)
 *
 * 지원 레이아웃: 1x1, 2x2, 3x3 (최대 9개 슬롯)
 * API: WADO-RS Rendered (커스텀 로더 사용)
 *
 * mini-pacs-poc 참고
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  GridLayout,
  ApiType,
  DataSourceType,
  ResolutionMode,
  InstanceSummary,
  CornerstoneSlotState,
  CornerstoneMultiViewerState,
  SlotPerformanceStats,
} from '../types/multiSlotViewer'
import { searchInstances } from '@/lib/services/dicomWebService'
import { handleDicomError, createImageLoadError } from '@/lib/errors'
import { imageLoader } from '@cornerstonejs/core'
import { createWadoRsRenderedImageId } from '@/lib/cornerstone/wadoRsRenderedLoader'
import { prefetchAllRenderedFrames } from '../utils/wadoRsRenderedPrefetcher'
import { clearRenderedCache } from '../utils/wadoRsRenderedCache'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_STORE = true

// ==================== 초기 상태 생성 ====================

/**
 * 빈 성능 통계 생성
 */
function createEmptyPerformanceStats(): SlotPerformanceStats {
  return {
    fps: 0,
    avgFps: 0,
    frameDrops: 0,
    totalFramesRendered: 0,
    fpsHistory: [],
    lastFrameTime: 0,
  }
}

/**
 * 빈 슬롯 상태 생성
 */
function createEmptySlotState(): CornerstoneSlotState {
  return {
    instance: null,
    currentFrame: 0,
    isPlaying: false,
    isPreloading: false,
    isPreloaded: false,
    preloadProgress: 0,
    loading: false,
    error: null,
    performanceStats: createEmptyPerformanceStats(),
    // Progressive Playback 필드
    loadedFrames: new Set<number>(),
    isBuffering: false,
    // Stack 재로드 트리거
    stackVersion: 0,
  }
}

/**
 * 레이아웃별 최대 슬롯 수
 */
function getMaxSlots(layout: GridLayout): number {
  switch (layout) {
    case '1x1':
      return 1
    case '2x2':
      return 4
    case '3x3':
      return 9
    case '4x4':
      return 16
    case '5x5':
      return 25
    default:
      return 1
  }
}

/**
 * 레이아웃별 최적 해상도 반환
 *
 * 슬롯 수가 많을수록 낮은 해상도를 사용하여 네트워크 부하 감소
 * - 1x1: 512px (PNG, 최고 품질) - 평균 342KB/프레임
 * - 2x2: 256px (JPEG, 고품질) - 평균 25KB/프레임
 * - 3x3: 128px (JPEG, 중간 품질) - 평균 2.4KB/프레임
 * - 4x4: 64px (JPEG, 저품질) - 평균 1.2KB/프레임
 * - 5x5: 32px (JPEG, 최소 품질) - 평균 853Bytes/프레임
 */
function getOptimalResolutionForLayout(layout: GridLayout): number {
  switch (layout) {
    case '1x1':
      return 512  // PNG, 최고 품질
    case '2x2':
      return 256  // JPEG, 고품질
    case '3x3':
      return 128  // JPEG, 중간 품질
    case '4x4':
      return 64   // JPEG, 저품질
    case '5x5':
      return 32   // JPEG, 최소 품질 (빠른 로드)
    default:
      return 512
  }
}

// 최대 슬롯 수 (5x5 = 25)
const MAX_TOTAL_SLOTS = 25

/**
 * 초기 슬롯 상태 맵 생성 (최대 25개)
 */
function createInitialSlots(): Record<number, CornerstoneSlotState> {
  const slots: Record<number, CornerstoneSlotState> = {}
  for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
    slots[i] = createEmptySlotState()
  }
  return slots
}

// ==================== Store 인터페이스 ====================

interface CornerstoneMultiViewerActions {
  // 레이아웃 관리
  setLayout: (layout: GridLayout) => void
  setApiType: (apiType: ApiType) => void
  setDataSourceType: (dataSourceType: DataSourceType) => void
  setGlobalFps: (fps: number) => void
  setGlobalResolution: (resolution: number) => void
  setResolutionMode: (mode: ResolutionMode) => void
  getEffectiveResolution: () => number

  // 슬롯 인스턴스 관리
  assignInstanceToSlot: (slotId: number, instance: InstanceSummary) => void
  loadSlotInstance: (slotId: number, instance: InstanceSummary) => Promise<void>
  clearSlot: (slotId: number) => void
  clearAllSlots: () => void

  // 개별 슬롯 재생 제어
  playSlot: (slotId: number) => Promise<void>
  pauseSlot: (slotId: number) => void
  togglePlaySlot: (slotId: number) => Promise<void>
  setSlotFrame: (slotId: number, frameIndex: number) => void
  nextFrameSlot: (slotId: number) => void
  prevFrameSlot: (slotId: number) => void
  goToFirstFrameSlot: (slotId: number) => void
  goToLastFrameSlot: (slotId: number) => void

  // 글로벌 재생 제어
  playAll: () => Promise<void>
  pauseAll: () => void
  stopAll: () => void
  toggleGlobalPlay: () => Promise<void>

  // 프리로딩
  preloadSlotFrames: (slotId: number) => Promise<void>
  startSlotPreload: (slotId: number) => void
  updateSlotPreloadProgress: (slotId: number, progress: number) => void
  finishSlotPreload: (slotId: number) => void

  // Progressive Playback
  markFrameLoaded: (slotId: number, frameIndex: number) => void
  isFrameLoaded: (slotId: number, frameIndex: number) => boolean
  setBuffering: (slotId: number, isBuffering: boolean) => void
  getLoadedFrameCount: (slotId: number) => number

  // 성능 추적
  updateSlotPerformance: (slotId: number, fps: number, frameTime: number) => void
  resetSlotPerformance: (slotId: number) => void

  // 에러 처리
  setSlotError: (slotId: number, error: string) => void
  clearSlotError: (slotId: number) => void

  // 유틸리티
  getSlotState: (slotId: number) => CornerstoneSlotState
  getActiveSlots: () => number[]
  getMultiframeSlotIds: () => number[]

  // 중앙 집중식 애니메이션 (CineAnimationManager용)
  advanceAllPlayingFrames: () => void

  // 썸네일 로딩 추적
  setTotalThumbnailCount: (count: number) => void
  markThumbnailLoaded: (sopInstanceUid: string) => void
  resetThumbnailTracking: () => void
}

type CornerstoneMultiViewerStore = CornerstoneMultiViewerState & CornerstoneMultiViewerActions

// ==================== 헬퍼 함수 ====================

/**
 * 초기 버퍼 대기 (Progressive Playback)
 *
 * 모든 프레임 대기 대신, 초기 버퍼(예: 20프레임)만 로드되면 즉시 반환.
 * 재생 시작 시간을 대폭 단축.
 *
 * @param slotId 슬롯 ID
 * @param requiredFrames 필요한 프레임 수
 * @param get Zustand getter
 * @param timeout 최대 대기 시간 (ms), 기본 5초
 * @param pollInterval 폴링 간격 (ms), 기본 50ms
 */
/**
 * 범위 [0, maxIndex) 내에서 로드된 프레임 개수 계산
 * 병렬 배치로 인해 프레임이 순서대로 로드되지 않을 수 있으므로 연속성 대신 개수만 확인
 */
function countLoadedFramesInRange(loadedFrames: Set<number>, maxIndex: number): number {
  let count = 0
  for (let i = 0; i < maxIndex; i++) {
    if (loadedFrames.has(i)) count++
  }
  return count
}

async function waitForInitialBuffer(
  slotId: number,
  requiredFrames: number,
  get: () => CornerstoneMultiViewerStore,
  timeout = 10000, // 4x4 모드를 위해 10초로 증가
  pollInterval = 50
): Promise<void> {
  const startTime = Date.now()

  return new Promise((resolve) => {
    const checkBuffer = () => {
      const slot = get().slots[slotId]

      // 슬롯이 없거나 인스턴스가 없으면 즉시 반환
      if (!slot?.instance) {
        resolve()
        return
      }

      const numberOfFrames = slot.instance.numberOfFrames
      const bufferCheckRange = Math.min(requiredFrames, numberOfFrames)

      // 조건 1: Frame 0이 로드되어야 함 (재생 시작점)
      const hasFrame0 = slot.loadedFrames.has(0)

      // 조건 2: 범위 내 충분한 프레임이 로드되어야 함
      const loadedInRange = countLoadedFramesInRange(slot.loadedFrames, bufferCheckRange)

      // Frame 0 로드됨 + 충분한 버퍼 확보 또는 전체 로드 완료
      if ((hasFrame0 && loadedInRange >= requiredFrames) || slot.isPreloaded) {
        if (DEBUG_STORE) {
          console.log(
            `[MultiViewer] Initial buffer ready for slot ${slotId}: ` +
              `${loadedInRange}/${requiredFrames} frames in range (total: ${slot.loadedFrames.size})`
          )
        }
        resolve()
        return
      }

      // 타임아웃 체크 - Frame 0이 있으면 바로 시작
      if (Date.now() - startTime > timeout) {
        if (hasFrame0) {
          console.warn(
            `[MultiViewer] Initial buffer timeout for slot ${slotId}, ` +
              `starting with ${loadedInRange}/${requiredFrames} frames (Frame 0 ready)`
          )
        } else {
          console.warn(
            `[MultiViewer] Initial buffer timeout for slot ${slotId}, ` +
              `Frame 0 not loaded yet, starting anyway`
          )
        }
        resolve()
        return
      }

      // 계속 대기
      setTimeout(checkBuffer, pollInterval)
    }

    checkBuffer()
  })
}

// Progressive Playback 상수
const INITIAL_BUFFER_SIZE = 20 // 초기 버퍼 크기 (재생 시작 전 로드할 프레임 수)

// ==================== Store 구현 ====================

export const useCornerstoneMultiViewerStore = create<CornerstoneMultiViewerStore>()(
  persist(
    (set, get) => ({
  // 초기 상태
  layout: '1x1' as const,
  apiType: 'wado-rs' as const,
  dataSourceType: 'rendered' as DataSourceType,
  globalFps: 30,
  globalResolution: 512, // 512=PNG, 256=JPEG, 128=JPEG (auto 모드에서는 레이아웃별 자동 설정)
  resolutionMode: 'auto' as const, // 기본값: 레이아웃별 자동 해상도
  slots: createInitialSlots(),
  availableInstances: [],

  // 썸네일 로딩 추적
  thumbnailsLoaded: new Set<string>(),
  totalThumbnailCount: 0,
  allThumbnailsLoaded: false,

  // ==================== 레이아웃 관리 ====================

  setLayout: (layout) => {
    const currentLayout = get().layout
    if (currentLayout === layout) return

    const resolutionMode = get().resolutionMode

    // 1. 모든 재생 중지
    get().pauseAll()

    // 2. Rendered 캐시 클리어
    clearRenderedCache()

    // 3. Auto 모드일 때만 레이아웃별 최적 해상도 자동 설정
    const newResolution = resolutionMode === 'auto'
      ? getOptimalResolutionForLayout(layout)
      : get().globalResolution

    // 4. 모든 슬롯 전체 리셋 (캐시와 상태 동기화)
    // 캐시 클리어 시 loadedFrames도 함께 리셋하여 캐시-상태 불일치 방지
    // stackVersion 증가로 Stack 재설정 트리거
    const slots = get().slots
    const resetSlots: Record<number, CornerstoneSlotState> = {}
    for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
      if (slots[i]) {
        resetSlots[i] = {
          ...slots[i],
          isPreloading: false,
          isPreloaded: false,
          preloadProgress: 0,
          currentFrame: 0,
          loadedFrames: new Set<number>(),
          isBuffering: false,
          isPlaying: false,
          stackVersion: (slots[i].stackVersion ?? 0) + 1,
        }
      }
    }

    set({
      layout,
      globalResolution: newResolution,
      slots: resetSlots
    })

    if (DEBUG_STORE) {
      console.log(`[MultiViewer] Layout changed: ${currentLayout} → ${layout}, mode: ${resolutionMode}, resolution: ${newResolution}px`)
    }
  },

  setApiType: (apiType) => {
    set({ apiType })
  },

  /**
   * 데이터 소스 타입 변경
   * rendered: Pre-rendered JPEG/PNG (빠른 로딩)
   * original: 원본 Transfer Syntax 유지 (진단용)
   * raw: 디코딩된 픽셀 데이터 (W/L 조절 가능)
   */
  setDataSourceType: (dataSourceType) => {
    const currentDataSourceType = get().dataSourceType
    if (currentDataSourceType === dataSourceType) return

    // 1. 모든 재생 중지
    get().pauseAll()

    // 2. Rendered 캐시 클리어 (로더 변경)
    clearRenderedCache()

    // 3. 모든 슬롯 리셋 (캐시와 상태 동기화)
    // stackVersion 증가로 Stack 재설정 트리거
    const slots = get().slots
    const resetSlots: Record<number, CornerstoneSlotState> = {}
    for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
      if (slots[i]) {
        resetSlots[i] = {
          ...slots[i],
          isPreloading: false,
          isPreloaded: false,
          preloadProgress: 0,
          currentFrame: 0,
          loadedFrames: new Set<number>(),
          isBuffering: false,
          isPlaying: false,
          stackVersion: (slots[i].stackVersion ?? 0) + 1,
        }
      }
    }

    set({ dataSourceType, slots: resetSlots })

    if (DEBUG_STORE) {
      console.log(`[MultiViewer] Data source changed: ${currentDataSourceType} → ${dataSourceType}`)
    }
  },

  setGlobalFps: (fps) => {
    set({ globalFps: Math.max(1, Math.min(120, fps)) })
  },

  setGlobalResolution: (resolution) => {
    // 유효한 해상도만 허용 (512, 256, 128, 64, 32)
    const validResolutions = [512, 256, 128, 64, 32]
    if (!validResolutions.includes(resolution)) return

    const currentResolution = get().globalResolution
    const currentMode = get().resolutionMode

    // 같은 해상도면서 이미 manual 모드면 무시
    if (currentResolution === resolution && currentMode === 'manual') return

    // 1. 모든 재생 중지
    get().pauseAll()

    // 2. Rendered 캐시 클리어 (resolution이 캐시 키에 포함됨)
    clearRenderedCache()

    // 3. 모든 슬롯 프리로드 상태 리셋 (resolution 변경은 전체 리셋 필요)
    // stackVersion 증가로 Stack 재설정 트리거
    const slots = get().slots
    const resetSlots: Record<number, CornerstoneSlotState> = {}
    for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
      if (slots[i]) {
        resetSlots[i] = {
          ...slots[i],
          isPreloading: false,
          isPreloaded: false,
          preloadProgress: 0,
          currentFrame: 0,
          loadedFrames: new Set<number>(),
          isBuffering: false,
          isPlaying: false,
          stackVersion: (slots[i].stackVersion ?? 0) + 1,
        }
      }
    }

    // 수동 해상도 선택 시 manual 모드로 전환
    set({
      globalResolution: resolution,
      resolutionMode: 'manual',
      slots: resetSlots
    })

    if (DEBUG_STORE) {
      console.log(`[MultiViewer] Resolution manually set to ${resolution}px (mode: manual)`)
    }
  },

  /**
   * 해상도 모드 설정
   * auto: 레이아웃별 자동 해상도
   * manual: 수동 선택 해상도 유지
   */
  setResolutionMode: (mode) => {
    const currentMode = get().resolutionMode
    if (currentMode === mode) return

    if (mode === 'auto') {
      // Auto 모드로 전환 시 현재 레이아웃에 맞는 해상도로 변경
      const layout = get().layout
      const optimalResolution = getOptimalResolutionForLayout(layout)
      const currentResolution = get().globalResolution

      // 해상도가 변경되는 경우에만 캐시 클리어 및 슬롯 리셋
      if (currentResolution !== optimalResolution) {
        get().pauseAll()
        clearRenderedCache()

        const slots = get().slots
        const resetSlots: Record<number, CornerstoneSlotState> = {}
        for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
          if (slots[i]) {
            resetSlots[i] = {
              ...slots[i],
              isPreloading: false,
              isPreloaded: false,
              preloadProgress: 0,
              currentFrame: 0,
              loadedFrames: new Set<number>(),
              isBuffering: false,
              isPlaying: false,
              stackVersion: (slots[i].stackVersion ?? 0) + 1,
            }
          }
        }

        set({
          resolutionMode: mode,
          globalResolution: optimalResolution,
          slots: resetSlots
        })
      } else {
        set({ resolutionMode: mode })
      }

      if (DEBUG_STORE) {
        console.log(`[MultiViewer] Resolution mode set to auto (layout: ${layout}, resolution: ${optimalResolution}px)`)
      }
    } else {
      // Manual 모드로 전환 (현재 해상도 유지)
      set({ resolutionMode: mode })

      if (DEBUG_STORE) {
        console.log(`[MultiViewer] Resolution mode set to manual (resolution: ${get().globalResolution}px)`)
      }
    }
  },

  /**
   * 현재 유효 해상도 반환
   * auto 모드: 레이아웃별 최적 해상도
   * manual 모드: globalResolution
   */
  getEffectiveResolution: () => {
    const { resolutionMode, layout, globalResolution } = get()
    return resolutionMode === 'auto'
      ? getOptimalResolutionForLayout(layout)
      : globalResolution
  },

  // ==================== 슬롯 인스턴스 관리 ====================

  /**
   * 슬롯에 인스턴스 할당 (즉시 로딩)
   */
  assignInstanceToSlot: (slotId, instance) => {
    const maxSlots = getMaxSlots(get().layout)
    if (slotId < 0 || slotId >= maxSlots) {
      console.warn(`[MultiViewer] Invalid slot ID: ${slotId}`)
      return
    }

    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...createEmptySlotState(),
          instance,
          loading: true,
        },
      },
    }))

    // 자동 로딩
    get().loadSlotInstance(slotId, instance)
  },

  /**
   * 슬롯 인스턴스 메타데이터 로드
   */
  loadSlotInstance: async (slotId, instance) => {
    const { sopInstanceUid, studyInstanceUid, seriesInstanceUid } = instance

    try {
      // 로딩 시작
      set((state) => ({
        slots: {
          ...state.slots,
          [slotId]: {
            ...state.slots[slotId],
            loading: true,
            error: null,
          },
        },
      }))

      // QIDO-RS로 인스턴스 메타데이터 조회
      const instances = await searchInstances(studyInstanceUid, seriesInstanceUid, {
        SOPInstanceUID: sopInstanceUid,
      })

      if (instances.length === 0) {
        throw createImageLoadError('Instance not found', sopInstanceUid)
      }

      const instanceData = instances[0]
      const numberOfFrames = instanceData.numberOfFrames || 1

      // 인스턴스 정보 업데이트
      const updatedInstance: InstanceSummary = {
        ...instance,
        numberOfFrames,
      }

      set((state) => ({
        slots: {
          ...state.slots,
          [slotId]: {
            ...state.slots[slotId],
            instance: updatedInstance,
            currentFrame: 0,
            loading: false,
            error: null,
          },
        },
      }))

      if (DEBUG_STORE) console.log(`[MultiViewer] Loaded instance to slot ${slotId}:`, updatedInstance)

      // 멀티프레임인 경우 자동 프리페치 시작 (백그라운드)
      // Play All 클릭 전에 미리 로드하여 즉시 재생 가능하도록 함
      if (numberOfFrames > 1) {
        if (DEBUG_STORE) console.log(`[MultiViewer] Auto-starting preload for slot ${slotId} (${numberOfFrames} frames)`)
        get().preloadSlotFrames(slotId).catch((error) => {
          // 프리페치 실패는 치명적이지 않음 - Play 시 다시 시도됨
          console.warn(`[MultiViewer] Auto preload failed for slot ${slotId}:`, error)
        })
      }
    } catch (error) {
      const errorMessage = handleDicomError(error, 'loadSlotInstance')

      set((state) => ({
        slots: {
          ...state.slots,
          [slotId]: {
            ...state.slots[slotId],
            loading: false,
            error: errorMessage,
          },
        },
      }))
    }
  },

  /**
   * 슬롯 초기화
   */
  clearSlot: (slotId) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: createEmptySlotState(),
      },
    }))
  },

  /**
   * 모든 슬롯 초기화
   */
  clearAllSlots: () => {
    set({
      slots: createInitialSlots(),
    })
  },

  // ==================== 개별 슬롯 재생 제어 ====================

  /**
   * 슬롯 재생 시작 (Progressive Playback)
   *
   * 기존: 모든 프레임 로드 완료까지 대기 (5-10초+)
   * 개선: 초기 버퍼만 로드 후 즉시 재생 시작 (1-2초)
   *
   * 1. 프리로드 시작 (백그라운드)
   * 2. 초기 버퍼만 대기 (20프레임 또는 전체 프레임 중 작은 값)
   * 3. 즉시 재생 시작
   * 4. 나머지 프레임은 백그라운드에서 계속 로드
   */
  playSlot: async (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance || slot.instance.numberOfFrames <= 1) {
      console.warn(`[MultiViewer] Cannot play slot ${slotId}: no multiframe instance`)
      return
    }

    const numberOfFrames = slot.instance.numberOfFrames
    // 초기 버퍼 크기 (전체 프레임 수와 INITIAL_BUFFER_SIZE 중 작은 값)
    const initialBuffer = Math.min(INITIAL_BUFFER_SIZE, numberOfFrames)

    if (DEBUG_STORE) {
      console.log(
        `[MultiViewer] Progressive playSlot for slot ${slotId}: ` +
          `totalFrames=${numberOfFrames}, initialBuffer=${initialBuffer}, ` +
          `loadedFrames=${slot.loadedFrames.size}`
      )
    }

    // 1. 프리로드가 시작되지 않았으면 시작 (백그라운드에서 계속 진행)
    if (!slot.isPreloaded && !slot.isPreloading) {
      if (DEBUG_STORE) console.log(`[MultiViewer] Starting progressive preload for slot ${slotId}`)
      // 비동기로 시작 (await 없이) - 백그라운드에서 계속 로드
      // .catch()로 에러 핸들링하여 실행 보장
      get().preloadSlotFrames(slotId).catch((error) => {
        console.warn(`[MultiViewer] Background preload failed for slot ${slotId}:`, error)
      })
    }

    // 2. 초기 버퍼만 대기 (전체 대기 X)
    if (slot.loadedFrames.size < initialBuffer && !slot.isPreloaded) {
      if (DEBUG_STORE) {
        console.log(
          `[MultiViewer] Waiting for initial buffer: ${slot.loadedFrames.size}/${initialBuffer} frames`
        )
      }
      await waitForInitialBuffer(slotId, initialBuffer, get)
    }

    // 3. 즉시 재생 시작
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isPlaying: true,
          isBuffering: false,
        },
      },
    }))

    if (DEBUG_STORE) {
      const updatedSlot = get().slots[slotId]
      console.log(
        `[MultiViewer] Playback started for slot ${slotId}: ` +
          `loadedFrames=${updatedSlot?.loadedFrames.size}/${numberOfFrames}`
      )
    }
  },

  pauseSlot: (slotId) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isPlaying: false,
        },
      },
    }))
  },

  togglePlaySlot: async (slotId) => {
    const slot = get().slots[slotId]
    if (!slot) return

    if (slot.isPlaying) {
      get().pauseSlot(slotId)
    } else {
      await get().playSlot(slotId)
    }
  },

  setSlotFrame: (slotId, frameIndex) => {
    const slot = get().slots[slotId]
    if (!slot?.instance) return

    const maxFrame = slot.instance.numberOfFrames - 1
    const validFrame = Math.max(0, Math.min(frameIndex, maxFrame))

    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          currentFrame: validFrame,
        },
      },
    }))
  },

  nextFrameSlot: (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance) return

    const totalFrames = slot.instance.numberOfFrames
    // 모듈로 연산으로 루프 재생 (마지막 프레임 다음 → 첫 프레임)
    const nextFrame = (slot.currentFrame + 1) % totalFrames

    get().setSlotFrame(slotId, nextFrame)
  },

  prevFrameSlot: (slotId) => {
    const slot = get().slots[slotId]
    if (!slot) return

    const prevFrame = Math.max(slot.currentFrame - 1, 0)
    get().setSlotFrame(slotId, prevFrame)
  },

  goToFirstFrameSlot: (slotId) => {
    get().setSlotFrame(slotId, 0)
  },

  goToLastFrameSlot: (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance) return

    const lastFrame = slot.instance.numberOfFrames - 1
    get().setSlotFrame(slotId, lastFrame)
  },

  // ==================== 글로벌 재생 제어 ====================

  playAll: async () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)

    // 1. 멀티프레임 슬롯 ID 수집
    const multiframeSlotIds: number[] = []
    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      if (slot?.instance && slot.instance.numberOfFrames > 1) {
        multiframeSlotIds.push(i)
      }
    }

    if (multiframeSlotIds.length === 0) {
      console.warn('[MultiViewer] No multiframe slots to play')
      return
    }

    // 2. 동시 프리로드 슬롯 수 제한 (서버 부하 관리)
    const CONCURRENT_SLOT_PRELOADS = 4 // 4개 슬롯씩 순차적으로 프리로드
    const INITIAL_BUFFER_SIZE = 20

    if (DEBUG_STORE) console.log(`[MultiViewer] Starting controlled preload for ${multiframeSlotIds.length} slots (concurrent: ${CONCURRENT_SLOT_PRELOADS})`)

    // 3. 슬롯을 그룹으로 나누어 순차적으로 프리로드 + 재생 시작
    for (let i = 0; i < multiframeSlotIds.length; i += CONCURRENT_SLOT_PRELOADS) {
      const currentBatch = multiframeSlotIds.slice(i, i + CONCURRENT_SLOT_PRELOADS)

      if (DEBUG_STORE) console.log(`[MultiViewer] Processing slot batch: [${currentBatch.join(', ')}]`)

      // 3.1 현재 배치의 슬롯들 프리로드 시작 (백그라운드)
      for (const slotId of currentBatch) {
        const slot = get().slots[slotId]
        // 이미 완료되었거나 진행 중이면 스킵
        if (slot?.isPreloaded || slot?.isPreloading) {
          if (DEBUG_STORE) console.log(`[MultiViewer] Slot ${slotId} already preloaded/preloading, skipping`)
          continue
        }

        // 백그라운드 프리로드 시작 (await 없음!)
        get().preloadSlotFrames(slotId).catch((error) => {
          console.warn(`[playAll] Background preload failed for slot ${slotId}:`, error)
        })
      }

      // 3.2 현재 배치의 초기 버퍼 대기 후 재생 시작 (병렬)
      await Promise.all(
        currentBatch.map(async (slotId) => {
          const slot = get().slots[slotId]
          if (!slot?.instance) return

          const numberOfFrames = slot.instance.numberOfFrames
          const initialBuffer = Math.min(INITIAL_BUFFER_SIZE, numberOfFrames)

          // 초기 버퍼만 대기 (전체 프리로드 아님)
          if (slot.loadedFrames.size < initialBuffer && !slot.isPreloaded) {
            await waitForInitialBuffer(slotId, initialBuffer, get)
          }

          // 해당 슬롯 즉시 재생 시작
          set((state) => ({
            slots: {
              ...state.slots,
              [slotId]: {
                ...state.slots[slotId],
                isPlaying: true,
              },
            },
          }))

          if (DEBUG_STORE) console.log(`[MultiViewer] Slot ${slotId} started playing`)
        })
      )
    }

    if (DEBUG_STORE) console.log(`[MultiViewer] playAll completed for ${multiframeSlotIds.length} slots`)
  },

  pauseAll: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)
    const updatedSlots: Record<number, CornerstoneSlotState> = {}

    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      if (slot) {
        updatedSlots[i] = {
          ...slot,
          isPlaying: false,
        }
      }
    }

    set((state) => ({
      slots: {
        ...state.slots,
        ...updatedSlots,
      },
    }))
  },

  /**
   * 전체 정지 (일시정지 + 첫 프레임으로 이동)
   */
  stopAll: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)
    const updatedSlots: Record<number, CornerstoneSlotState> = {}

    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      if (slot) {
        updatedSlots[i] = {
          ...slot,
          isPlaying: false,
          currentFrame: 0,  // 첫 프레임으로 리셋
        }
      }
    }

    set((state) => ({
      slots: {
        ...state.slots,
        ...updatedSlots,
      },
    }))
  },

  toggleGlobalPlay: async () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)

    // 현재 재생 중인 슬롯이 하나라도 있으면 전체 일시정지, 없으면 전체 재생
    const isAnyPlaying = Array.from({ length: maxSlots }, (_, i) => slots[i]).some(
      (slot) => slot?.isPlaying
    )

    if (isAnyPlaying) {
      get().pauseAll()
    } else {
      await get().playAll()
    }
  },

  // ==================== 프리로딩 ====================

  /**
   * 슬롯의 모든 프레임 프리로드 (2단계 최적화 + Progressive Playback)
   *
   * Phase 1: 배치 API로 PNG 프리페치 (0-50%)
   *   - /frames/1,2,3.../rendered 배치 요청 (3개 배치 병렬)
   *   - Rendered 캐시에 PNG 데이터 저장
   *   - 개별 프레임 로드 시 loadedFrames 업데이트 (Progressive Playback 지원)
   *
   * Phase 2: Cornerstone 로드 (50-100%)
   *   - imageLoader.loadImage() 호출 (병렬 배치)
   *   - Rendered Interceptor가 캐시에서 데이터 반환 (캐시 히트)
   */
  preloadSlotFrames: async (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance) {
      console.warn(`[MultiViewer] Cannot preload slot ${slotId}: no instance`)
      return
    }

    if (slot.isPreloading || slot.isPreloaded) {
      if (DEBUG_STORE) console.log(`[MultiViewer] Slot ${slotId} already preloading or preloaded`)
      return
    }

    const { numberOfFrames } = slot.instance
    if (numberOfFrames <= 1) {
      // 싱글 프레임은 프리로드 불필요 (프레임 0을 로드됨으로 마킹)
      get().markFrameLoaded(slotId, 0)
      get().finishSlotPreload(slotId)
      return
    }

    get().startSlotPreload(slotId)

    try {
      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid } = slot.instance
      const PREFETCH_BATCH_SIZE = 50 // 배치 API 최적 크기 (10 → 50으로 증가, 네트워크 요청 감소)
      const CORNERSTONE_CONCURRENT_BATCHES = 4 // Phase 2 동시 배치 수 (2 → 4로 증가)
      const CORNERSTONE_BATCH_SIZE = 50 // Phase 2 배치 크기 (10 → 50으로 증가, imageLoader 호출 횟수 감소)

      if (DEBUG_STORE) console.log(`[MultiViewer] 2-Phase preload for slot ${slotId}: ${numberOfFrames} frames`)

      // ==================== Phase 1: 배치 API로 PNG/JPEG 프리페치 (0-50%) ====================
      const resolution = get().globalResolution
      if (DEBUG_STORE) console.log(`[MultiViewer] Phase 1: Batch API prefetch for slot ${slotId}, resolution=${resolution}`)

      await prefetchAllRenderedFrames(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames,
        PREFETCH_BATCH_SIZE,
        (loaded, total) => {
          // 0-50% 진행률
          const progress = Math.round((loaded / total) * 50)
          get().updateSlotPreloadProgress(slotId, progress)
        },
        // onFrameLoaded 콜백: loadedFrames 업데이트 (Progressive Playback)
        (frameIndex) => {
          get().markFrameLoaded(slotId, frameIndex)
        },
        resolution
      )

      if (DEBUG_STORE) console.log(`[MultiViewer] Phase 1 complete: PNG data cached for slot ${slotId}`)

      // ==================== Phase 2: Cornerstone 로드 (50-100%) - 병렬 배치 ====================
      if (DEBUG_STORE) console.log(`[MultiViewer] Phase 2: Cornerstone load for slot ${slotId}`)
      let loadedCount = 0

      // 모든 배치 생성
      const allBatches: number[][] = []
      for (let i = 0; i < numberOfFrames; i += CORNERSTONE_BATCH_SIZE) {
        const batch: number[] = []
        for (let j = i; j < Math.min(i + CORNERSTONE_BATCH_SIZE, numberOfFrames); j++) {
          batch.push(j)
        }
        allBatches.push(batch)
      }

      // N개 배치씩 병렬 처리
      for (let i = 0; i < allBatches.length; i += CORNERSTONE_CONCURRENT_BATCHES) {
        const concurrentBatches = allBatches.slice(i, i + CORNERSTONE_CONCURRENT_BATCHES)

        await Promise.all(
          concurrentBatches.map((batchFrames) =>
            Promise.all(
              batchFrames.map((frameIndex) => {
                const imageId = createWadoRsRenderedImageId(
                  studyInstanceUid,
                  seriesInstanceUid,
                  sopInstanceUid,
                  frameIndex, // 0-based frame number
                  resolution
                )

                return imageLoader
                  .loadImage(imageId)
                  .then(() => {
                    loadedCount++
                    // Progressive Playback: 로드된 프레임 추적
                    get().markFrameLoaded(slotId, frameIndex)
                    // 50-100% 진행률
                    const progress = 50 + Math.round((loadedCount / numberOfFrames) * 50)
                    get().updateSlotPreloadProgress(slotId, progress)
                  })
                  .catch((error: unknown) => {
                    console.warn(`[MultiViewer] Failed to load frame ${frameIndex} for slot ${slotId}:`, error)
                    loadedCount++
                    // 실패해도 프레임 추적 (재시도 가능하도록)
                    // Note: 실패한 프레임은 markFrameLoaded 하지 않음
                    const progress = 50 + Math.round((loadedCount / numberOfFrames) * 50)
                    get().updateSlotPreloadProgress(slotId, progress)
                  })
              })
            )
          )
        )
      }

      get().finishSlotPreload(slotId)
      if (DEBUG_STORE) console.log(`[MultiViewer] 2-Phase preload completed for slot ${slotId}`)
    } catch (error) {
      const errorMessage = handleDicomError(error, 'preloadSlotFrames')
      get().setSlotError(slotId, errorMessage)

      // 프리로딩 실패 시 상태 초기화
      set((state) => ({
        slots: {
          ...state.slots,
          [slotId]: {
            ...state.slots[slotId],
            isPreloading: false,
            isPreloaded: false,
            preloadProgress: 0,
          },
        },
      }))
    }
  },

  startSlotPreload: (slotId) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isPreloading: true,
          preloadProgress: 0,
          isPreloaded: false,
        },
      },
    }))
  },

  updateSlotPreloadProgress: (slotId, progress) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          preloadProgress: Math.max(0, Math.min(100, progress)),
        },
      },
    }))
  },

  finishSlotPreload: (slotId) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isPreloading: false,
          isPreloaded: true,
          preloadProgress: 100,
        },
      },
    }))
  },

  // ==================== Progressive Playback ====================

  /**
   * 프레임 로드 완료 마킹
   * Phase 1에서 개별 프레임이 캐시되면 호출됨
   */
  markFrameLoaded: (slotId, frameIndex) => {
    const slot = get().slots[slotId]
    if (!slot) return

    // 이미 로드된 프레임이면 무시
    if (slot.loadedFrames.has(frameIndex)) return

    // 새 Set 생성 (immutable update)
    const newLoadedFrames = new Set(slot.loadedFrames)
    newLoadedFrames.add(frameIndex)

    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          loadedFrames: newLoadedFrames,
        },
      },
    }))
  },

  /**
   * 프레임 로드 여부 확인
   */
  isFrameLoaded: (slotId, frameIndex) => {
    const slot = get().slots[slotId]
    if (!slot) return false
    return slot.loadedFrames.has(frameIndex) || slot.isPreloaded
  },

  /**
   * 버퍼링 상태 설정
   */
  setBuffering: (slotId, isBuffering) => {
    const slot = get().slots[slotId]
    if (!slot || slot.isBuffering === isBuffering) return

    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isBuffering,
        },
      },
    }))
  },

  /**
   * 로드된 프레임 수 반환
   */
  getLoadedFrameCount: (slotId) => {
    const slot = get().slots[slotId]
    if (!slot) return 0
    if (slot.isPreloaded) return slot.instance?.numberOfFrames || 0
    return slot.loadedFrames.size
  },

  // ==================== 성능 추적 ====================

  /**
   * 슬롯 성능 통계 업데이트
   */
  updateSlotPerformance: (slotId, fps, frameTime) => {
    const slot = get().slots[slotId]
    if (!slot) return

    const stats = slot.performanceStats
    const newFpsHistory = [...stats.fpsHistory, fps].slice(-30) // 최근 30개 유지
    const avgFps = newFpsHistory.reduce((sum, val) => sum + val, 0) / newFpsHistory.length

    // 프레임 드롭 감지 (FPS가 목표의 70% 미만이면 드롭으로 간주)
    const targetFps = get().globalFps
    const frameDrops = fps < targetFps * 0.7 ? stats.frameDrops + 1 : stats.frameDrops

    const updatedStats: SlotPerformanceStats = {
      fps,
      avgFps: Math.round(avgFps * 10) / 10,
      frameDrops,
      totalFramesRendered: stats.totalFramesRendered + 1,
      fpsHistory: newFpsHistory,
      lastFrameTime: frameTime,
    }

    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          performanceStats: updatedStats,
        },
      },
    }))
  },

  resetSlotPerformance: (slotId) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          performanceStats: createEmptyPerformanceStats(),
        },
      },
    }))
  },

  // ==================== 에러 처리 ====================

  setSlotError: (slotId, error) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          error,
          loading: false,
        },
      },
    }))
  },

  clearSlotError: (slotId) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          error: null,
        },
      },
    }))
  },

  // ==================== 유틸리티 ====================

  getSlotState: (slotId) => {
    return get().slots[slotId] || createEmptySlotState()
  },

  getActiveSlots: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)
    const activeSlots: number[] = []

    for (let i = 0; i < maxSlots; i++) {
      if (slots[i]?.instance) {
        activeSlots.push(i)
      }
    }

    return activeSlots
  },

  getMultiframeSlotIds: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)
    const multiframeSlots: number[] = []

    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      if (slot?.instance && slot.instance.numberOfFrames > 1) {
        multiframeSlots.push(i)
      }
    }

    return multiframeSlots
  },

  // ==================== 중앙 집중식 애니메이션 ====================

  /**
   * 모든 재생 중인 슬롯의 프레임을 한 번에 업데이트 (CineAnimationManager용)
   *
   * 기존 문제:
   * - 각 슬롯이 독립적인 rAF 루프에서 nextFrameSlot() 호출
   * - 각 호출마다 Zustand set() → 개별 리렌더링 발생
   *
   * 해결:
   * - 모든 재생 중인 슬롯의 프레임을 한 번의 set()으로 배칭 업데이트
   * - 리렌더링 1회로 최소화
   */
  advanceAllPlayingFrames: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)

    // 재생 중인 슬롯의 프레임 업데이트 수집
    const updatedSlots: Record<number, CornerstoneSlotState> = {}
    let hasChanges = false

    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      if (slot?.isPlaying && slot.instance && slot.instance.numberOfFrames > 1) {
        const nextFrame = (slot.currentFrame + 1) % slot.instance.numberOfFrames
        updatedSlots[i] = {
          ...slot,
          currentFrame: nextFrame,
        }
        hasChanges = true
      }
    }

    // 변경사항이 있을 때만 단일 set() 호출 (배칭)
    if (hasChanges) {
      set((state) => ({
        slots: {
          ...state.slots,
          ...updatedSlots,
        },
      }))
    }
  },

  // ==================== 썸네일 로딩 추적 ====================

  /**
   * 총 썸네일 개수 설정 (페이지 로드 시 호출)
   */
  setTotalThumbnailCount: (count) => {
    set({
      totalThumbnailCount: count,
      thumbnailsLoaded: new Set<string>(),
      allThumbnailsLoaded: count === 0, // 0개면 즉시 완료
    })
    if (DEBUG_STORE) console.log(`[MultiViewer] Thumbnail tracking started: expecting ${count} thumbnails`)
  },

  /**
   * 썸네일 로드 완료 마킹 (onLoad/onError 시 호출)
   */
  markThumbnailLoaded: (sopInstanceUid) => {
    const { thumbnailsLoaded, totalThumbnailCount } = get()

    // 이미 마킹된 경우 무시
    if (thumbnailsLoaded.has(sopInstanceUid)) return

    const newSet = new Set(thumbnailsLoaded)
    newSet.add(sopInstanceUid)

    const allLoaded = newSet.size >= totalThumbnailCount

    set({
      thumbnailsLoaded: newSet,
      allThumbnailsLoaded: allLoaded,
    })

    if (allLoaded) {
      if (DEBUG_STORE) console.log(`[MultiViewer] All thumbnails loaded (${newSet.size}/${totalThumbnailCount}), preloading can start`)
    }
  },

  /**
   * 썸네일 추적 리셋 (페이지 이동 시)
   */
  resetThumbnailTracking: () => {
    set({
      thumbnailsLoaded: new Set<string>(),
      totalThumbnailCount: 0,
      allThumbnailsLoaded: false,
    })
  },
    }),
    {
      name: 'cornerstone-viewer-settings',
      storage: createJSONStorage(() => sessionStorage),
      // 세션 스토리지에 저장할 상태만 선택 (설정 값만)
      partialize: (state) => ({
        layout: state.layout,
        apiType: state.apiType,
        dataSourceType: state.dataSourceType,
        globalFps: state.globalFps,
        globalResolution: state.globalResolution,
        resolutionMode: state.resolutionMode,
      }),
      // 상태 복원 시 저장된 값으로 덮어쓰기
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<CornerstoneMultiViewerState>),
      }),
      // 복원 완료 시 로그 (디버깅용)
      onRehydrateStorage: () => (state) => {
        if (DEBUG_STORE && state) {
          console.log('[MultiViewer] Restored from session storage:', {
            layout: state.layout,
            apiType: state.apiType,
            dataSourceType: state.dataSourceType,
            globalFps: state.globalFps,
            globalResolution: state.globalResolution,
            resolutionMode: state.resolutionMode,
          })
        }
      },
    }
  )
)
