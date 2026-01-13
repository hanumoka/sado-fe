/**
 * WadoRsBulkDataCineAnimationManager - WADO-RS BulkData 뷰어용 Cine 애니메이션 관리자
 *
 * BaseCineAnimationManager를 상속하여 WADO-RS BulkData store와 연동
 */

import { BaseCineAnimationManager } from '@/lib/utils/BaseCineAnimationManager'
import { useWadoRsBulkDataMultiViewerStore } from '../stores/wadoRsBulkDataMultiViewerStore'

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_CINE = false

class WadoRsBulkDataCineAnimationManager extends BaseCineAnimationManager {
  constructor() {
    super()
    this.debugEnabled = DEBUG_CINE
    this.logPrefix = '[WadoRsBulkDataCineManager]'
  }

  /**
   * 슬롯 등록 해제 시 Zustand store에 프레임 인덱스 동기화
   */
  protected override onSlotUnregister(slotId: number, frameIndex: number): void {
    useWadoRsBulkDataMultiViewerStore.getState().setSlotFrame(slotId, frameIndex)
  }
}

// WADO-RS BulkData 전용 싱글톤 인스턴스
export const wadoRsBulkDataCineAnimationManager = new WadoRsBulkDataCineAnimationManager()
