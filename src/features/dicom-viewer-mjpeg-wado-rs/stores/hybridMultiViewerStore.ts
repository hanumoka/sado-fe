/**
 * Hybrid MJPEG+WADO-RS Multi-Viewer Store
 *
 * Zustand 기반 하이브리드 뷰어 상태 관리
 * 기존 4개 뷰어 스토어와 완전 독립 (사이드이펙트 방지)
 *
 * 특징:
 * - 최대 9개 슬롯 (3x3 레이아웃)
 * - MJPEG + Cornerstone 듀얼 레이어 상태 관리
 * - 전환(Transition) 상태 머신
 * - SessionStorage 영속화 (설정만)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  HybridGridLayout,
  HybridMjpegResolution,
  HybridBulkDataFormat,
  HybridSlotState,
  HybridInstanceSummary,
  HybridMultiViewerState,
  HybridMultiViewerActions,
  TransitionPhase,
  MjpegLayerState,
  CornerstoneLayerState,
} from '../types'
import { MAX_SLOTS, HYBRID_LAYOUT_CONFIG } from '../types'
import { hybridPreloadManager } from '../utils/hybridPreloadManager'
import { cornerstonePreloadQueue } from '../utils/cornerstonePreloadQueue'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 빈 MJPEG 레이어 상태 생성
 */
function createEmptyMjpegState(): MjpegLayerState {
  return {
    isCached: false,
    cachedFrameCount: 0,
    loadProgress: 0,
    currentFrame: 0,
    isPlaying: false,
  }
}

/**
 * 빈 Cornerstone 레이어 상태 생성
 */
function createEmptyCornerstoneState(): CornerstoneLayerState {
  return {
    isPreloaded: false,
    preloadProgress: 0,
    isReady: false,
    currentFrame: 0,
    isPlaying: false,
  }
}

/**
 * 빈 슬롯 생성
 */
function createEmptySlot(slotId: number): HybridSlotState {
  return {
    slotId,
    instance: null,
    phase: 'idle',
    mjpeg: createEmptyMjpegState(),
    cornerstone: createEmptyCornerstoneState(),
    transition: {
      pendingTransition: false,
      transitionProgress: 0,
    },
  }
}

/**
 * 초기 슬롯 배열 생성 (9개 - 3x3 레이아웃 최대)
 */
function createInitialSlots(): HybridSlotState[] {
  return Array.from({ length: MAX_SLOTS }, (_, i) => createEmptySlot(i))
}

// ============================================================================
// Store Definition
// ============================================================================

type HybridStore = HybridMultiViewerState & HybridMultiViewerActions

/**
 * Hybrid Multi-Viewer Store
 *
 * 주의: 기존 뷰어 store/manager 임포트 금지
 * - useMjpegMultiViewerStore (X)
 * - useWadoRsBulkDataMultiViewerStore (X)
 * - cineFramesLoadingManager (X)
 * - wadoRsBulkDataCineAnimationManager (X)
 */
export const useHybridMultiViewerStore = create<HybridStore>()(
  persist(
    (set, get) => ({
      // ========== 초기 상태 ==========
      layout: '2x2' as HybridGridLayout,
      globalFps: 30,
      globalResolution: 256 as HybridMjpegResolution,
      globalFormat: 'jpeg-baseline' as HybridBulkDataFormat,
      slots: createInitialSlots(),

      // ========== Layout Actions ==========

      setLayout: (layout) => {
        set({ layout })
      },

      // ========== Settings Actions ==========

      setGlobalFps: (fps) => {
        const clampedFps = Math.max(1, Math.min(60, fps))
        set({ globalFps: clampedFps })
      },

      setGlobalResolution: (resolution) => {
        set({ globalResolution: resolution })
      },

      setGlobalFormat: (format) => {
        set({ globalFormat: format })
      },

      // ========== Instance Management ==========

      assignInstanceToSlot: (slotId, instance) => {
        // 기존 프리로드 취소 및 캐시 정리 (인스턴스 재할당 시)
        cornerstonePreloadQueue.cancel(slotId)
        hybridPreloadManager.cancelSlot(slotId)
        hybridPreloadManager.clearSlotCache(slotId)

        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? {
                  ...createEmptySlot(slotId),
                  instance,
                  phase: 'mjpeg-loading' as TransitionPhase,
                }
              : slot
          ),
        }))
      },

      clearSlot: (slotId) => {
        // 해당 슬롯의 프리로드 취소 및 캐시 정리
        cornerstonePreloadQueue.cancel(slotId)
        hybridPreloadManager.cancelSlot(slotId)
        hybridPreloadManager.clearSlotCache(slotId)

        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId ? createEmptySlot(slotId) : slot
          ),
        }))
      },

      clearAllSlots: () => {
        // 프리로드 큐와 캐시 정리 (레이아웃 변경 시 필수)
        cornerstonePreloadQueue.clear()
        hybridPreloadManager.cancelAll()
        hybridPreloadManager.clearAllCache()

        set({ slots: createInitialSlots() })
      },

      // ========== Phase Transitions ==========

      setSlotPhase: (slotId, phase) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId ? { ...slot, phase } : slot
          ),
        }))
      },

      requestTransition: (slotId) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? {
                  ...slot,
                  transition: {
                    ...slot.transition,
                    pendingTransition: true,
                  },
                }
              : slot
          ),
        }))
      },

      prepareTransition: (slotId) => {
        // transition-prepare phase: MJPEG freeze + Cornerstone 첫 프레임 대기
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? {
                  ...slot,
                  phase: 'transition-prepare' as TransitionPhase,
                  mjpeg: {
                    ...slot.mjpeg,
                    isPlaying: false,  // MJPEG 즉시 중단 (freeze)
                  },
                }
              : slot
          ),
        }))
      },

      completeTransition: (slotId) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? {
                  ...slot,
                  phase: 'cornerstone' as TransitionPhase,
                  transition: {
                    pendingTransition: false,
                    transitionProgress: 100,
                  },
                  mjpeg: {
                    ...slot.mjpeg,
                    isPlaying: false,
                  },
                  cornerstone: {
                    ...slot.cornerstone,
                    isPlaying: true,
                  },
                }
              : slot
          ),
        }))
      },

      // ========== MJPEG State Updates ==========

      updateMjpegState: (slotId, update) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? {
                  ...slot,
                  mjpeg: { ...slot.mjpeg, ...update },
                }
              : slot
          ),
        }))
      },

      // ========== Cornerstone State Updates ==========

      updateCornerstoneState: (slotId, update) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? {
                  ...slot,
                  cornerstone: { ...slot.cornerstone, ...update },
                }
              : slot
          ),
        }))
      },

      // ========== Playback Control ==========

      playSlot: (slotId) => {
        const { slots } = get()
        const slot = slots.find((s) => s.slotId === slotId)
        if (!slot || !slot.instance) return

        if (slot.phase === 'cornerstone') {
          // Cornerstone 모드에서 재생
          set((state) => ({
            slots: state.slots.map((s) =>
              s.slotId === slotId
                ? { ...s, cornerstone: { ...s.cornerstone, isPlaying: true } }
                : s
            ),
          }))
        } else if (slot.mjpeg.isCached) {
          // MJPEG 모드에서 재생 (캐시된 경우만)
          set((state) => ({
            slots: state.slots.map((s) =>
              s.slotId === slotId
                ? {
                    ...s,
                    phase: 'mjpeg-playing' as TransitionPhase,
                    mjpeg: { ...s.mjpeg, isPlaying: true },
                  }
                : s
            ),
          }))
        }
      },

      pauseSlot: (slotId) => {
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.slotId === slotId
              ? {
                  ...slot,
                  mjpeg: { ...slot.mjpeg, isPlaying: false },
                  cornerstone: { ...slot.cornerstone, isPlaying: false },
                }
              : slot
          ),
        }))
      },

      playAll: () => {
        const { slots, layout } = get()
        const visibleCount = HYBRID_LAYOUT_CONFIG[layout].slots

        set({
          slots: slots.map((slot, index) => {
            if (index >= visibleCount || !slot.instance) return slot

            if (slot.phase === 'cornerstone') {
              return {
                ...slot,
                cornerstone: { ...slot.cornerstone, isPlaying: true },
              }
            } else if (slot.mjpeg.isCached) {
              return {
                ...slot,
                phase: 'mjpeg-playing' as TransitionPhase,
                mjpeg: { ...slot.mjpeg, isPlaying: true },
              }
            }
            return slot
          }),
        })
      },

      pauseAll: () => {
        const { slots, layout } = get()
        const visibleCount = HYBRID_LAYOUT_CONFIG[layout].slots

        set({
          slots: slots.map((slot, index) =>
            index < visibleCount
              ? {
                  ...slot,
                  mjpeg: { ...slot.mjpeg, isPlaying: false },
                  cornerstone: { ...slot.cornerstone, isPlaying: false },
                }
              : slot
          ),
        })
      },

      stopAll: () => {
        set({ slots: createInitialSlots() })
      },
    }),
    {
      name: 'hybrid-viewer-settings',
      // Instance 데이터는 영속화하지 않음 (설정만)
      partialize: (state) => ({
        layout: state.layout,
        globalFps: state.globalFps,
        globalResolution: state.globalResolution,
        globalFormat: state.globalFormat,
      }),
    }
  )
)

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * 현재 레이아웃에서 활성화된 슬롯만 반환
 */
export function useActiveHybridSlots(): HybridSlotState[] {
  const { slots, layout } = useHybridMultiViewerStore()
  const visibleCount = HYBRID_LAYOUT_CONFIG[layout].slots
  return slots.slice(0, visibleCount)
}

/**
 * 특정 슬롯 상태 반환
 */
export function useHybridSlot(slotId: number): HybridSlotState | undefined {
  return useHybridMultiViewerStore((state) => state.slots[slotId])
}

/**
 * 전환 대기 중인 슬롯 수
 */
export function usePendingTransitionCount(): number {
  const { slots, layout } = useHybridMultiViewerStore()
  const visibleCount = HYBRID_LAYOUT_CONFIG[layout].slots
  return slots
    .slice(0, visibleCount)
    .filter((slot) => slot.transition.pendingTransition).length
}

/**
 * Cornerstone 모드로 전환된 슬롯 수
 */
export function useCornerstoneActiveCount(): number {
  const { slots, layout } = useHybridMultiViewerStore()
  const visibleCount = HYBRID_LAYOUT_CONFIG[layout].slots
  return slots
    .slice(0, visibleCount)
    .filter((slot) => slot.phase === 'cornerstone').length
}
