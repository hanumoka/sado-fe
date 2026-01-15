/**
 * CineAnimationManager - Cornerstone 뷰어용 Cine 애니메이션 관리자
 *
 * BaseCineAnimationManager를 상속하여 Progressive Playback 기능 추가
 * - 다음 프레임이 로드되지 않았으면 버퍼링 상태로 전환
 * - 버퍼링 중에는 해당 슬롯 스킵
 * - GPU 텍스처 워밍업: 재생 전 모든 프레임을 한 번씩 렌더링하여 GPU 텍스처 생성
 */

import { BaseCineAnimationManager, type FrameAdvanceResult } from '@/lib/utils/BaseCineAnimationManager'
import { useCornerstoneMultiViewerStore } from '../stores/cornerstoneMultiViewerStore'

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_CINE = false

class CineAnimationManager extends BaseCineAnimationManager {
  // GPU 텍스처 워밍업 완료된 슬롯 추적
  private warmedUpSlots: Set<number> = new Set()

  constructor() {
    super()
    this.debugEnabled = DEBUG_CINE
    this.logPrefix = '[CineManager]'
  }

  /**
   * GPU 텍스처 워밍업
   * 모든 프레임을 한 번씩 렌더링하여 GPU 텍스처를 미리 생성
   * 첫 번째 재생 사이클의 이미지 깨짐 문제 해결
   *
   * @param slotId 슬롯 ID
   * @returns Promise<void>
   */
  async warmupGpuTextures(slotId: number): Promise<void> {
    // 이미 워밍업된 슬롯은 스킵
    if (this.warmedUpSlots.has(slotId)) {
      if (this.debugEnabled) {
        console.log(`${this.logPrefix} Slot ${slotId} already warmed up, skipping`)
      }
      return
    }

    const info = this.viewports.get(slotId)
    if (!info) {
      if (this.debugEnabled) {
        console.warn(`${this.logPrefix} No viewport for slot ${slotId}, cannot warmup`)
      }
      return
    }

    const { viewport, totalFrames } = info
    const originalIndex = info.currentIndex

    if (this.debugEnabled) {
      console.log(`${this.logPrefix} Starting GPU texture warmup for slot ${slotId} (${totalFrames} frames)`)
    }

    // 모든 프레임을 빠르게 순회하며 GPU 텍스처 생성
    for (let i = 0; i < totalFrames; i++) {
      try {
        viewport.setImageIdIndex(i)
        viewport.render()
      } catch (error) {
        if (this.debugEnabled) {
          console.warn(`${this.logPrefix} Warmup failed for frame ${i}:`, error)
        }
      }
    }

    // 원래 프레임으로 복귀
    viewport.setImageIdIndex(originalIndex)
    viewport.render()

    // 워밍업 완료 표시
    this.warmedUpSlots.add(slotId)

    if (this.debugEnabled) {
      console.log(`${this.logPrefix} GPU texture warmup completed for slot ${slotId}`)
    }
  }

  /**
   * 슬롯의 워밍업 상태 초기화 (캐시 클리어 등 시 호출)
   */
  resetWarmupState(slotId: number): void {
    this.warmedUpSlots.delete(slotId)
  }

  /**
   * 모든 슬롯의 워밍업 상태 초기화
   */
  resetAllWarmupStates(): void {
    this.warmedUpSlots.clear()
  }

  /**
   * Progressive Playback: 다음 프레임 로드 여부 확인
   */
  protected override onFrameAdvance(slotId: number, currentIndex: number, totalFrames: number): FrameAdvanceResult {
    const nextIndex = (currentIndex + 1) % totalFrames
    const store = useCornerstoneMultiViewerStore.getState()

    // Progressive Playback: 다음 프레임이 로드되었는지 확인
    const isNextFrameLoaded = store.isFrameLoaded(slotId, nextIndex)

    if (!isNextFrameLoaded) {
      // 버퍼링 상태로 전환 (이 슬롯은 스킵)
      if (this.debugEnabled) {
        console.log(`${this.logPrefix} Buffering slot ${slotId}: frame ${nextIndex} not loaded`)
      }
      store.setBuffering(slotId, true)
      return { shouldAdvance: false, nextIndex }
    }

    // 버퍼링 해제 (정상 재생)
    store.setBuffering(slotId, false)

    return { shouldAdvance: true, nextIndex }
  }

  /**
   * 슬롯 등록 해제 시 Zustand store에 프레임 인덱스 동기화
   */
  protected override onSlotUnregister(slotId: number, frameIndex: number): void {
    useCornerstoneMultiViewerStore.getState().setSlotFrame(slotId, frameIndex)
  }
}

// 싱글톤 인스턴스 export
export const cineAnimationManager = new CineAnimationManager()
