/**
 * CineAnimationManager - Cornerstone 뷰어용 Cine 애니메이션 관리자
 *
 * BaseCineAnimationManager를 상속하여 Progressive Playback 기능 추가
 * - 다음 프레임이 로드되지 않았으면 버퍼링 상태로 전환
 * - 버퍼링 중에는 해당 슬롯 스킵
 */

import { BaseCineAnimationManager, type FrameAdvanceResult } from '@/lib/utils/BaseCineAnimationManager'
import { useCornerstoneMultiViewerStore } from '../stores/cornerstoneMultiViewerStore'

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_CINE = false

class CineAnimationManager extends BaseCineAnimationManager {
  constructor() {
    super()
    this.debugEnabled = DEBUG_CINE
    this.logPrefix = '[CineManager]'
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
