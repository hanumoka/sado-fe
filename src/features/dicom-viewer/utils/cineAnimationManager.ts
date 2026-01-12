/**
 * CineAnimationManager - 중앙 집중식 애니메이션 루프 관리자
 *
 * Phase 2 최적화: React 상태 우회 (Direct Viewport Manipulation)
 *
 * 기존 문제:
 * - advanceAllPlayingFrames() → Zustand set() → React 리렌더링 → useEffect → viewport.setImageIdIndex()
 * - 4개 슬롯 × 30fps = 초당 120회 React 리렌더링
 *
 * 해결책:
 * - Viewport 참조를 직접 저장하고 조작
 * - 재생 중에는 Zustand 상태 업데이트 없이 viewport 직접 제어
 * - 재생 중지 시에만 Zustand와 동기화 (UI 일관성)
 *
 * 참고: https://github.com/cornerstonejs/cornerstone3D/issues/1756
 */

import type { Types } from '@cornerstonejs/core'
import { useCornerstoneMultiViewerStore } from '../stores/cornerstoneMultiViewerStore'

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_CINE = false

interface ViewportInfo {
  viewport: Types.IStackViewport
  totalFrames: number
  currentIndex: number
}

class CineAnimationManager {
  private animationId: number | null = null
  private lastFrameTime: number = 0
  private activeSlots: Set<number> = new Set()
  private frameTime: number = 33.33 // 30fps default

  // Phase 2: Viewport 직접 참조 저장
  private viewports: Map<number, ViewportInfo> = new Map()

  /**
   * FPS 설정
   * @param fps 초당 프레임 수
   */
  setFrameTime(fps: number): void {
    this.frameTime = 1000 / fps
  }

  /**
   * 현재 FPS 반환
   */
  getFps(): number {
    return 1000 / this.frameTime
  }

  /**
   * Viewport 등록 (CornerstoneSlot에서 viewport 생성 후 호출)
   * @param slotId 슬롯 ID
   * @param viewport Cornerstone StackViewport
   * @param totalFrames 총 프레임 수
   */
  registerViewport(slotId: number, viewport: Types.IStackViewport, totalFrames: number): void {
    this.viewports.set(slotId, {
      viewport,
      totalFrames,
      currentIndex: 0,
    })
    if (DEBUG_CINE) console.log(`[CineManager] Viewport registered for slot ${slotId}, totalFrames: ${totalFrames}`)
  }

  /**
   * Viewport 등록 해제 (CornerstoneSlot cleanup 시 호출)
   * @param slotId 슬롯 ID
   */
  unregisterViewport(slotId: number): void {
    this.viewports.delete(slotId)
    if (DEBUG_CINE) console.log(`[CineManager] Viewport unregistered for slot ${slotId}`)
  }

  /**
   * 특정 슬롯의 현재 프레임 인덱스 설정 (외부 동기화용)
   * @param slotId 슬롯 ID
   * @param frameIndex 프레임 인덱스
   */
  setCurrentIndex(slotId: number, frameIndex: number): void {
    const info = this.viewports.get(slotId)
    if (info) {
      info.currentIndex = frameIndex
    }
  }

  /**
   * 특정 슬롯의 현재 프레임 인덱스 반환
   * @param slotId 슬롯 ID
   */
  getCurrentIndex(slotId: number): number {
    return this.viewports.get(slotId)?.currentIndex ?? 0
  }

  /**
   * 중앙 애니메이션 루프
   * Phase 2: Zustand 상태 업데이트 없이 Viewport 직접 조작
   * + Progressive Playback: 버퍼 확인 및 버퍼링 상태 관리
   */
  private animate = (currentTime: number): void => {
    if (this.activeSlots.size === 0) {
      this.stop()
      return
    }

    const elapsed = currentTime - this.lastFrameTime

    if (elapsed >= this.frameTime) {
      // 드리프트 보정: 초과된 시간을 다음 프레임에 반영
      this.lastFrameTime = currentTime - (elapsed % this.frameTime)

      const store = useCornerstoneMultiViewerStore.getState()

      // Phase 2: Viewport 직접 업데이트 (React 우회)
      this.activeSlots.forEach((slotId) => {
        const info = this.viewports.get(slotId)
        if (!info) {
          if (DEBUG_CINE) console.warn(`[CineManager] No viewport for slot ${slotId}`)
          return
        }

        const { viewport, totalFrames } = info
        const nextIndex = (info.currentIndex + 1) % totalFrames

        // Progressive Playback: 다음 프레임이 로드되었는지 확인
        const isNextFrameLoaded = store.isFrameLoaded(slotId, nextIndex)

        if (!isNextFrameLoaded) {
          // 버퍼링 상태로 전환 (이 슬롯은 스킵)
          if (DEBUG_CINE) {
            console.log(`[CineManager] Buffering slot ${slotId}: frame ${nextIndex} not loaded`)
          }
          store.setBuffering(slotId, true)
          return // 이 슬롯은 스킵, 다음 프레임에서 다시 시도
        }

        // 버퍼링 해제 (정상 재생)
        store.setBuffering(slotId, false)

        // 프레임 인덱스 업데이트 (내부 상태)
        info.currentIndex = nextIndex

        // Viewport 직접 조작 (React 상태 업데이트 없음!)
        try {
          viewport.setImageIdIndex(nextIndex)
          viewport.render()
        } catch (error) {
          console.error(`[CineManager] Error updating viewport for slot ${slotId}:`, error)
        }
      })
    }

    this.animationId = requestAnimationFrame(this.animate)
  }

  /**
   * 애니메이션 루프 시작
   */
  start(): void {
    if (this.animationId !== null) return
    this.lastFrameTime = performance.now()
    this.animationId = requestAnimationFrame(this.animate)
    if (DEBUG_CINE) console.log('[CineManager] Animation loop started')
  }

  /**
   * 애니메이션 루프 중지
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
      if (DEBUG_CINE) console.log('[CineManager] Animation loop stopped')
    }
  }

  /**
   * 슬롯 등록 (재생 시작 시 호출)
   * @param slotId 슬롯 ID
   */
  registerSlot(slotId: number): void {
    const wasEmpty = this.activeSlots.size === 0
    this.activeSlots.add(slotId)
    if (wasEmpty) this.start()
    if (DEBUG_CINE) console.log(`[CineManager] Slot ${slotId} registered, active: ${this.activeSlots.size}`)
  }

  /**
   * 슬롯 등록 해제 (재생 중지 시 호출)
   * Phase 2: 중지 시 Zustand와 프레임 인덱스 동기화
   * @param slotId 슬롯 ID
   */
  unregisterSlot(slotId: number): void {
    this.activeSlots.delete(slotId)

    // Phase 2: 재생 중지 시 현재 프레임 인덱스를 Zustand에 동기화
    const info = this.viewports.get(slotId)
    if (info) {
      useCornerstoneMultiViewerStore.getState().setSlotFrame(slotId, info.currentIndex)
      if (DEBUG_CINE) console.log(`[CineManager] Synced frame index ${info.currentIndex} to Zustand for slot ${slotId}`)
    }

    if (this.activeSlots.size === 0) this.stop()
    if (DEBUG_CINE) console.log(`[CineManager] Slot ${slotId} unregistered, active: ${this.activeSlots.size}`)
  }

  /**
   * 현재 활성 슬롯 목록 반환
   */
  getActiveSlots(): number[] {
    return Array.from(this.activeSlots)
  }

  /**
   * 애니메이션 루프 실행 중인지 확인
   */
  isRunning(): boolean {
    return this.animationId !== null
  }

  /**
   * Viewport 등록 여부 확인
   * @param slotId 슬롯 ID
   */
  hasViewport(slotId: number): boolean {
    return this.viewports.has(slotId)
  }
}

// 싱글톤 인스턴스 export
export const cineAnimationManager = new CineAnimationManager()
