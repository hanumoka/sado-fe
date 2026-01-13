/**
 * BaseCineAnimationManager - 공통 Cine 애니메이션 관리자 베이스 클래스
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
 * 사용법:
 * - 각 뷰어 타입별로 이 클래스를 상속하여 사용
 * - onFrameAdvance(): 프레임 전진 시 커스텀 로직 (Progressive Playback 등)
 * - onSlotUnregister(): 슬롯 등록 해제 시 store 동기화
 */

import type { Types } from '@cornerstonejs/core'

export interface ViewportInfo {
  viewport: Types.IStackViewport
  totalFrames: number
  currentIndex: number
}

export interface FrameAdvanceResult {
  /** 프레임을 전진해야 하는지 여부 */
  shouldAdvance: boolean
  /** 다음 프레임 인덱스 (shouldAdvance가 true일 때만 유효) */
  nextIndex: number
}

export abstract class BaseCineAnimationManager {
  private animationId: number | null = null
  private lastFrameTime: number = 0
  private activeSlots: Set<number> = new Set()
  private frameTime: number = 33.33 // 30fps default

  // Viewport 직접 참조 저장
  protected viewports: Map<number, ViewportInfo> = new Map()

  // 디버그 로그 플래그
  protected debugEnabled: boolean = false
  protected logPrefix: string = '[CineManager]'

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
   * Viewport 등록 (Slot 컴포넌트에서 viewport 생성 후 호출)
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
    if (this.debugEnabled) {
      console.log(`${this.logPrefix} Viewport registered for slot ${slotId}, totalFrames: ${totalFrames}`)
    }
  }

  /**
   * Viewport 등록 해제 (Slot cleanup 시 호출)
   * @param slotId 슬롯 ID
   */
  unregisterViewport(slotId: number): void {
    this.viewports.delete(slotId)
    if (this.debugEnabled) {
      console.log(`${this.logPrefix} Viewport unregistered for slot ${slotId}`)
    }
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
   * 프레임 전진 전 호출되는 훅 (오버라이드 가능)
   * Progressive Playback 등 커스텀 로직 구현용
   *
   * @param slotId 슬롯 ID
   * @param currentIndex 현재 프레임 인덱스
   * @param totalFrames 총 프레임 수
   * @returns 프레임 전진 여부 및 다음 인덱스
   */
  protected onFrameAdvance(_slotId: number, currentIndex: number, totalFrames: number): FrameAdvanceResult {
    // 기본 구현: 항상 다음 프레임으로 전진
    // _slotId는 서브클래스에서 Progressive Playback 등에 사용됨
    return {
      shouldAdvance: true,
      nextIndex: (currentIndex + 1) % totalFrames,
    }
  }

  /**
   * 슬롯 등록 해제 시 호출되는 훅 (오버라이드 필수)
   * 각 뷰어 타입의 Zustand store에 프레임 인덱스 동기화
   *
   * @param slotId 슬롯 ID
   * @param frameIndex 현재 프레임 인덱스
   */
  protected abstract onSlotUnregister(slotId: number, frameIndex: number): void

  /**
   * 중앙 애니메이션 루프
   * Zustand 상태 업데이트 없이 Viewport 직접 조작
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

      // Viewport 직접 업데이트 (React 우회)
      this.activeSlots.forEach((slotId) => {
        const info = this.viewports.get(slotId)
        if (!info) {
          if (this.debugEnabled) {
            console.warn(`${this.logPrefix} No viewport for slot ${slotId}`)
          }
          return
        }

        const { viewport, totalFrames } = info

        // 프레임 전진 훅 호출 (Progressive Playback 등)
        const result = this.onFrameAdvance(slotId, info.currentIndex, totalFrames)

        if (!result.shouldAdvance) {
          // 버퍼링 등의 이유로 스킵
          return
        }

        // 프레임 인덱스 업데이트 (내부 상태)
        info.currentIndex = result.nextIndex

        // Viewport 직접 조작 (React 상태 업데이트 없음!)
        try {
          viewport.setImageIdIndex(result.nextIndex)
          viewport.render()
        } catch (error) {
          if (this.debugEnabled) {
            console.error(`${this.logPrefix} Error updating viewport for slot ${slotId}:`, error)
          }
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
    if (this.debugEnabled) {
      console.log(`${this.logPrefix} Animation loop started`)
    }
  }

  /**
   * 애니메이션 루프 중지
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
      if (this.debugEnabled) {
        console.log(`${this.logPrefix} Animation loop stopped`)
      }
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
    if (this.debugEnabled) {
      console.log(`${this.logPrefix} Slot ${slotId} registered, active: ${this.activeSlots.size}`)
    }
  }

  /**
   * 슬롯 등록 해제 (재생 중지 시 호출)
   * 중지 시 Zustand와 프레임 인덱스 동기화
   * @param slotId 슬롯 ID
   */
  unregisterSlot(slotId: number): void {
    this.activeSlots.delete(slotId)

    // 재생 중지 시 현재 프레임 인덱스를 store에 동기화
    const info = this.viewports.get(slotId)
    if (info) {
      this.onSlotUnregister(slotId, info.currentIndex)
      if (this.debugEnabled) {
        console.log(`${this.logPrefix} Synced frame index ${info.currentIndex} to store for slot ${slotId}`)
      }
    }

    if (this.activeSlots.size === 0) this.stop()
    if (this.debugEnabled) {
      console.log(`${this.logPrefix} Slot ${slotId} unregistered, active: ${this.activeSlots.size}`)
    }
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
