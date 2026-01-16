/**
 * WadoRsBulkDataCineAnimationManager - WADO-RS BulkData 뷰어용 Cine 애니메이션 관리자
 *
 * BaseCineAnimationManager를 상속하여 WADO-RS BulkData store와 연동
 * Progressive Playback 지원: 프레임이 로드되지 않았으면 버퍼링
 */

import { BaseCineAnimationManager, type FrameAdvanceResult } from '@/lib/utils/BaseCineAnimationManager'
import { useWadoRsBulkDataMultiViewerStore } from '../stores/wadoRsBulkDataMultiViewerStore'
import { createWadoRsBulkDataImageIds } from './wadoRsBulkDataImageIdHelper'
import { loadWadoRsBulkDataImage } from './wadoRsBulkDataImageLoader'

// 디버그 로그 플래그 (필요시 true로 변경)
const DEBUG_CINE = false

// Prefetch 선행 로딩 프레임 수
const PREFETCH_LOOKAHEAD = 3

class WadoRsBulkDataCineAnimationManager extends BaseCineAnimationManager {
  constructor() {
    super()
    this.debugEnabled = DEBUG_CINE
    this.logPrefix = '[WadoRsBulkDataCineManager]'
  }

  /**
   * 어떤 슬롯이 버퍼링 중인지 확인 (global-sync 모드용)
   * 모든 활성 슬롯의 다음 프레임이 로드되었는지 확인
   */
  protected override checkAnySlotBuffering(): boolean {
    const store = useWadoRsBulkDataMultiViewerStore.getState()
    const activeSlots = this.getActiveSlots()

    for (const slotId of activeSlots) {
      const info = this.viewports.get(slotId)
      if (!info) continue

      const slot = store.slots[slotId]
      if (!slot) continue

      const nextIndex = (info.currentIndex + 1) % info.totalFrames
      if (!slot.loadedFrames.has(nextIndex)) {
        if (this.debugEnabled) {
          console.log(`${this.logPrefix} Global sync: slot ${slotId} buffering at frame ${nextIndex}`)
        }
        return true
      }
    }
    return false
  }

  /**
   * 프레임 전진 전 버퍼링 체크 (Progressive Playback)
   *
   * 다음 프레임이 로드되지 않았으면 shouldAdvance=false 반환하여
   * 현재 프레임에 머물며 버퍼링 상태 표시
   */
  protected override onFrameAdvance(slotId: number, currentIndex: number, totalFrames: number): FrameAdvanceResult {
    const store = useWadoRsBulkDataMultiViewerStore.getState()
    const slot = store.slots[slotId]

    if (!slot) {
      return { shouldAdvance: false, nextIndex: currentIndex }
    }

    const nextIndex = (currentIndex + 1) % totalFrames

    // 다음 프레임이 로드되었는지 확인
    const isNextFrameLoaded = slot.loadedFrames.has(nextIndex)

    if (!isNextFrameLoaded) {
      // 버퍼링 상태 표시 (isBuffering = true)
      if (!slot.isBuffering) {
        useWadoRsBulkDataMultiViewerStore.setState((state) => ({
          slots: {
            ...state.slots,
            [slotId]: {
              ...state.slots[slotId],
              isBuffering: true,
            },
          },
        }))
      }

      if (DEBUG_CINE) {
        console.log(`[WadoRsBulkDataCineManager] Buffering slot ${slotId}: frame ${nextIndex} not loaded`)
      }

      // 현재 프레임에 머물기
      return { shouldAdvance: false, nextIndex: currentIndex }
    }

    // 버퍼링 상태 해제 (isBuffering = false)
    if (slot.isBuffering) {
      useWadoRsBulkDataMultiViewerStore.setState((state) => ({
        slots: {
          ...state.slots,
          [slotId]: {
            ...state.slots[slotId],
            isBuffering: false,
          },
        },
      }))
    }

    // Prefetch 트리거 (다음 N프레임 선행 로딩)
    this.triggerPrefetch(slotId, nextIndex)

    // 다음 프레임으로 전진
    return { shouldAdvance: true, nextIndex }
  }

  /**
   * 현재 프레임 기준 다음 N프레임 선행 로딩
   * 버퍼링 빈도를 줄이기 위해 앞선 프레임을 미리 로드
   */
  private triggerPrefetch(slotId: number, currentIndex: number): void {
    const store = useWadoRsBulkDataMultiViewerStore.getState()
    const slot = store.slots[slotId]
    if (!slot?.instance) return

    const { numberOfFrames, studyInstanceUid, seriesInstanceUid, sopInstanceUid } = slot.instance

    // 다음 N프레임 중 미로드 프레임 확인 및 로드 요청
    for (let i = 1; i <= PREFETCH_LOOKAHEAD; i++) {
      const frameIndex = (currentIndex + i) % numberOfFrames
      if (!slot.loadedFrames.has(frameIndex)) {
        const imageIds = createWadoRsBulkDataImageIds(
          studyInstanceUid,
          seriesInstanceUid,
          sopInstanceUid,
          numberOfFrames
        )
        // 백그라운드 로딩 (await 없이, 실패 무시)
        loadWadoRsBulkDataImage(imageIds[frameIndex]).then(() => {
          // 로드 성공 시 마킹
          store.markFrameLoaded(slotId, frameIndex)
        }).catch(() => {
          // 실패 시 무시 (다음 기회에 재시도)
        })

        if (DEBUG_CINE) {
          console.log(`${this.logPrefix} Prefetch: slot ${slotId} frame ${frameIndex}`)
        }
      }
    }
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
