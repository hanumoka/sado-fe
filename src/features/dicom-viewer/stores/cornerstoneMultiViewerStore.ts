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
  playSlot: (slotId: number) => void
  pauseSlot: (slotId: number) => void
  togglePlaySlot: (slotId: number) => void
  setSlotFrame: (slotId: number, frameIndex: number) => void
  nextFrameSlot: (slotId: number) => void
  prevFrameSlot: (slotId: number) => void
  goToFirstFrameSlot: (slotId: number) => void
  goToLastFrameSlot: (slotId: number) => void

  // 글로벌 재생 제어
  playAll: () => void
  pauseAll: () => void
  toggleGlobalPlay: () => void

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
}

type CornerstoneMultiViewerStore = CornerstoneMultiViewerState & CornerstoneMultiViewerActions

// ==================== Store 구현 ====================

export const useCornerstoneMultiViewerStore = create<CornerstoneMultiViewerStore>((set, get) => ({
  // 초기 상태
  layout: '2x2',
  apiType: 'wado-rs',
  globalFps: 30,
  slots: createInitialSlots(),
  availableInstances: [],

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

  playSlot: (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance || slot.instance.numberOfFrames <= 1) {
      console.warn(`[MultiViewer] Cannot play slot ${slotId}: no multiframe instance`)
      return
    }

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

  togglePlaySlot: (slotId) => {
    const slot = get().slots[slotId]
    if (!slot) return

    if (slot.isPlaying) {
      get().pauseSlot(slotId)
    } else {
      get().playSlot(slotId)
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

    const maxFrame = slot.instance.numberOfFrames - 1
    const nextFrame = Math.min(slot.currentFrame + 1, maxFrame)

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

  playAll: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)
    const updatedSlots: Record<number, CornerstoneSlotState> = {}

    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      // 멀티프레임 인스턴스만 재생
      if (slot?.instance && slot.instance.numberOfFrames > 1) {
        updatedSlots[i] = {
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

  toggleGlobalPlay: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)

    // 현재 재생 중인 슬롯이 하나라도 있으면 전체 일시정지, 없으면 전체 재생
    const isAnyPlaying = Array.from({ length: maxSlots }, (_, i) => slots[i]).some(
      (slot) => slot?.isPlaying
    )

    if (isAnyPlaying) {
      get().pauseAll()
    } else {
      get().playAll()
    }
  },

  // ==================== 프리로딩 ====================

  /**
   * 슬롯의 모든 프레임 프리로드
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
      let loadedCount = 0
      const BATCH_SIZE = 6 // 동시 로딩 프레임 수

      // 배치 단위로 프레임 로드
      for (let i = 0; i < numberOfFrames; i += BATCH_SIZE) {
        const batch = []
        for (let j = i; j < Math.min(i + BATCH_SIZE, numberOfFrames); j++) {
          batch.push(
            new Promise<void>((resolve) => {
              const img = new Image()

              // WADO-RS Rendered API 사용
              const frameUrl = `/dicomweb/studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances/${sopInstanceUid}/frames/${j + 1}/rendered`

              img.onload = () => {
                loadedCount++
                const progress = Math.round((loadedCount / numberOfFrames) * 100)
                get().updateSlotPreloadProgress(slotId, progress)
                resolve()
              }

              img.onerror = () => {
                console.warn(`[MultiViewer] Failed to preload frame ${j} for slot ${slotId}`)
                loadedCount++
                const progress = Math.round((loadedCount / numberOfFrames) * 100)
                get().updateSlotPreloadProgress(slotId, progress)
                resolve()
              }

              img.src = frameUrl
            })
          )
        }

        await Promise.all(batch)
      }

      get().finishSlotPreload(slotId)
      console.log(`[MultiViewer] Preload completed for slot ${slotId}`)
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
}))
