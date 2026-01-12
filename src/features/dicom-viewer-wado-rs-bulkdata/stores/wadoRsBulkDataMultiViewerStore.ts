/**
 * wadoRsBulkDataMultiViewerStore.ts
 *
 * WADO-RS BulkData 기반 멀티 슬롯 DICOM 뷰어 상태 관리 (Zustand)
 * dicom-viewer, dicom-viewer-wado-uri의 스토어와 완전 독립적인 구현
 *
 * 지원 레이아웃: 1x1, 2x2, 3x3, 4x4 (최대 16개 슬롯)
 * API: WADO-RS BulkData (cornerstoneDICOMImageLoader wadors: scheme 사용)
 */
import { create } from 'zustand'
import type {
  WadoRsBulkDataGridLayout,
  WadoRsBulkDataInstanceSummary,
  WadoRsBulkDataSlotState,
  WadoRsBulkDataMultiViewerState,
  WadoRsBulkDataSlotPerformanceStats,
  WadoRsBulkDataPreloadPerformance,
} from '../types/wadoRsBulkDataTypes'
import { searchInstances } from '@/lib/services/dicomWebService'
import { handleDicomError, createImageLoadError } from '@/lib/errors'
import { createWadoRsBulkDataImageId } from '../utils/wadoRsBulkDataImageIdHelper'
import { loadWadoRsBulkDataImage } from '../utils/wadoRsBulkDataImageLoader'
import { fetchAndCacheMetadata } from '../utils/wadoRsBulkDataMetadataProvider'
import { prefetchAllFrames } from '../utils/wadoRsBatchPrefetcher'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_STORE = false
// 기존 배치 로더는 IImage 구조 문제로 비활성화
// 대신 prefetchAllFrames + Fetch Interceptor 방식 사용 (안전한 방식)
// import { loadAndCacheFrameBatch } from '../utils/wadoRsBulkDataBatchLoader'

// ==================== 초기 상태 생성 ====================

/**
 * 빈 성능 통계 생성
 */
function createEmptyPerformanceStats(): WadoRsBulkDataSlotPerformanceStats {
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
function createEmptySlotState(): WadoRsBulkDataSlotState {
  return {
    instance: null,
    currentFrame: 0,
    isPlaying: false,
    isPreloading: false,
    isPreloaded: false,
    preloadProgress: 0,
    loading: false,
    error: null,
    metadataError: null,
    performanceStats: createEmptyPerformanceStats(),
  }
}

/**
 * 레이아웃별 최대 슬롯 수
 */
function getMaxSlots(layout: WadoRsBulkDataGridLayout): number {
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
function createInitialSlots(): Record<number, WadoRsBulkDataSlotState> {
  const slots: Record<number, WadoRsBulkDataSlotState> = {}
  for (let i = 0; i < 16; i++) {
    slots[i] = createEmptySlotState()
  }
  return slots
}

// ==================== Store 인터페이스 ====================

// PreloadPerformance는 타입 파일에서 WadoRsBulkDataPreloadPerformance로 정의됨
// 하위 호환성을 위해 별칭 export
export type PreloadPerformance = WadoRsBulkDataPreloadPerformance

interface WadoRsBulkDataMultiViewerActions {
  // 레이아웃 관리
  setLayout: (layout: WadoRsBulkDataGridLayout) => void
  setGlobalFps: (fps: number) => void

  // 배치 테스트용
  setBatchSize: (size: number) => void
  setPreloadPerformance: (perf: WadoRsBulkDataPreloadPerformance | null) => void
  reloadAllSlots: () => Promise<void>

  // 슬롯 인스턴스 관리
  assignInstanceToSlot: (slotId: number, instance: WadoRsBulkDataInstanceSummary) => void
  loadSlotInstance: (slotId: number, instance: WadoRsBulkDataInstanceSummary) => Promise<void>
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
  setSlotMetadataError: (slotId: number, error: string | null) => void

  // 유틸리티
  getSlotState: (slotId: number) => WadoRsBulkDataSlotState
  getActiveSlots: () => number[]
  getMultiframeSlotIds: () => number[]

  // 중앙 집중식 애니메이션
  advanceAllPlayingFrames: () => void

  // 썸네일 로딩 추적
  setTotalThumbnailCount: (count: number) => void
  markThumbnailLoaded: (sopInstanceUid: string) => void
  resetThumbnailTracking: () => void
}

type WadoRsBulkDataMultiViewerStore = WadoRsBulkDataMultiViewerState & WadoRsBulkDataMultiViewerActions

// ==================== 헬퍼 함수 ====================

/**
 * 프리로드 완료 대기 (폴링 방식)
 */
async function waitForPreloadComplete(
  slotId: number,
  get: () => WadoRsBulkDataMultiViewerStore,
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
        if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Preload timeout for slot ${slotId}, starting playback anyway`)
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
function getBatchSizeForLayout(layout: WadoRsBulkDataGridLayout): number {
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

export const useWadoRsBulkDataMultiViewerStore = create<WadoRsBulkDataMultiViewerStore>((set, get) => ({
  // 초기 상태
  layout: '1x1',
  globalFps: 30,
  slots: createInitialSlots(),
  availableInstances: [],

  // 배치 테스트용
  batchSize: 10,
  preloadPerformance: null as PreloadPerformance | null,
  isReloading: false,

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

  // ==================== 배치 테스트용 ====================

  setBatchSize: (size) => {
    set({ batchSize: Math.max(1, Math.min(50, size)) })
  },

  setPreloadPerformance: (perf) => {
    set({ preloadPerformance: perf })
  },

  reloadAllSlots: async () => {
    const { slots, layout, batchSize } = get()
    const maxSlots = getMaxSlots(layout)

    // 이미 리로딩 중이면 무시
    if (get().isReloading) {
      if (DEBUG_STORE) console.warn('[WadoRsBulkDataViewer] Already reloading, skipping')
      return
    }

    set({ isReloading: true, preloadPerformance: null })
    const startTime = performance.now()
    let totalFrames = 0
    let requestCount = 0

    try {
      // 모든 멀티프레임 슬롯 찾기
      const multiframeSlotIds: number[] = []
      for (let i = 0; i < maxSlots; i++) {
        const slot = slots[i]
        if (slot?.instance && slot.instance.numberOfFrames > 1) {
          multiframeSlotIds.push(i)
          totalFrames += slot.instance.numberOfFrames
        }
      }

      if (multiframeSlotIds.length === 0) {
        if (DEBUG_STORE) console.warn('[WadoRsBulkDataViewer] No multiframe slots to reload')
        set({ isReloading: false })
        return
      }

      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Reloading ${multiframeSlotIds.length} slots with batchSize=${batchSize}`)

      // 각 슬롯의 프리로드 상태 초기화
      for (const slotId of multiframeSlotIds) {
        set((state) => ({
          slots: {
            ...state.slots,
            [slotId]: {
              ...state.slots[slotId],
              isPreloaded: false,
              isPreloading: false,
              preloadProgress: 0,
            },
          },
        }))
      }

      // 순차적으로 각 슬롯 프리로드 (성능 측정용)
      for (const slotId of multiframeSlotIds) {
        const slot = get().slots[slotId]
        if (!slot?.instance) continue

        const numberOfFrames = slot.instance.numberOfFrames
        requestCount += Math.ceil(numberOfFrames / batchSize)

        await get().preloadSlotFrames(slotId)
      }

      const endTime = performance.now()
      const loadTimeMs = endTime - startTime

      set({
        preloadPerformance: {
          loadTimeMs,
          requestCount,
          framesLoaded: totalFrames,
          avgTimePerBatch: requestCount > 0 ? loadTimeMs / requestCount : 0,
        },
        isReloading: false,
      })

      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Reload complete: ${totalFrames} frames in ${loadTimeMs.toFixed(0)}ms (${requestCount} batches)`)
    } catch (error) {
      if (DEBUG_STORE) console.error('[WadoRsBulkDataViewer] Reload failed:', error)
      set({ isReloading: false })
    }
  },

  // ==================== 슬롯 인스턴스 관리 ====================

  assignInstanceToSlot: (slotId, instance) => {
    const maxSlots = getMaxSlots(get().layout)
    if (slotId < 0 || slotId >= maxSlots) {
      if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Invalid slot ID: ${slotId}`)
      return
    }

    // 중복 방지: 같은 인스턴스가 이미 할당되어 있으면 무시
    const currentInstance = get().slots[slotId]?.instance
    if (currentInstance?.sopInstanceUid === instance.sopInstanceUid) {
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Slot ${slotId} already has instance ${instance.sopInstanceUid}, skipping`)
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

      const updatedInstance: WadoRsBulkDataInstanceSummary = {
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

      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Loaded instance to slot ${slotId}:`, updatedInstance)
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
      if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Cannot play slot ${slotId}: no multiframe instance`)
      return
    }

    if (!slot.isPreloaded && !slot.isPreloading) {
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Starting preload before play for slot ${slotId}`)
      await get().preloadSlotFrames(slotId)
    }

    if (get().slots[slotId]?.isPreloading) {
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Waiting for preload to complete for slot ${slotId}`)
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

    // 1. 멀티프레임 슬롯 ID 수집
    const multiframeSlotIds: number[] = []
    for (let i = 0; i < maxSlots; i++) {
      const slot = slots[i]
      if (slot?.instance && slot.instance.numberOfFrames > 1) {
        multiframeSlotIds.push(i)
      }
    }

    if (multiframeSlotIds.length === 0) {
      if (DEBUG_STORE) console.warn('[WadoRsBulkDataViewer] No multiframe slots to play')
      return
    }

    // 2. 모든 슬롯 프리로드 병렬 시작 (백그라운드)
    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Starting parallel preload for ${multiframeSlotIds.length} slots`)

    for (const slotId of multiframeSlotIds) {
      const slot = get().slots[slotId]
      // 이미 완료되었거나 진행 중이면 스킵
      if (slot?.isPreloaded || slot?.isPreloading) {
        if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Slot ${slotId} already preloaded/preloading, skipping`)
        continue
      }

      // 백그라운드 프리로드 시작 (await 없음!)
      get().preloadSlotFrames(slotId).catch((error) => {
        console.warn(`[WadoRsBulkDataViewer] Background preload failed for slot ${slotId}:`, error)
      })
    }

    // 3. 모든 슬롯 프리로드 완료 대기 (병렬)
    await Promise.all(
      multiframeSlotIds.map(async (slotId) => {
        const slot = get().slots[slotId]
        if (slot?.isPreloaded) return

        // 프리로드 완료 대기
        await waitForPreloadComplete(slotId, get)

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

        if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Slot ${slotId} started playing`)
      })
    )

    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] playAll completed for ${multiframeSlotIds.length} slots`)
  },

  pauseAll: () => {
    const { slots, layout } = get()
    const maxSlots = getMaxSlots(layout)
    const updatedSlots: Record<number, WadoRsBulkDataSlotState> = {}

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
    const updatedSlots: Record<number, WadoRsBulkDataSlotState> = {}

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
      if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Cannot preload slot ${slotId}: no instance`)
      return
    }

    if (slot.isPreloading || slot.isPreloaded) {
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Slot ${slotId} already preloading or preloaded`)
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
      const BATCH_SIZE = get().batchSize || getBatchSizeForLayout(get().layout)
      const PREFETCH_BATCH_SIZE = 10 // 배치 API 호출 시 프레임 수

      // CRITICAL: 메타데이터를 먼저 로드해야 Cornerstone wadors 로더가 PixelData를 디코딩할 수 있음
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Fetching metadata for slot ${slotId}...`)
      await fetchAndCacheMetadata(studyInstanceUid, seriesInstanceUid, sopInstanceUid)
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Metadata cached for slot ${slotId}`)

      // Phase 1: 배치 API로 PixelData 프리페치 (캐시에 저장)
      // HTTP 요청 90% 절감: 100프레임 = 10회 요청 (vs 기존 100회)
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 1: Prefetching ${numberOfFrames} frames via batch API (batch size: ${PREFETCH_BATCH_SIZE})`)

      await prefetchAllFrames(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames,
        PREFETCH_BATCH_SIZE,
        (loaded, total) => {
          // 프리페치 진행률: 0% ~ 50%
          const progress = Math.round((loaded / total) * 50)
          get().updateSlotPreloadProgress(slotId, progress)
        }
      )

      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 1 complete: PixelData cached`)

      // Phase 2: Cornerstone 로더로 이미지 로드 (캐시 히트 발생!)
      // Fetch Interceptor가 캐시된 PixelData 반환 → HTTP 요청 없음
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 2: Loading images via Cornerstone (cache hit expected)`)

      let loadedCount = 0
      for (let i = 0; i < numberOfFrames; i += BATCH_SIZE) {
        const batch = []
        for (let j = i; j < Math.min(i + BATCH_SIZE, numberOfFrames); j++) {
          const imageId = createWadoRsBulkDataImageId(
            studyInstanceUid,
            seriesInstanceUid,
            sopInstanceUid,
            j // 0-based frame number
          )

          batch.push(
            loadWadoRsBulkDataImage(imageId)
              .then(() => {
                loadedCount++
                // Cornerstone 로딩 진행률: 50% ~ 100%
                const progress = 50 + Math.round((loadedCount / numberOfFrames) * 50)
                get().updateSlotPreloadProgress(slotId, progress)
              })
              .catch((error: unknown) => {
                if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Failed to load frame ${j} for slot ${slotId}:`, error)
                loadedCount++
                const progress = 50 + Math.round((loadedCount / numberOfFrames) * 50)
                get().updateSlotPreloadProgress(slotId, progress)
              })
          )
        }

        await Promise.all(batch)
      }

      get().finishSlotPreload(slotId)
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Preload completed for slot ${slotId} (batch API optimized)`)
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

    const updatedStats: WadoRsBulkDataSlotPerformanceStats = {
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

  setSlotMetadataError: (slotId, error) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          metadataError: error,
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

    const updatedSlots: Record<number, WadoRsBulkDataSlotState> = {}
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
    if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Thumbnail tracking started: expecting ${count} thumbnails`)
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
      if (DEBUG_STORE) if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] All thumbnails loaded (${newSet.size}/${totalThumbnailCount}), preloading can start`)
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
