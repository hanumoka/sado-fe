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
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  WadoRsBulkDataGridLayout,
  WadoRsBulkDataInstanceSummary,
  WadoRsBulkDataSlotState,
  WadoRsBulkDataMultiViewerState,
  WadoRsBulkDataSlotPerformanceStats,
  WadoRsBulkDataPreloadPerformance,
  BulkDataFormat,
} from '../types/wadoRsBulkDataTypes'
import { searchInstances } from '@/lib/services/dicomWebService'
import { handleDicomError, createImageLoadError } from '@/lib/errors'
import { createWadoRsBulkDataImageIds } from '../utils/wadoRsBulkDataImageIdHelper'
import { loadWadoRsBulkDataImage } from '../utils/wadoRsBulkDataImageLoader'
import { fetchAndCacheMetadata } from '../utils/wadoRsBulkDataMetadataProvider'
// 배치 프리페처 비활성화: Cornerstone Pool Manager 직접 활용
// import { prefetchAllFrames } from '../utils/wadoRsBatchPrefetcher'
// import { clearPixelDataCache } from '../utils/wadoRsPixelDataCache'
import { clearImageCache as clearRenderedCache } from '@/lib/cornerstone/wadoRsRenderedLoader'

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
    // Progressive Playback
    loadedFrames: new Set<number>(),
    isBuffering: false,
    loading: false,
    error: null,
    metadataError: null,
    performanceStats: createEmptyPerformanceStats(),
    // Stack 재로드 트리거
    stackVersion: 0,
  }
}

/**
 * 레이아웃별 최대 슬롯 수
 * WADO-RS BulkData는 3x3까지만 지원 (메모리/CPU 최적화)
 */
function getMaxSlots(layout: WadoRsBulkDataGridLayout): number {
  switch (layout) {
    case '1x1':
      return 1
    case '2x2':
      return 4
    case '3x3':
      return 9
    // 4x4, 5x5는 UI에서 제한되어 더 이상 도달 불가
    default:
      return 1
  }
}

// 최대 슬롯 수 (3x3 = 9, WADO-RS BulkData는 3x3까지만 지원)
const MAX_TOTAL_SLOTS = 9

/**
 * 초기 슬롯 상태 맵 생성 (최대 9개)
 */
function createInitialSlots(): Record<number, WadoRsBulkDataSlotState> {
  const slots: Record<number, WadoRsBulkDataSlotState> = {}
  for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
    slots[i] = createEmptySlotState()
  }
  return slots
}

// ==================== Store 인터페이스 ====================

// PreloadPerformance는 타입 파일에서 WadoRsBulkDataPreloadPerformance로 정의됨
// 하위 호환성을 위해 별칭 export
export type PreloadPerformance = WadoRsBulkDataPreloadPerformance

// getBatchSizeForLayout 제거: Pool Manager가 동시성 제어하므로 더 이상 필요 없음
// 배치 크기는 preloadSlotFrames에서 고정값 사용

interface WadoRsBulkDataMultiViewerActions {
  // 레이아웃 관리
  setLayout: (layout: WadoRsBulkDataGridLayout) => void
  setGlobalFps: (fps: number) => void
  setGlobalFormat: (format: BulkDataFormat) => void
  setGlobalResolution: (resolution: number) => void

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

  // 프리로딩 (2단계: 초기 버퍼 → 나머지 백그라운드)
  preloadSlotFrames: (slotId: number, initialBufferOnly?: boolean) => Promise<void>
  startSlotPreload: (slotId: number) => void
  updateSlotPreloadProgress: (slotId: number, progress: number) => void
  finishSlotPreload: (slotId: number) => void

  // Progressive Playback
  markFrameLoaded: (slotId: number, frameIndex: number) => void

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
 * Progressive Playback: 초기 버퍼 대기 (폴링 방식)
 *
 * 모든 프레임이 로드될 때까지 기다리지 않고,
 * 초기 버퍼(INITIAL_BUFFER_SIZE)가 채워지면 재생 시작
 *
 * 조건:
 * 1. Frame 0이 로드됨 (첫 번째 프레임 필수)
 * 2. loadedFrames.size >= requiredFrames
 * 3. 또는 isPreloaded가 true (전체 로드 완료)
 *
 * 타임아웃 시: Frame 0만 로드되었으면 재생 시작
 */
async function waitForInitialBuffer(
  slotId: number,
  requiredFrames: number,
  get: () => WadoRsBulkDataMultiViewerStore,
  timeout = 10000
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const check = () => {
      const slot = get().slots[slotId]
      if (!slot) {
        resolve()
        return
      }

      const hasFrame0 = slot.loadedFrames.has(0)
      const loadedCount = slot.loadedFrames.size

      // 조건 충족: Frame 0 + 충분한 프레임 또는 전체 로드 완료
      if ((hasFrame0 && loadedCount >= requiredFrames) || slot.isPreloaded) {
        if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Initial buffer ready for slot ${slotId}: ${loadedCount} frames loaded`)
        resolve()
        return
      }

      // 타임아웃 체크
      if (Date.now() - startTime > timeout) {
        if (hasFrame0) {
          if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Buffer timeout for slot ${slotId}, starting with ${loadedCount} frames`)
          resolve()
        } else {
          // Frame 0도 없으면 계속 대기
          setTimeout(check, 50)
        }
        return
      }

      setTimeout(check, 50)
    }

    check()
  })
}

// ==================== Store 구현 ====================

export const useWadoRsBulkDataMultiViewerStore = create<WadoRsBulkDataMultiViewerStore>()(
  persist(
    (set, get) => ({
  // 초기 상태
  layout: '1x1' as const,
  globalFps: 30,
  globalFormat: 'original' as BulkDataFormat,  // BulkData 포맷 (rendered: Pre-rendered, original: 원본 인코딩, raw: 디코딩된 픽셀)
  globalResolution: 512,  // rendered 모드용 해상도 (512/256/128/64/32)
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
    const currentLayout = get().layout
    if (currentLayout === layout) return

    // 레이아웃 변경 시: 재생 중지 + 캐시 클리어 + 슬롯 리셋
    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Layout changed: ${currentLayout} → ${layout}, resetting...`)

    // 1. 모든 재생 중지
    get().pauseAll()

    // 2. 모든 슬롯 전체 리셋 (Cornerstone 캐시는 LRU eviction으로 자동 관리)
    // stackVersion 증가로 Stack 재설정 트리거
    const slots = get().slots
    const resetSlots: Record<number, WadoRsBulkDataSlotState> = {}
    for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
      if (slots[i]) {
        resetSlots[i] = {
          ...slots[i],
          isPreloading: false,
          isPreloaded: false,
          preloadProgress: 0,
          currentFrame: 0,
          isPlaying: false,
          stackVersion: (slots[i].stackVersion ?? 0) + 1,
        }
      }
    }

    set({ layout, slots: resetSlots })
  },

  setGlobalFps: (fps) => {
    set({ globalFps: Math.max(1, Math.min(120, fps)) })
  },

  setGlobalFormat: (format) => {
    const currentFormat = get().globalFormat
    if (currentFormat === format) return

    // 포맷 변경 시: 재생 중지 + 캐시 클리어 + 슬롯 리셋
    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Format changed: ${currentFormat} → ${format}, resetting...`)

    // 1. 모든 재생 중지
    get().pauseAll()

    // 2. Rendered 캐시만 클리어 (BulkData는 Cornerstone 캐시 사용, LRU eviction)
    if (format === 'rendered') {
      clearRenderedCache()
    }

    // 3. 모든 슬롯 프리로드 상태 리셋 (format 변경은 전체 리셋 필요)
    // stackVersion 증가로 Stack 재설정 트리거
    const slots = get().slots
    const resetSlots: Record<number, WadoRsBulkDataSlotState> = {}
    for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
      if (slots[i]) {
        resetSlots[i] = {
          ...slots[i],
          isPreloading: false,
          isPreloaded: false,
          preloadProgress: 0,
          currentFrame: 0,
          isPlaying: false,
          stackVersion: (slots[i].stackVersion ?? 0) + 1,
        }
      }
    }

    set({ globalFormat: format, slots: resetSlots })
  },

  setGlobalResolution: (resolution) => {
    const currentResolution = get().globalResolution
    if (currentResolution === resolution) return

    // Resolution 변경 시: 재생 중지 + Rendered 캐시 클리어 + 슬롯 리셋
    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Resolution changed: ${currentResolution} → ${resolution}, resetting...`)

    // 1. 모든 재생 중지
    get().pauseAll()

    // 2. Rendered 캐시 클리어 (resolution 변경은 rendered 모드에서만 의미 있음)
    clearRenderedCache()

    // 3. 모든 슬롯 프리로드 상태 리셋
    // stackVersion 증가로 Stack 재설정 트리거
    const slots = get().slots
    const resetSlots: Record<number, WadoRsBulkDataSlotState> = {}
    for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
      if (slots[i]) {
        resetSlots[i] = {
          ...slots[i],
          isPreloading: false,
          isPreloaded: false,
          preloadProgress: 0,
          currentFrame: 0,
          isPlaying: false,
          stackVersion: (slots[i].stackVersion ?? 0) + 1,
        }
      }
    }

    set({ globalResolution: resolution, slots: resetSlots })
  },

  // ==================== 배치 테스트용 ====================

  setBatchSize: (size) => {
    const newSize = Math.max(1, Math.min(50, size))
    const currentSize = get().batchSize
    if (currentSize === newSize) return

    // 1. 모든 재생 중지
    get().pauseAll()

    // 2. 모든 슬롯 전체 리셋 (Cornerstone 캐시는 LRU eviction으로 자동 관리)
    // stackVersion 증가로 Stack 재설정 트리거
    const slots = get().slots
    const resetSlots: Record<number, WadoRsBulkDataSlotState> = {}
    for (let i = 0; i < MAX_TOTAL_SLOTS; i++) {
      if (slots[i]) {
        resetSlots[i] = {
          ...slots[i],
          isPreloading: false,
          isPreloaded: false,
          preloadProgress: 0,
          currentFrame: 0,
          isPlaying: false,
          stackVersion: (slots[i].stackVersion ?? 0) + 1,
        }
      }
    }

    set({ batchSize: newSize, slots: resetSlots })
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

    // Progressive Playback: 초기 버퍼 크기 (15프레임 또는 전체의 15%)
    const INITIAL_BUFFER_SIZE = Math.min(15, Math.ceil(slot.instance.numberOfFrames * 0.15))

    // 1. 프리로드 시작 (백그라운드, await 없음)
    if (!slot.isPreloaded && !slot.isPreloading) {
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Starting preload in background for slot ${slotId}`)
      get().preloadSlotFrames(slotId).catch((error) => {
        console.error(`[WadoRsBulkDataViewer] Preload failed for slot ${slotId}:`, error)
      })
    }

    // 2. 초기 버퍼만 대기 (기존: 100% 대기)
    // isPreloaded=true면 이미 전체 로드 완료, 대기 불필요
    if (slot.loadedFrames.size < INITIAL_BUFFER_SIZE && !slot.isPreloaded) {
      // 버퍼링 상태 표시
      set((state) => ({
        slots: {
          ...state.slots,
          [slotId]: {
            ...state.slots[slotId],
            isBuffering: true,
          },
        },
      }))

      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Waiting for initial buffer (${INITIAL_BUFFER_SIZE} frames) for slot ${slotId}`)
      await waitForInitialBuffer(slotId, INITIAL_BUFFER_SIZE, get)

      // 버퍼링 완료
      set((state) => ({
        slots: {
          ...state.slots,
          [slotId]: {
            ...state.slots[slotId],
            isBuffering: false,
          },
        },
      }))
    }

    // 3. 즉시 재생 시작
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

    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] OHIF-style playAll: ${multiframeSlotIds.length} slots`)

    // OHIF 방식: 2단계 프리로드 + 동시 재생
    // Phase 1: 모든 슬롯의 초기 버퍼(15프레임)를 동시에 로드
    // Phase 2: 초기 버퍼 완료 후 동시 재생 시작
    // Phase 3: 백그라운드에서 나머지 프레임 로드

    // 프리로드가 필요한 슬롯 필터링 (이미 완료된 슬롯 제외)
    const slotsNeedingPreload = multiframeSlotIds.filter((slotId) => {
      const slot = get().slots[slotId]
      return !slot?.isPreloaded
    })

    // Phase 1: 모든 슬롯의 초기 버퍼 동시 로드
    if (slotsNeedingPreload.length > 0) {
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 1: Loading initial buffers for ${slotsNeedingPreload.length} slots`)

      // 모든 슬롯의 isPreloading=true 설정 (동기)
      for (const slotId of slotsNeedingPreload) {
        get().startSlotPreload(slotId)
      }

      // 모든 슬롯의 초기 버퍼 동시 로드 (initialBufferOnly=true)
      await Promise.all(
        slotsNeedingPreload.map(async (slotId) => {
          try {
            await get().preloadSlotFrames(slotId, true) // 초기 버퍼만
          } catch (error) {
            console.warn(`[WadoRsBulkDataViewer] Initial buffer failed for slot ${slotId}:`, error)
          }
        })
      )

      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 1 completed: Initial buffers loaded`)
    }

    // Phase 2: 모든 슬롯 동시 재생 시작
    // 초기 버퍼가 로드되었으므로 즉시 재생 가능
    const updatedSlots: Record<number, WadoRsBulkDataSlotState> = {}
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

    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 2: All ${multiframeSlotIds.length} slots started playing simultaneously`)

    // Phase 3: 백그라운드에서 나머지 프레임 로드 (await 없이)
    // 재생과 동시에 나머지 프레임을 점진적으로 로드
    for (const slotId of slotsNeedingPreload) {
      // 비동기로 나머지 프레임 로드 (await 없이 백그라운드 실행)
      get().preloadSlotFrames(slotId, false).catch((error) => {
        console.warn(`[WadoRsBulkDataViewer] Background preload failed for slot ${slotId}:`, error)
      })
    }

    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 3: Background preload started for remaining frames`)
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

  preloadSlotFrames: async (slotId, initialBufferOnly = false) => {
    const slot = get().slots[slotId]
    if (!slot?.instance) {
      if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Cannot preload slot ${slotId}: no instance`)
      return
    }

    // 이미 완료된 경우만 스킵 (isPreloading 체크 제거 - playAll()에서 먼저 설정함)
    if (slot.isPreloaded) {
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Slot ${slotId} already preloaded`)
      return
    }

    const { numberOfFrames } = slot.instance
    if (numberOfFrames <= 1) {
      get().markFrameLoaded(slotId, 0)
      get().finishSlotPreload(slotId)
      return
    }

    // playAll()에서 이미 호출했을 수 있으므로, isPreloading=false인 경우만 호출
    if (!slot.isPreloading) {
      get().startSlotPreload(slotId)
    }

    // rendered 모드는 별도의 Rendered Loader가 처리하므로 배치 프리페치 불필요
    const globalFormat = get().globalFormat
    if (globalFormat === 'rendered') {
      // rendered 모드에서도 모든 프레임을 로드된 것으로 마킹
      for (let i = 0; i < numberOfFrames; i++) {
        get().markFrameLoaded(slotId, i)
      }
      get().finishSlotPreload(slotId)
      return
    }

    try {
      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid } = slot.instance

      // OHIF 방식: 2단계 프리로드
      // Phase 1: 초기 버퍼 (15프레임 또는 15%) - 빠른 재생 시작
      // Phase 2: 나머지 프레임 - 백그라운드 로드
      const INITIAL_BUFFER_SIZE = Math.min(15, Math.ceil(numberOfFrames * 0.15))
      const BATCH_SIZE = 10

      // CRITICAL: 메타데이터를 먼저 로드해야 Cornerstone wadors 로더가 PixelData를 디코딩할 수 있음
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Fetching metadata for slot ${slotId}...`)
      await fetchAndCacheMetadata(studyInstanceUid, seriesInstanceUid, sopInstanceUid)
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Metadata cached for slot ${slotId}`)

      // globalFormat: 'jpeg-baseline' | 'original' | 'raw' (rendered 제외됨)
      const imageIds = createWadoRsBulkDataImageIds(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames,
        globalFormat
      )

      // 로드할 프레임 범위 결정
      const framesToLoad = initialBufferOnly
        ? Math.min(INITIAL_BUFFER_SIZE, numberOfFrames)
        : numberOfFrames

      if (DEBUG_STORE) {
        console.log(
          `[WadoRsBulkDataViewer] Loading ${framesToLoad}/${numberOfFrames} frames for slot ${slotId} ` +
          `(initialBufferOnly: ${initialBufferOnly})`
        )
      }

      let loadedCount = 0

      // 배치 단위로 로드 (진행률 표시용)
      for (let i = 0; i < framesToLoad; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, framesToLoad)
        const batch = imageIds.slice(i, batchEnd)
        const batchStartIndex = i

        await Promise.all(
          batch.map((imageId, batchIndex) => {
            const frameIndex = batchStartIndex + batchIndex
            return loadWadoRsBulkDataImage(imageId)
              .then(() => {
                loadedCount++
                // 프레임 로드 완료 마킹 (Progressive Playback 지원)
                get().markFrameLoaded(slotId, frameIndex)
                // 10% 단위로만 진행률 업데이트 (리렌더링 최소화)
                const progress = Math.floor((loadedCount / numberOfFrames) * 10) * 10
                get().updateSlotPreloadProgress(slotId, progress)
              })
              .catch((error: unknown) => {
                if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Failed to load frame ${frameIndex} for slot ${slotId}:`, error)
                loadedCount++
                // 실패해도 마킹하여 무한 재시도 방지
                get().markFrameLoaded(slotId, frameIndex)
                const progress = Math.floor((loadedCount / numberOfFrames) * 10) * 10
                get().updateSlotPreloadProgress(slotId, progress)
              })
          })
        )
      }

      // initialBufferOnly일 때는 finishSlotPreload 호출하지 않음 (아직 전체 로드 안됨)
      if (!initialBufferOnly) {
        get().finishSlotPreload(slotId)
        if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Full preload completed for slot ${slotId}`)
      } else {
        if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Initial buffer loaded for slot ${slotId} (${loadedCount} frames)`)
      }
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

  // ==================== Progressive Playback ====================

  markFrameLoaded: (slotId, frameIndex) => {
    const slot = get().slots[slotId]
    if (!slot || slot.loadedFrames.has(frameIndex)) return

    // Set을 immutable하게 업데이트
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
    }),
    {
      name: 'wado-rs-bulkdata-viewer-settings',
      version: 1, // 버전 추가: 'jpeg' → 'jpeg-baseline' 마이그레이션
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        layout: state.layout,
        globalFps: state.globalFps,
        globalFormat: state.globalFormat,
        globalResolution: state.globalResolution,
      }),
      migrate: (persistedState, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persistedState as any
        if (version === 0) {
          // v0 → v1: 'jpeg' → 'jpeg-baseline' 마이그레이션
          if (state.globalFormat === 'jpeg') {
            state.globalFormat = 'jpeg-baseline'
          }
        }
        return state
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<WadoRsBulkDataMultiViewerState>),
      }),
    }
  )
)
