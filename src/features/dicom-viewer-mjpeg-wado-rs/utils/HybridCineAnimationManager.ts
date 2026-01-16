/**
 * HybridCineAnimationManager
 *
 * 하이브리드 뷰어 전용 Cine 애니메이션 관리자 (싱글톤)
 * BaseCineAnimationManager를 확장하여 Cornerstone 레이어의 재생 제어
 *
 * 주의: 기존 뷰어의 CineAnimationManager와 완전 독립
 * - wadoRsBulkDataCineAnimationManager (X)
 * - cineAnimationManager (X)
 */

import { BaseCineAnimationManager } from '@/lib/utils/BaseCineAnimationManager'
import { useHybridMultiViewerStore } from '../stores/hybridMultiViewerStore'

/**
 * 하이브리드 뷰어용 Cine 애니메이션 관리자
 */
class HybridCineAnimationManager extends BaseCineAnimationManager {
  private static instance: HybridCineAnimationManager | null = null

  private constructor() {
    super()
    this.logPrefix = '[HybridCineManager]'
    this.debugEnabled = false
  }

  static getInstance(): HybridCineAnimationManager {
    if (!HybridCineAnimationManager.instance) {
      HybridCineAnimationManager.instance = new HybridCineAnimationManager()
    }
    return HybridCineAnimationManager.instance
  }

  /**
   * 슬롯 등록 해제 시 store에 프레임 인덱스 동기화
   */
  protected onSlotUnregister(slotId: number, frameIndex: number): void {
    useHybridMultiViewerStore.getState().updateCornerstoneState(slotId, {
      currentFrame: frameIndex,
    })
  }

  /**
   * 버퍼링 체크 (Global Sync 모드용)
   * 하이브리드 뷰어는 항상 프리로드 완료 후 재생하므로 버퍼링 없음
   */
  protected checkAnySlotBuffering(): boolean {
    // 하이브리드 뷰어는 Cornerstone 레이어가 준비된 후에만 재생
    // 따라서 버퍼링이 발생하지 않음
    return false
  }

  /**
   * 디버그 모드 설정
   */
  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
  }
}

// 싱글톤 인스턴스 export
export const hybridCineAnimationManager = HybridCineAnimationManager.getInstance()
