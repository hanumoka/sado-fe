/**
 * wadoUriMultiViewerStore.ts
 *
 * WADO-URI 기반 멀티 슬롯 DICOM 뷰어 상태 관리 (Zustand)
 * dicom-viewer의 cornerstoneMultiViewerStore와 완전 독립적인 구현
 *
 * 지원 레이아웃: 1x1, 2x2, 3x3, 4x4 (최대 16개 슬롯)
 * API: WADO-URI (cornerstoneWADOImageLoader 사용)
 */
import { create } from 'zustand'
import type {
  WadoUriGridLayout,
  WadoUriInstanceSummary,
  WadoUriSlotState,
  WadoUriMultiViewerState,
  WadoUriSlotPerformanceStats,
} from '../types/wadoUriTypes'
import { searchInstances } from '@/lib/services/dicomWebService'
import { handleDicomError, createImageLoadError } from '@/lib/errors'
import { imageLoader } from '@cornerstonejs/core'
import { createWadoUriImageId } from '../utils/wadoUriImageIdHelper'

// ==================== 초기 상태 생성 ====================

/**
 * 빈 성능 통계 생성
 */
function createEmptyPerformanceStats(): WadoUriSlotPerformanceStats {
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
function createEmptySlotState(): WadoUriSlotState {
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
function getMaxSlots(layout: WadoUriGridLayout): number {
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
function createInitialSlots(): Record<number, WadoUriSlotState> {
  const slots: Record<number, WadoUriSlotState> = {}
  for (let i = 0; i < 16; i++) {
    slots[i] = createEmptySlotState()
  }
  return slots
}

// ==================== Store 인터페이스 ====================

interface WadoUriMultiViewerActions {
  // 레이아웃 관리
  setLayout: (layout: WadoUriGridLayout) => void
  setGlobalFps: (fps: number) => void

  // 슬롯 인스턴스 관리
  assignInstanceToSlot: (slotId: number, instance: WadoUriInstanceSummary) => void
  loadSlotInstance: (slotId: number, instance: WadoUriInstanceSummary) => Promise<void>
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
  getSlotState: (slotId: number) => WadoUriSlotState
  getActiveSlots: () => number[]
  getMultiframeSlotIds: () => number[]

  // 중앙 집중식 애니메이션
  advanceAllPlayingFrames: () => void

  // 썸네일 로딩 추적
  setTotalThumbnailCount: (count: number) => void
  markThumbnailLoaded: (sopInstanceUid: string) => void
  resetThumbnailTracking: () => void
}

type WadoUriMultiViewerStore = WadoUriMultiViewerState & WadoUriMultiViewerActions

// ==================== 헬퍼 함수 ====================

/**
 * 프리로드 완료 대기 (폴링 방식)
 */
async function waitForPreloadComplete(
  slotId: number,
  get: () => WadoUriMultiViewerStore,
  timeout = 30000,
  pollInterval = 100
): Promise<void> {
  const startTime = Date.now()

  return new Promise((resolve) => {
    const checkPreload = () => {
      const slot = get().slots[slotId]

      if (slot?.isPreloaded) {
        resolve()
        return
      }

      if (!slot?.isPreloading && !slot?.isPreloaded) {
        resolve()
        return
      }

      if (Date.now() - startTime > timeout) {
        console.warn(`[WadoUriViewer] Preload timeout for slot ${slotId}, starting playback anyway`)
        resolve()
        return
      }

      setTimeout(checkPreload, pollInterval)
    }

    checkPreload()
  })
}

/**
 * 레이아웃에 따른 프리로드 배치 크기 결정
 */
function getBatchSizeForLayout(layout: WadoUriGridLayout): number {
  switch (layout) {
    case '1x1':
      return 6
    case '2x2':
      return 4
    case '3x3':
      return 3
    case '4x4':
      return 2
    default:
      return 4
  }
}

// ==================== Store 구현 ====================

export const useWadoUriMultiViewerStore = create<WadoUriMultiViewerStore>((set, get) => ({
  // 초기 상태
  layout: '1x1',
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

  setGlobalFps: (fps) => {
    set({ globalFps: Math.max(1, Math.min(120, fps)) })
  },

  // ==================== 슬롯 인스턴스 관리 ====================

  assignInstanceToSlot: (slotId, instance) => {
    const maxSlots = getMaxSlots(get().layout)
    if (slotId < 0 || slotId >= maxSlots) {
      console.warn(`[WadoUriViewer] Invalid slot ID: ${slotId}`)
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

    get().loadSlotInstance(slotId, instance)
  },

  loadSlotInstance: async (slotId, instance) => {
    const { sopInstanceUid, studyInstanceUid, seriesInstanceUid } = instance

    try {
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

      const instances = await searchInstances(studyInstanceUid, seriesInstanceUid, {
        SOPInstanceUID: sopInstanceUid,
      })

      if (instances.length === 0) {
        throw createImageLoadError('Instance not found', sopInstanceUid)
      }

      const instanceData = instances[0]
      const numberOfFrames = instanceData.numberOfFrames || 1

      const updatedInstance: WadoUriInstanceSummary = {
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

      console.log(`[WadoUriViewer] Loaded instance to slot ${slotId}:`, updatedInstance)
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

  clearSlot: (slotId) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: createEmptySlotState(),
      },
    }))
  },

  clearAllSlots: () => {
    set({
      slots: createInitialSlots(),
    })
  },

  // ==================== 개별 슬롯 재생 제어 ====================

  playSlot: async (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance || slot.instance.numberOfFrames <= 1) {
      console.warn(`[WadoUriViewer] Cannot play slot ${slotId}: no multiframe instance`)
      return
    }

    if (!slot.isPreloaded && !slot.isPreloading) {
      console.log(`[WadoUriViewer] Starting preload before play for slot ${slotId}`)
      await get().preloadSlotFrames(slotId)
    }

    if (get().slots[slotId]?.isPreloading) {
      console.log(`[WadoUriViewer] Waiting for preload to complete for slot ${slotId}`)
      await waitForPreloadComplete(slotId, get)
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

    const multiframeSlotIds: number[] = []
    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      if (slot?.instance && slot.instance.numberOfFrames > 1) {
        multiframeSlotIds.push(i)
      }
    }

    if (multiframeSlotIds.length === 0) {
      console.warn('[WadoUriViewer] No multiframe slots to play')
      return
    }

    console.log(`[WadoUriViewer] Starting sequential preload for ${multiframeSlotIds.length} slots`)
    for (const slotId of multiframeSlotIds) {
      const slot = get().slots[slotId]
      if (slot?.isPreloaded) {
        console.log(`[WadoUriViewer] Slot ${slotId} already preloaded, skipping`)
        continue
      }
      if (slot?.isPreloading) {
        console.log(`[WadoUriViewer] Waiting for slot ${slotId} preload to complete`)
        await waitForPreloadComplete(slotId, get)
      } else {
        console.log(`[WadoUriViewer] Starting preload for slot ${slotId}`)
        await get().preloadSlotFrames(slotId)
      }
    }

    const updatedSlots: Record<number, WadoUriSlotState> = {}
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

    console.log(`[WadoUriViewer] playAll started for ${multiframeSlotIds.length} slots`)
  },

  pauseAll: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)
    const updatedSlots: Record<number, WadoUriSlotState> = {}

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

  stopAll: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)
    const updatedSlots: Record<number, WadoUriSlotState> = {}

    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      if (slot) {
        updatedSlots[i] = {
          ...slot,
          isPlaying: false,
          currentFrame: 0,
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

  preloadSlotFrames: async (slotId) => {
    const slot = get().slots[slotId]
    if (!slot?.instance) {
      console.warn(`[WadoUriViewer] Cannot preload slot ${slotId}: no instance`)
      return
    }

    if (slot.isPreloading || slot.isPreloaded) {
      console.log(`[WadoUriViewer] Slot ${slotId} already preloading or preloaded`)
      return
    }

    const { numberOfFrames } = slot.instance
    if (numberOfFrames <= 1) {
      get().finishSlotPreload(slotId)
      return
    }

    get().startSlotPreload(slotId)

    try {
      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid } = slot.instance
      let loadedCount = 0
      const BATCH_SIZE = getBatchSizeForLayout(get().layout)

      // WADO-URI imageLoader 사용 (cornerstoneWADOImageLoader)
      console.log(`[WadoUriViewer] Preloading slot ${slotId} with WADO-URI imageLoader (${numberOfFrames} frames, BATCH_SIZE=${BATCH_SIZE})`)

      for (let i = 0; i < numberOfFrames; i += BATCH_SIZE) {
        const batch = []
        for (let j = i; j < Math.min(i + BATCH_SIZE, numberOfFrames); j++) {
          // WADO-URI imageId 생성
          const imageId = createWadoUriImageId(
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
                const progress = Math.round((loadedCount / numberOfFrames) * 100)
                get().updateSlotPreloadProgress(slotId, progress)
              })
              .catch((error: unknown) => {
                console.warn(`[WadoUriViewer] Failed to preload frame ${j} for slot ${slotId}:`, error)
                loadedCount++
                const progress = Math.round((loadedCount / numberOfFrames) * 100)
                get().updateSlotPreloadProgress(slotId, progress)
              })
          )
        }

        await Promise.all(batch)
      }

      get().finishSlotPreload(slotId)
      console.log(`[WadoUriViewer] Preload completed for slot ${slotId}`)
    } catch (error) {
      const errorMessage = handleDicomError(error, 'preloadSlotFrames')
      get().setSlotError(slotId, errorMessage)

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

  updateSlotPerformance: (slotId, fps, frameTime) => {
    const slot = get().slots[slotId]
    if (!slot) return

    const stats = slot.performanceStats
    const newFpsHistory = [...stats.fpsHistory, fps].slice(-30)
    const avgFps = newFpsHistory.reduce((sum, val) => sum + val, 0) / newFpsHistory.length

    const targetFps = get().globalFps
    const frameDrops = fps < targetFps * 0.7 ? stats.frameDrops + 1 : stats.frameDrops

    const updatedStats: WadoUriSlotPerformanceStats = {
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

  advanceAllPlayingFrames: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)

    const updatedSlots: Record<number, WadoUriSlotState> = {}
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

  setTotalThumbnailCount: (count) => {
    set({
      totalThumbnailCount: count,
      thumbnailsLoaded: new Set<string>(),
      allThumbnailsLoaded: count === 0,
    })
    console.log(`[WadoUriViewer] Thumbnail tracking started: expecting ${count} thumbnails`)
  },

  markThumbnailLoaded: (sopInstanceUid) => {
    const { thumbnailsLoaded, totalThumbnailCount } = get()

    if (thumbnailsLoaded.has(sopInstanceUid)) return

    const newSet = new Set(thumbnailsLoaded)
    newSet.add(sopInstanceUid)

    const allLoaded = newSet.size >= totalThumbnailCount

    set({
      thumbnailsLoaded: newSet,
      allThumbnailsLoaded: allLoaded,
    })

    if (allLoaded) {
      console.log(`[WadoUriViewer] All thumbnails loaded (${newSet.size}/${totalThumbnailCount}), preloading can start`)
    }
  },

  resetThumbnailTracking: () => {
    set({
      thumbnailsLoaded: new Set<string>(),
      totalThumbnailCount: 0,
      allThumbnailsLoaded: false,
    })
  },
}))
