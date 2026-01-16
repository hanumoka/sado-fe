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
} from '../types/wadoRsBulkDataTypes'
import { searchInstances } from '@/lib/services/dicomWebService'
import { handleDicomError, createImageLoadError } from '@/lib/errors'
import { createWadoRsBulkDataImageIds } from '../utils/wadoRsBulkDataImageIdHelper'
import { loadWadoRsBulkDataImage } from '../utils/wadoRsBulkDataImageLoader'
import { fetchAndCacheMetadata } from '../utils/wadoRsBulkDataMetadataProvider'
import {
  getRenderingMode,
  checkGpuSupport,
  reinitializeCornerstone,
  type RenderingMode,
} from '@/lib/cornerstone/initCornerstone'
import type { SyncMode } from '@/lib/utils/BaseCineAnimationManager'
import { wadoRsBulkDataCineAnimationManager } from '../utils/wadoRsBulkDataCineAnimationManager'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_STORE = false

// 병렬 로딩 동시 요청 수 (브라우저 연결 제한 6개 중 4개 사용)
const PARALLEL_CONCURRENCY = 4

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
    // Pre-decode (사전 디코딩)
    isPreDecoding: false,
    isPreDecoded: false,
    preDecodeProgress: 0,
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
    case '3x2':
      return 6
    case '3x3':
      return 9
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

interface WadoRsBulkDataMultiViewerActions {
  // 레이아웃 관리
  setLayout: (layout: WadoRsBulkDataGridLayout) => void
  setGlobalFps: (fps: number) => void

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

  // 렌더링 모드 설정
  setRenderingMode: (mode: RenderingMode) => Promise<boolean>
  refreshGpuSupport: () => boolean

  // 동기화 설정
  setSyncMode: (mode: SyncMode) => void

  // 사전 디코딩 (Pre-decode)
  startPreDecode: (slotId: number) => void
  updatePreDecodeProgress: (slotId: number, progress: number) => void
  finishPreDecode: (slotId: number) => void
  cancelPreDecode: (slotId: number) => void
}

type WadoRsBulkDataMultiViewerStore = WadoRsBulkDataMultiViewerState & WadoRsBulkDataMultiViewerActions

// ==================== 헬퍼 함수 ====================

/**
 * Progressive Playback: 초기 버퍼 대기 (이벤트 기반)
 *
 * 폴링 대신 이벤트 기반으로 버퍼 준비 완료 감지
 * markFrameLoaded()에서 조건 충족 시 Promise resolve
 *
 * 조건:
 * 1. Frame 0이 로드됨 (첫 번째 프레임 필수)
 * 2. loadedFrames.size >= requiredFrames
 * 3. 또는 isPreloaded가 true (전체 로드 완료)
 *
 * 타임아웃 시: Frame 0만 로드되었으면 재생 시작
 */

// 버퍼 준비 대기 Promise 저장 (이벤트 기반 동기화용)
interface BufferWaitEntry {
  resolve: () => void
  requiredFrames: number
  hasFrame0Required: boolean
}
const bufferReadyPromises = new Map<number, BufferWaitEntry>()

// 버퍼 준비 완료 체크 및 resolve (markFrameLoaded에서 호출)
function checkAndResolveBufferReady(slotId: number, loadedFrames: Set<number>, isPreloaded: boolean): void {
  const entry = bufferReadyPromises.get(slotId)
  if (!entry) return

  const hasFrame0 = loadedFrames.has(0)
  const loadedCount = loadedFrames.size

  // 조건 충족: Frame 0 + 충분한 프레임 또는 전체 로드 완료
  if ((hasFrame0 && loadedCount >= entry.requiredFrames) || isPreloaded) {
    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Initial buffer ready for slot ${slotId}: ${loadedCount} frames loaded (event-based)`)
    entry.resolve()
    bufferReadyPromises.delete(slotId)
  }
}

async function waitForInitialBuffer(
  slotId: number,
  requiredFrames: number,
  get: () => WadoRsBulkDataMultiViewerStore,
  timeout = 10000
): Promise<void> {
  const slot = get().slots[slotId]

  // 슬롯 없음: 즉시 resolve
  if (!slot) {
    return Promise.resolve()
  }

  const hasFrame0 = slot.loadedFrames.has(0)
  const loadedCount = slot.loadedFrames.size

  // 이미 조건 충족: 즉시 resolve
  if ((hasFrame0 && loadedCount >= requiredFrames) || slot.isPreloaded) {
    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Initial buffer already ready for slot ${slotId}: ${loadedCount} frames`)
    return Promise.resolve()
  }

  // 이벤트 기반 대기: markFrameLoaded에서 조건 충족 시 resolve
  return new Promise((resolve) => {
    // 대기 엔트리 등록
    bufferReadyPromises.set(slotId, {
      resolve,
      requiredFrames,
      hasFrame0Required: true,
    })

    // 타임아웃 설정
    setTimeout(() => {
      const entry = bufferReadyPromises.get(slotId)
      if (entry) {
        const currentSlot = get().slots[slotId]
        const currentHasFrame0 = currentSlot?.loadedFrames.has(0) ?? false
        const currentLoadedCount = currentSlot?.loadedFrames.size ?? 0

        if (currentHasFrame0) {
          if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Buffer timeout for slot ${slotId}, starting with ${currentLoadedCount} frames`)
        }

        bufferReadyPromises.delete(slotId)
        resolve()
      }
    }, timeout)
  })
}

// ==================== Store 구현 ====================

export const useWadoRsBulkDataMultiViewerStore = create<WadoRsBulkDataMultiViewerStore>()(
  persist(
    (set, get) => ({
  // 초기 상태
  layout: '1x1' as const,
  globalFps: 30,
  slots: createInitialSlots(),
  availableInstances: [],

  // 썸네일 로딩 추적
  thumbnailsLoaded: new Set<string>(),
  totalThumbnailCount: 0,
  allThumbnailsLoaded: false,

  // 렌더링 모드 설정
  renderingMode: getRenderingMode() as RenderingMode,
  isRenderingModeChanging: false,
  gpuSupported: checkGpuSupport(),

  // 동기화 설정
  syncMode: 'global-sync' as SyncMode,

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

    // Progressive Playback: 초기 버퍼 크기 - Frame 0만 로드되면 즉시 재생 시작
    const INITIAL_BUFFER_SIZE = 1

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

    // 2. viewport 등록된 슬롯만 필터링 (Stack 로드 완료된 슬롯)
    // WadoRsBulkDataSlot의 registerSlot() 호출 조건 (isStackLoaded)과 일치시킴
    // viewport가 미등록된 슬롯은 registerSlot()을 호출하지 않으므로
    // Global Sync 장벽에서 영원히 대기하는 문제 방지
    const readySlotIds = multiframeSlotIds.filter((slotId) => {
      return wadoRsBulkDataCineAnimationManager.hasViewport(slotId)
    })

    if (readySlotIds.length === 0) {
      if (DEBUG_STORE) console.warn('[WadoRsBulkDataViewer] No ready slots to play (viewport not registered)')
      return
    }

    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] playAll: ${readySlotIds.length}/${multiframeSlotIds.length} slots ready`)

    // Phase 0: Global Sync 준비 - 준비된 슬롯만 대상
    // viewport 등록된 슬롯만 포함하여 expectedSlots와 실제 registerSlot() 호출 일치
    const syncMode = get().syncMode
    if (syncMode === 'global-sync') {
      wadoRsBulkDataCineAnimationManager.prepareForGlobalSync(readySlotIds)
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Global Sync barrier set for ${readySlotIds.length} slots`)
    }

    // OHIF 방식: 2단계 프리로드 + 동시 재생
    // Phase 1: 준비된 슬롯의 초기 버퍼 동시 로드
    // Phase 2: 초기 버퍼 완료 후 동시 재생 시작
    // Phase 3: 백그라운드에서 나머지 프레임 로드

    // 프리로드가 필요한 슬롯 필터링 (준비된 슬롯 중 이미 완료된 슬롯 제외)
    const slotsNeedingPreload = readySlotIds.filter((slotId) => {
      const slot = get().slots[slotId]
      return !slot?.isPreloaded
    })

    // Phase 1: 준비된 슬롯의 초기 버퍼 동시 로드
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

    // Phase 1.5: 초기 버퍼 대기 (준비된 슬롯 중 버퍼 필요한 것만)
    // isPreloaded=true인 슬롯은 버퍼 대기 불필요 - 즉시 재생 가능
    // Progressive Playback: Frame 0만 로드되면 즉시 재생 시작
    const INITIAL_BUFFER_SIZE = 1
    const slotsNeedingBuffer = readySlotIds.filter((slotId) => {
      const slot = get().slots[slotId]
      if (!slot?.instance) return false
      // 이미 프리로드 완료된 슬롯은 버퍼 대기 불필요
      if (slot.isPreloaded) return false
      return slot.loadedFrames.size < INITIAL_BUFFER_SIZE
    })

    if (slotsNeedingBuffer.length > 0) {
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 1.5: Waiting for ${slotsNeedingBuffer.length} slots to have initial buffer ready`)
      await Promise.all(
        slotsNeedingBuffer.map(async (slotId) => {
          await waitForInitialBuffer(slotId, INITIAL_BUFFER_SIZE, get, 15000)
        })
      )
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 1.5 completed: All slots have initial buffer ready`)
    } else {
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 1.5: All slots already have buffer ready, skipping`)
    }

    // Phase 2: 준비된 슬롯만 동시 재생 시작
    // 모든 슬롯의 초기 버퍼가 준비되었으므로 동시에 재생 시작
    // Global Sync 모드에서는 모든 슬롯을 프레임 0에서 시작하도록 설정
    const updatedSlots: Record<number, WadoRsBulkDataSlotState> = {}
    for (const slotId of readySlotIds) {
      const slot = get().slots[slotId]
      if (slot) {
        updatedSlots[slotId] = {
          ...slot,
          isPlaying: true,
          currentFrame: 0, // 모든 슬롯 프레임 0에서 시작 (Global Sync 동시 시작 보장)
        }
      }
    }

    set((state) => ({
      slots: {
        ...state.slots,
        ...updatedSlots,
      },
    }))

    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Phase 2: All ${readySlotIds.length} slots started playing simultaneously`)

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

  /**
   * 병렬 프레임 로딩
   * 동시 N개 요청으로 캐싱 속도 향상
   */
  loadFramesParallel: async (
    imageIds: string[],
    concurrency: number,
    onFrameLoaded: (frameIndex: number) => void,
    onProgress: (loaded: number, total: number) => void
  ): Promise<void> => {
    const total = imageIds.length
    let loadedCount = 0
    let currentIndex = 0

    async function worker(): Promise<void> {
      while (currentIndex < total) {
        const frameIndex = currentIndex++
        const imageId = imageIds[frameIndex]

        try {
          await loadWadoRsBulkDataImage(imageId)
        } catch {
          // 실패해도 계속 진행 (버퍼링에서 처리)
          if (DEBUG_STORE) console.warn(`[WadoRsBulkDataViewer] Failed to load frame ${frameIndex}`)
        }

        loadedCount++
        onFrameLoaded(frameIndex)
        onProgress(loadedCount, total)
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, total) },
      () => worker()
    )
    await Promise.all(workers)
  },

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

    try {
      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid } = slot.instance

      // 2단계 프리로드
      // Phase 1: 초기 버퍼 - Frame 0만 로드되면 즉시 재생 시작
      // Phase 2: 나머지 프레임 - 병렬 백그라운드 로드
      const INITIAL_BUFFER_SIZE = 1

      // CRITICAL: 메타데이터를 먼저 로드해야 Cornerstone wadors 로더가 PixelData를 디코딩할 수 있음
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Fetching metadata for slot ${slotId}...`)
      await fetchAndCacheMetadata(studyInstanceUid, seriesInstanceUid, sopInstanceUid)
      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Metadata cached for slot ${slotId}`)

      // Original 포맷으로 imageIds 생성 (단일 프레임 조회)
      const imageIds = createWadoRsBulkDataImageIds(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames
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

      let lastProgressUpdate = 0

      // 병렬로 프레임 로드 (동시 N개 요청)
      await get().loadFramesParallel(
        imageIds.slice(0, framesToLoad),
        PARALLEL_CONCURRENCY,
        (frameIndex) => {
          // 프레임 로드 완료 마킹 (Progressive Playback 지원)
          get().markFrameLoaded(slotId, frameIndex)
        },
        (loaded, total) => {
          // 10% 단위로만 진행률 업데이트 (리렌더링 최소화)
          const progress = Math.floor((loaded / numberOfFrames) * 10) * 10
          if (progress > lastProgressUpdate) {
            lastProgressUpdate = progress
            get().updateSlotPreloadProgress(slotId, progress)
          }
        }
      )

      // initialBufferOnly일 때는 finishSlotPreload 호출하지 않음 (아직 전체 로드 안됨)
      if (!initialBufferOnly) {
        get().finishSlotPreload(slotId)
        if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Full preload completed for slot ${slotId}`)
      } else {
        if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Initial buffer loaded for slot ${slotId}`)
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
    const slot = get().slots[slotId]

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

    // 이벤트 기반 버퍼 대기 resolve (isPreloaded=true로 전체 로드 완료)
    if (slot) {
      checkAndResolveBufferReady(slotId, slot.loadedFrames, true)
    }
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

    // 이벤트 기반 버퍼 대기 resolve 체크
    checkAndResolveBufferReady(slotId, newLoadedFrames, slot.isPreloaded)
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

  // ==================== 렌더링 모드 설정 ====================

  /**
   * 렌더링 모드 변경 (CPU/GPU)
   *
   * 주의: 렌더링 모드 변경 시 모든 재생이 중단되고 슬롯이 리셋됩니다.
   * RenderingEngine은 새 모드로 재생성됩니다.
   */
  setRenderingMode: async (mode: RenderingMode): Promise<boolean> => {
    const currentMode = get().renderingMode

    // 같은 모드면 스킵
    if (currentMode === mode) {
      return true
    }

    // GPU 모드 요청 시 지원 여부 체크
    if (mode === 'gpu' && !get().gpuSupported) {
      console.warn('[WadoRsBulkDataViewer] GPU rendering not supported on this device')
      return false
    }

    // 전환 시작
    set({ isRenderingModeChanging: true })

    if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Changing rendering mode: ${currentMode} → ${mode}`)

    try {
      // 1. 모든 재생 중지
      get().pauseAll()

      // 2. Cornerstone 렌더링 모드 재초기화
      const useCPU = mode === 'cpu'
      const success = await reinitializeCornerstone(useCPU)

      if (!success) {
        console.error('[WadoRsBulkDataViewer] Failed to reinitialize Cornerstone')
        set({ isRenderingModeChanging: false })
        return false
      }

      // 3. 모든 슬롯 상태 리셋 (stackVersion 증가로 Stack 재설정 트리거)
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
            loadedFrames: new Set<number>(),
            isBuffering: false,
            stackVersion: (slots[i].stackVersion ?? 0) + 1,
          }
        }
      }

      // 4. 상태 업데이트
      set({
        renderingMode: mode,
        isRenderingModeChanging: false,
        slots: resetSlots,
      })

      if (DEBUG_STORE) console.log(`[WadoRsBulkDataViewer] Rendering mode changed to ${mode.toUpperCase()}`)
      return true
    } catch (error) {
      console.error('[WadoRsBulkDataViewer] Failed to change rendering mode:', error)
      set({ isRenderingModeChanging: false })
      return false
    }
  },

  /**
   * GPU 지원 여부 새로고침
   */
  refreshGpuSupport: () => {
    const supported = checkGpuSupport()
    set({ gpuSupported: supported })
    return supported
  },

  // ==================== 동기화 설정 ====================

  /**
   * 동기화 모드 설정
   */
  setSyncMode: (mode: SyncMode) => {
    set({ syncMode: mode })
    // CineAnimationManager에도 동기화 모드 전달
    wadoRsBulkDataCineAnimationManager.setSyncMode(mode)
    if (DEBUG_STORE) {
      console.log(`[WadoRsBulkDataViewer] Sync mode set to: ${mode}`)
    }
  },

  // ==================== 사전 디코딩 (Pre-decode) ====================

  /**
   * 사전 디코딩 시작
   */
  startPreDecode: (slotId: number) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isPreDecoding: true,
          isPreDecoded: false,
          preDecodeProgress: 0,
        },
      },
    }))
    if (DEBUG_STORE) {
      console.log(`[WadoRsBulkDataViewer] Pre-decode started for slot ${slotId}`)
    }
  },

  /**
   * 사전 디코딩 진행률 업데이트
   */
  updatePreDecodeProgress: (slotId: number, progress: number) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          preDecodeProgress: Math.max(0, Math.min(100, progress)),
        },
      },
    }))
  },

  /**
   * 사전 디코딩 완료
   */
  finishPreDecode: (slotId: number) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isPreDecoding: false,
          isPreDecoded: true,
          preDecodeProgress: 100,
        },
      },
    }))
    if (DEBUG_STORE) {
      console.log(`[WadoRsBulkDataViewer] Pre-decode finished for slot ${slotId}`)
    }
  },

  /**
   * 사전 디코딩 취소
   */
  cancelPreDecode: (slotId: number) => {
    set((state) => ({
      slots: {
        ...state.slots,
        [slotId]: {
          ...state.slots[slotId],
          isPreDecoding: false,
          isPreDecoded: false,
          preDecodeProgress: 0,
        },
      },
    }))
    if (DEBUG_STORE) {
      console.log(`[WadoRsBulkDataViewer] Pre-decode cancelled for slot ${slotId}`)
    }
  },
    }),
    {
      name: 'wado-rs-bulkdata-viewer-settings',
      version: 2, // v2: globalFormat, globalResolution 제거
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        layout: state.layout,
        globalFps: state.globalFps,
        renderingMode: state.renderingMode,
        syncMode: state.syncMode,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<WadoRsBulkDataMultiViewerState>),
      }),
      // sessionStorage에서 복원 시 CineAnimationManager에 동기화 모드 전달
      onRehydrateStorage: () => (state) => {
        if (state?.syncMode) {
          wadoRsBulkDataCineAnimationManager.setSyncMode(state.syncMode)
          if (DEBUG_STORE) {
            console.log(`[WadoRsBulkDataViewer] Restored syncMode from session storage: ${state.syncMode}`)
          }
        }
      },
    }
  )
)
