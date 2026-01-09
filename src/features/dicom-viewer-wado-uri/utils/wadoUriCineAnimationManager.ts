/**
 * WadoUriCineAnimationManager - WADO-URI 전용 중앙 집중식 애니메이션 루프 관리자
 *
 * dicom-viewer의 cineAnimationManager.ts와 완전 독립적인 구현
 * Phase 2 최적화: React 상태 우회 (Direct Viewport Manipulation)
 */

import type { Types } from '@cornerstonejs/core'
// WADO-URI 전용 store import (순환 참조 방지를 위해 동적 import 사용)
import { useWadoUriMultiViewerStore } from '../stores/wadoUriMultiViewerStore'

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_CINE = false

interface ViewportInfo {
  viewport: Types.IStackViewport
  totalFrames: number
  currentIndex: number
}

class WadoUriCineAnimationManager {
  private animationId: number | null = null
  private lastFrameTime: number = 0
  private activeSlots: Set<number> = new Set()
  private frameTime: number = 33.33 // 30fps default

  // Viewport 직접 참조 저장
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
   * Viewport 등록 (WadoUriSlot에서 viewport 생성 후 호출)
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
    if (DEBUG_CINE) console.log(`[WadoUriCineManager] Viewport registered for slot ${slotId}, totalFrames: ${totalFrames}`)
  }

  /**
   * Viewport 등록 해제 (WadoUriSlot cleanup 시 호출)
   * @param slotId 슬롯 ID
   */
  unregisterViewport(slotId: number): void {
    this.viewports.delete(slotId)
    if (DEBUG_CINE) console.log(`[WadoUriCineManager] Viewport unregistered for slot ${slotId}`)
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
          if (DEBUG_CINE) console.warn(`[WadoUriCineManager] No viewport for slot ${slotId}`)
          return
        }

        const { viewport, totalFrames } = info
        const nextIndex = (info.currentIndex + 1) % totalFrames

        // 프레임 인덱스 업데이트 (내부 상태)
        info.currentIndex = nextIndex

        // Viewport 직접 조작 (React 상태 업데이트 없음!)
        try {
          viewport.setImageIdIndex(nextIndex)
          viewport.render()
        } catch (error) {
          if (DEBUG_CINE) console.error(`[WadoUriCineManager] Error updating viewport for slot ${slotId}:`, error)
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
    if (DEBUG_CINE) console.log('[WadoUriCineManager] Animation loop started')
  }

  /**
   * 애니메이션 루프 중지
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
      if (DEBUG_CINE) console.log('[WadoUriCineManager] Animation loop stopped')
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
    if (DEBUG_CINE) console.log(`[WadoUriCineManager] Slot ${slotId} registered, active: ${this.activeSlots.size}`)
  }

  /**
   * 슬롯 등록 해제 (재생 중지 시 호출)
   * 중지 시 Zustand와 프레임 인덱스 동기화
   * @param slotId 슬롯 ID
   */
  unregisterSlot(slotId: number): void {
    this.activeSlots.delete(slotId)

    // 재생 중지 시 현재 프레임 인덱스를 Zustand에 동기화
    const info = this.viewports.get(slotId)
    if (info) {
      useWadoUriMultiViewerStore.getState().setSlotFrame(slotId, info.currentIndex)
      if (DEBUG_CINE) console.log(`[WadoUriCineManager] Synced frame index ${info.currentIndex} to Zustand for slot ${slotId}`)
    }

    if (this.activeSlots.size === 0) this.stop()
    if (DEBUG_CINE) console.log(`[WadoUriCineManager] Slot ${slotId} unregistered, active: ${this.activeSlots.size}`)
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

// WADO-URI 전용 싱글톤 인스턴스
export const wadoUriCineAnimationManager = new WadoUriCineAnimationManager()
