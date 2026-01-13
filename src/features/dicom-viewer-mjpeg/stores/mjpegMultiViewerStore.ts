/**
 * MJPEG Multi-Viewer Store
 *
 * Zustand 기반 MJPEG 뷰어 상태 관리
 * 기존 3개 뷰어 스토어와 완전 독립
 *
 * v2: 클라이언트 사이드 캐싱 지원
 * - 슬롯별 캐시 상태 관리
 * - 전체 로딩/재생 액션
 * - 메모리 통계
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MjpegInstanceSummary,
  MjpegSlotState,
  MjpegGridLayout,
  MjpegResolution,
} from '../types'
import { LAYOUT_SLOT_COUNTS } from '../types'
import { cineFramesLoadingManager, type LoadingProgress } from '../utils/CineFramesLoadingManager'

/**
 * 확장된 슬롯 상태 (캐시 정보 포함)
 */
export interface MjpegSlotStateExtended extends MjpegSlotState {
  /** 프레임 캐시 완료 여부 */
  isCached: boolean
  /** 캐시된 프레임 수 */
  cachedFrameCount: number
  /** 로딩 진행률 (0-100) */
  loadProgress: number
}

/**
 * MJPEG Multi-Viewer Store State
 */
interface MjpegMultiViewerState {
  // ========== 슬롯 상태 ==========
  /** 슬롯 배열 (최대 64개) */
  slots: MjpegSlotStateExtended[]

  // ========== 레이아웃 ==========
  /** 현재 그리드 레이아웃 */
  layout: MjpegGridLayout

  // ========== 글로벌 설정 ==========
  /** 글로벌 해상도 */
  globalResolution: MjpegResolution
  /** 글로벌 프레임 레이트 */
  globalFrameRate: number
  /** 글로벌 FPS (WADO-RS 호환) */
  globalFps: number

  // ========== 글로벌 로딩 상태 ==========
  /** 전체 로딩 진행 중 */
  isLoadingAll: boolean
  /** 전체 로딩 진행률 */
  loadAllProgress: number

  // ========== 액션 ==========
  /** Instance를 슬롯에 할당 */
  assignInstanceToSlot: (slotId: number, instance: MjpegInstanceSummary) => void
  /** 슬롯에서 Instance 제거 */
  removeInstanceFromSlot: (slotId: number) => void
  /** 모든 슬롯 초기화 */
  clearAllSlots: () => void
  /** 슬롯 스트리밍 상태 업데이트 */
  setSlotStreamingStatus: (
    slotId: number,
    status: MjpegSlotState['streamingStatus'],
    errorMessage?: string
  ) => void
  /** 슬롯 캐시 상태 업데이트 */
  setSlotCacheStatus: (
    slotId: number,
    isCached: boolean,
    cachedFrameCount: number
  ) => void
  /** 슬롯 로딩 진행률 업데이트 */
  setSlotLoadProgress: (slotId: number, progress: number) => void

  /** 레이아웃 변경 */
  setLayout: (layout: MjpegGridLayout) => void

  /** 글로벌 해상도 변경 */
  setGlobalResolution: (resolution: MjpegResolution) => void
  /** 글로벌 프레임 레이트 변경 */
  setGlobalFrameRate: (frameRate: number) => void
  /** 글로벌 FPS 변경 (WADO-RS 호환) */
  setGlobalFps: (fps: number) => void

  // ========== 전체 재생 컨트롤 ==========
  /** 모든 슬롯 재생 */
  playAll: () => void
  /** 모든 슬롯 일시정지 */
  pauseAll: () => void
  /** 모든 슬롯 정지 (스트리밍 중단) */
  stopAll: () => void

  // ========== 전체 로딩 컨트롤 ==========
  /** 모든 슬롯 프레임 로딩 */
  loadAllSlots: () => void
  /** 로딩 취소 */
  cancelLoading: () => void
  /** 캐시 정리 */
  clearAllCache: () => void
}

/**
 * 빈 슬롯 생성
 */
function createEmptySlot(slotId: number): MjpegSlotStateExtended {
  return {
    slotId,
    instance: null,
    streamingStatus: 'idle',
    isCached: false,
    cachedFrameCount: 0,
    loadProgress: 0,
  }
}

/**
 * 초기 슬롯 배열 생성 (64개 - 8x8 레이아웃)
 */
function createInitialSlots(): MjpegSlotStateExtended[] {
  return Array.from({ length: 64 }, (_, i) => createEmptySlot(i))
}

/**
 * MJPEG Multi-Viewer Store
 *
 * 특징:
 * - 최대 64개 슬롯 (8x8 레이아웃)
 * - 글로벌 해상도/FPS 설정
 * - 클라이언트 사이드 캐싱
 * - SessionStorage 영속화
 */
export const useMjpegMultiViewerStore = create<MjpegMultiViewerState>()(
  persist(
    (set, get) => ({
      // ========== 초기 상태 ==========
      slots: createInitialSlots(),
      layout: '2x2',
      globalResolution: 256,
      globalFrameRate: 30,
      globalFps: 30,
      isLoadingAll: false,
      loadAllProgress: 0,

      // ========== 슬롯 액션 ==========

      assignInstanceToSlot: (slotId, instance) => {
        // 기존 캐시 정리
        cineFramesLoadingManager.clearSlotCache(slotId)

        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? {
                  ...slot,
                  instance,
                  streamingStatus: 'loading' as const,
                  isCached: false,
                  cachedFrameCount: 0,
                  loadProgress: 0,
                }
              : slot
          ),
        }))
      },

      removeInstanceFromSlot: (slotId) => {
        // 캐시 정리
        cineFramesLoadingManager.clearSlotCache(slotId)
        cineFramesLoadingManager.cancelSlot(slotId)

        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId ? createEmptySlot(slotId) : slot
          ),
        }))
      },

      clearAllSlots: () => {
        cineFramesLoadingManager.cancelAll()
        cineFramesLoadingManager.clearAllCache()
        set({ slots: createInitialSlots(), isLoadingAll: false, loadAllProgress: 0 })
      },

      setSlotStreamingStatus: (slotId, status, errorMessage) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? { ...slot, streamingStatus: status, errorMessage }
              : slot
          ),
        }))
      },

      setSlotCacheStatus: (slotId, isCached, cachedFrameCount) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? { ...slot, isCached, cachedFrameCount }
              : slot
          ),
        }))
      },

      setSlotLoadProgress: (slotId, progress) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? { ...slot, loadProgress: progress }
              : slot
          ),
        }))
      },

      // ========== 레이아웃 액션 ==========

      setLayout: (layout) => {
        set({ layout })
      },

      // ========== 글로벌 설정 액션 ==========

      setGlobalResolution: (resolution) => {
        set({ globalResolution: resolution })
      },

      setGlobalFrameRate: (frameRate) => {
        // 범위 제한: 1-60
        const clampedFrameRate = Math.max(1, Math.min(60, frameRate))
        set({ globalFrameRate: clampedFrameRate, globalFps: clampedFrameRate })
      },

      setGlobalFps: (fps) => {
        // 범위 제한: 1-60
        const clampedFps = Math.max(1, Math.min(60, fps))
        set({ globalFps: clampedFps, globalFrameRate: clampedFps })
      },

      // ========== 전체 재생 컨트롤 ==========

      playAll: () => {
        const { slots, layout } = get()
        const visibleCount = LAYOUT_SLOT_COUNTS[layout]
        set({
          slots: slots.map((slot, index) =>
            // 캐시된 슬롯만 재생 가능
            index < visibleCount && slot.instance && slot.isCached
              ? { ...slot, streamingStatus: 'streaming' as const }
              : slot
          ),
        })
      },

      pauseAll: () => {
        const { slots, layout } = get()
        const visibleCount = LAYOUT_SLOT_COUNTS[layout]
        set({
          slots: slots.map((slot, index) =>
            index < visibleCount && slot.instance
              ? { ...slot, streamingStatus: 'idle' as const }
              : slot
          ),
        })
      },

      stopAll: () => {
        const { slots, layout } = get()
        const visibleCount = LAYOUT_SLOT_COUNTS[layout]

        // 캐시 정리
        for (let i = 0; i < visibleCount; i++) {
          cineFramesLoadingManager.clearSlotCache(i)
        }

        set({
          slots: slots.map((slot, index) =>
            index < visibleCount
              ? { ...slot, instance: null, streamingStatus: 'idle' as const, isCached: false, cachedFrameCount: 0 }
              : slot
          ),
        })
      },

      // ========== 전체 로딩 컨트롤 ==========

      loadAllSlots: () => {
        const { slots, layout, globalResolution, setSlotLoadProgress, setSlotCacheStatus, setSlotStreamingStatus } = get()
        const visibleCount = LAYOUT_SLOT_COUNTS[layout]

        // Instance가 있고 아직 캐시되지 않은 슬롯 필터링
        const slotsToLoad = slots
          .slice(0, visibleCount)
          .filter(slot => slot.instance && !slot.isCached)

        if (slotsToLoad.length === 0) {
          console.log('[MjpegStore] No slots to load')
          return
        }

        set({ isLoadingAll: true, loadAllProgress: 0 })

        let completedCount = 0
        const totalCount = slotsToLoad.length

        // 각 슬롯에 대해 로딩 요청
        slotsToLoad.forEach((slot) => {
          if (!slot.instance) return

          cineFramesLoadingManager.loadFrames(
            slot.slotId,
            slot.instance.sopInstanceUid,
            globalResolution,
            // onProgress
            (progress: LoadingProgress) => {
              setSlotLoadProgress(slot.slotId, progress.progress)

              if (progress.status === 'loading' || progress.status === 'decoding') {
                setSlotStreamingStatus(slot.slotId, 'loading')
              }
            },
            // onComplete
            (result) => {
              completedCount++

              if (result.success) {
                setSlotCacheStatus(slot.slotId, true, result.frames.length)
                setSlotStreamingStatus(slot.slotId, 'idle')
              } else {
                setSlotStreamingStatus(slot.slotId, 'error', result.error)
              }

              // 전체 진행률 업데이트
              const progress = Math.round((completedCount / totalCount) * 100)
              set({ loadAllProgress: progress })

              // 모두 완료
              if (completedCount === totalCount) {
                set({ isLoadingAll: false })
              }
            }
          )
        })
      },

      cancelLoading: () => {
        cineFramesLoadingManager.cancelAll()
        set({ isLoadingAll: false, loadAllProgress: 0 })
      },

      clearAllCache: () => {
        cineFramesLoadingManager.clearAllCache()
        set((state) => ({
          slots: state.slots.map((slot) => ({
            ...slot,
            isCached: false,
            cachedFrameCount: 0,
            loadProgress: 0,
          })),
        }))
      },
    }),
    {
      name: 'mjpeg-viewer-settings',
      // Instance 데이터는 영속화하지 않음 (설정만)
      partialize: (state) => ({
        layout: state.layout,
        globalResolution: state.globalResolution,
        globalFrameRate: state.globalFrameRate,
        globalFps: state.globalFps,
      }),
    }
  )
)

/**
 * 현재 레이아웃에서 활성화된 슬롯만 반환
 */
export function useActiveSlots(): MjpegSlotStateExtended[] {
  const { slots, layout } = useMjpegMultiViewerStore()
  const visibleCount = LAYOUT_SLOT_COUNTS[layout]
  return slots.slice(0, visibleCount)
}

/**
 * 캐시 통계 조회 훅
 */
export function useCacheStats() {
  return cineFramesLoadingManager.getCacheStats()
}

/**
 * 로딩 매니저 상태 조회 훅
 */
export function useLoadingManagerStatus() {
  return cineFramesLoadingManager.getStatus()
}
