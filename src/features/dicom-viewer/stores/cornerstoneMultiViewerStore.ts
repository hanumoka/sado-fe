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
import type {
  GridLayout,
  ApiType,
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
    default:
      return 1
  }
}

/**
 * 초기 슬롯 상태 맵 생성 (최대 16개)
 */
function createInitialSlots(): Record<number, CornerstoneSlotState> {
  const slots: Record<number, CornerstoneSlotState> = {}
  for (let i = 0; i < 16; i++) {
    slots[i] = createEmptySlotState()
  }
  return slots
}

// ==================== Store 인터페이스 ====================

interface CornerstoneMultiViewerActions {
  // 레이아웃 관리
  setLayout: (layout: GridLayout) => void
  setApiType: (apiType: ApiType) => void
  setGlobalFps: (fps: number) => void

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
 * 프리로드 완료 대기 (폴링 방식)
 * @param slotId 슬롯 ID
 * @param get Zustand getter
 * @param timeout 최대 대기 시간 (ms), 기본 30초
 * @param pollInterval 폴링 간격 (ms), 기본 100ms
 */
async function waitForPreloadComplete(
  slotId: number,
  get: () => CornerstoneMultiViewerStore,
  timeout = 30000,
  pollInterval = 100
): Promise<void> {
  const startTime = Date.now()

  return new Promise((resolve) => {
    const checkPreload = () => {
      const slot = get().slots[slotId]

      // 프리로드 완료
      if (slot?.isPreloaded) {
        resolve()
        return
      }

      // 프리로드 중이 아닌데 완료도 안됨 → 오류
      if (!slot?.isPreloading && !slot?.isPreloaded) {
        resolve() // 오류 상황이지만 재생은 허용
        return
      }

      // 타임아웃 체크
      if (Date.now() - startTime > timeout) {
        console.warn(`[MultiViewer] Preload timeout for slot ${slotId}, starting playback anyway`)
        resolve()
        return
      }

      // 계속 대기
      setTimeout(checkPreload, pollInterval)
    }

    checkPreload()
  })
}

/**
 * 레이아웃에 따른 프리로드 배치 크기 결정
 * 슬롯 수가 많을수록 배치 크기를 줄여 네트워크 포화 방지
 */
function getBatchSizeForLayout(layout: GridLayout): number {
  switch (layout) {
    case '1x1':
      return 6 // 1개 슬롯: 6개 동시 요청
    case '2x2':
      return 4 // 4개 슬롯: 순차 프리로드로 4개씩
    case '3x3':
      return 3 // 9개 슬롯: 순차 프리로드로 3개씩
    case '4x4':
      return 2 // 16개 슬롯: 순차 프리로드로 2개씩
    default:
      return 4
  }
}

// ==================== Store 구현 ====================

export const useCornerstoneMultiViewerStore = create<CornerstoneMultiViewerStore>((set, get) => ({
  // 초기 상태
  layout: '1x1',
  apiType: 'wado-rs',
  globalFps: 30,
  slots: createInitialSlots(),
  availableInstances: [],

  // 썸네일 로딩 추적
  thumbnailsLoaded: new Set<string>(),
  totalThumbnailCount: 0,
  allThumbnailsLoaded: false,

  // ==================== 레이아웃 관리 ====================

  setLayout: (layout) => {
    set({ layout })
  },

  setApiType: (apiType) => {
    set({ apiType })
  },

  setGlobalFps: (fps) => {
    set({ globalFps: Math.max(1, Math.min(120, fps)) })
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

      console.log(`[MultiViewer] Loaded instance to slot ${slotId}:`, updatedInstance)
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

  playSlot: async (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance || slot.instance.numberOfFrames <= 1) {
      console.warn(`[MultiViewer] Cannot play slot ${slotId}: no multiframe instance`)
      return
    }

    // 1. 프리로드가 완료되지 않았으면 먼저 프리로드
    if (!slot.isPreloaded && !slot.isPreloading) {
      console.log(`[MultiViewer] Starting preload before play for slot ${slotId}`)
      await get().preloadSlotFrames(slotId)
    }

    // 2. 프리로드 중이면 완료 대기
    if (get().slots[slotId]?.isPreloading) {
      console.log(`[MultiViewer] Waiting for preload to complete for slot ${slotId}`)
      await waitForPreloadComplete(slotId, get)
    }

    // 3. 재생 시작
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isPlaying: true,
        },
      },
    }))
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

    // 2. 순차 프리로드 (네트워크 포화 방지)
    console.log(`[MultiViewer] Starting sequential preload for ${multiframeSlotIds.length} slots`)
    for (const slotId of multiframeSlotIds) {
      const slot = get().slots[slotId]
      // 이미 프리로드 완료된 슬롯은 스킵
      if (slot?.isPreloaded) {
        console.log(`[MultiViewer] Slot ${slotId} already preloaded, skipping`)
        continue
      }
      // 프리로드 진행 중인 슬롯은 완료 대기
      if (slot?.isPreloading) {
        console.log(`[MultiViewer] Waiting for slot ${slotId} preload to complete`)
        await waitForPreloadComplete(slotId, get)
      } else {
        // 프리로드 시작 및 완료 대기
        console.log(`[MultiViewer] Starting preload for slot ${slotId}`)
        await get().preloadSlotFrames(slotId)
      }
    }

    // 3. 모든 슬롯 재생 시작
    const updatedSlots: Record<number, CornerstoneSlotState> = {}
    for (const slotId of multiframeSlotIds) {
      const slot = get().slots[slotId]
      if (slot) {
        updatedSlots[slotId] = {
          ...slot,
          isPlaying: true,
        }
      }
    }

    set((state) => ({
      slots: {
        ...state.slots,
        ...updatedSlots,
      },
    }))

    console.log(`[MultiViewer] playAll started for ${multiframeSlotIds.length} slots`)
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
   * 슬롯의 모든 프레임 프리로드 (2단계 최적화)
   *
   * Phase 1: 배치 API로 PNG 프리페치 (0-50%)
   *   - /frames/1,2,3.../rendered 배치 요청
   *   - Rendered 캐시에 PNG 데이터 저장
   *
   * Phase 2: Cornerstone 로드 (50-100%)
   *   - imageLoader.loadImage() 호출
   *   - Rendered Interceptor가 캐시에서 데이터 반환 (캐시 히트)
   */
  preloadSlotFrames: async (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance) {
      console.warn(`[MultiViewer] Cannot preload slot ${slotId}: no instance`)
      return
    }

    if (slot.isPreloading || slot.isPreloaded) {
      console.log(`[MultiViewer] Slot ${slotId} already preloading or preloaded`)
      return
    }

    const { numberOfFrames } = slot.instance
    if (numberOfFrames <= 1) {
      // 싱글 프레임은 프리로드 불필요
      get().finishSlotPreload(slotId)
      return
    }

    get().startSlotPreload(slotId)

    try {
      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid } = slot.instance
      const CORNERSTONE_BATCH_SIZE = getBatchSizeForLayout(get().layout)
      const PREFETCH_BATCH_SIZE = 10 // 배치 API 최적 크기

      console.log(`[MultiViewer] 2-Phase preload for slot ${slotId}: ${numberOfFrames} frames`)

      // ==================== Phase 1: 배치 API로 PNG 프리페치 (0-50%) ====================
      console.log(`[MultiViewer] Phase 1: Batch API prefetch for slot ${slotId}`)

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
        }
      )

      console.log(`[MultiViewer] Phase 1 complete: PNG data cached for slot ${slotId}`)

      // ==================== Phase 2: Cornerstone 로드 (50-100%) ====================
      console.log(`[MultiViewer] Phase 2: Cornerstone load for slot ${slotId}`)
      let loadedCount = 0

      for (let i = 0; i < numberOfFrames; i += CORNERSTONE_BATCH_SIZE) {
        const batch = []
        for (let j = i; j < Math.min(i + CORNERSTONE_BATCH_SIZE, numberOfFrames); j++) {
          const imageId = createWadoRsRenderedImageId(
            studyInstanceUid,
            seriesInstanceUid,
            sopInstanceUid,
            j // 0-based frame number
          )

          batch.push(
            imageLoader
              .loadImage(imageId)
              .then(() => {
                loadedCount++
                // 50-100% 진행률
                const progress = 50 + Math.round((loadedCount / numberOfFrames) * 50)
                get().updateSlotPreloadProgress(slotId, progress)
              })
              .catch((error: unknown) => {
                console.warn(`[MultiViewer] Failed to load frame ${j} for slot ${slotId}:`, error)
                loadedCount++
                const progress = 50 + Math.round((loadedCount / numberOfFrames) * 50)
                get().updateSlotPreloadProgress(slotId, progress)
              })
          )
        }

        await Promise.all(batch)
      }

      get().finishSlotPreload(slotId)
      console.log(`[MultiViewer] 2-Phase preload completed for slot ${slotId}`)
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
    console.log(`[MultiViewer] Thumbnail tracking started: expecting ${count} thumbnails`)
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
      console.log(`[MultiViewer] All thumbnails loaded (${newSet.size}/${totalThumbnailCount}), preloading can start`)
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
}))
