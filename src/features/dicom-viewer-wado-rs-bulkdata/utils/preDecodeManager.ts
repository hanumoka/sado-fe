/**
 * preDecodeManager.ts
 *
 * DICOM 프레임 사전 디코딩 관리자
 *
 * 재생 버튼 클릭 전에 프레임을 미리 디코딩하여
 * 즉시 재생 가능하도록 최적화
 *
 * 주요 기능:
 * 1. 프레임별 디코딩 상태 추적
 * 2. requestIdleCallback으로 백그라운드 디코딩 큐
 * 3. 우선순위 스케줄링 (현재 프레임 주변 우선)
 */

import { cache } from '@cornerstonejs/core'
import { idleDecodeScheduler, type DecodeTask } from './idleDecodeScheduler'

// 디버그 로그 플래그
const DEBUG_PREDECODE = false

/** 디코딩 상태 */
export type DecodeStatus = 'pending' | 'decoding' | 'decoded' | 'failed'

/** 슬롯별 사전 디코딩 상태 */
export interface SlotPreDecodeState {
  /** 프레임별 디코딩 상태 */
  frameStatus: Map<string, DecodeStatus>
  /** 프레임별 우선순위 */
  framePriority: Map<string, number>
  /** 디코딩 완료된 프레임 수 */
  decodedCount: number
  /** 전체 프레임 수 */
  totalFrames: number
  /** 현재 프레임 인덱스 (우선순위 계산용) */
  currentFrameIndex: number
}

/** 사전 디코딩 설정 */
export interface PreDecodeConfig {
  /** 우선순위 반경 (현재 프레임 ±N 프레임에 높은 우선순위) */
  priorityBoostRadius: number
  /** 기본 우선순위 */
  basePriority: number
  /** 우선순위 부스트 값 */
  priorityBoost: number
}

const DEFAULT_CONFIG: PreDecodeConfig = {
  priorityBoostRadius: 5,
  basePriority: 50,
  priorityBoost: 100,
}

/**
 * 사전 디코딩 관리자
 */
class PreDecodeManager {
  /** 슬롯별 상태 */
  private slotStates: Map<number, SlotPreDecodeState> = new Map()

  /** 설정 */
  private config: PreDecodeConfig = DEFAULT_CONFIG

  /** 상태 변경 리스너 */
  private listeners: Map<number, (state: SlotPreDecodeState) => void> = new Map()

  /**
   * 슬롯의 프레임들을 사전 디코딩 큐에 등록
   *
   * @param slotId 슬롯 ID
   * @param imageIds 이미지 ID 배열
   * @param priority 우선순위 ('high' | 'normal' | 'low')
   */
  preDecodeFrames(
    slotId: number,
    imageIds: string[],
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): void {
    if (imageIds.length === 0) return

    // 슬롯 상태 초기화 또는 업데이트
    let state = this.slotStates.get(slotId)
    if (!state) {
      state = {
        frameStatus: new Map(),
        framePriority: new Map(),
        decodedCount: 0,
        totalFrames: imageIds.length,
        currentFrameIndex: 0,
      }
      this.slotStates.set(slotId, state)
    }

    // 우선순위 기본값
    const basePriority =
      priority === 'high' ? 150 : priority === 'normal' ? this.config.basePriority : 10

    const tasks: DecodeTask[] = []

    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i]

      // 이미 디코딩됨 또는 진행 중이면 건너뜀
      const currentStatus = state.frameStatus.get(imageId)
      if (currentStatus === 'decoded' || currentStatus === 'decoding') {
        continue
      }

      // Cornerstone 캐시 확인 - 이미 캐시되어 있으면 디코딩 완료로 마킹
      const cachedImage = cache.getImage(imageId)
      if (cachedImage) {
        state.frameStatus.set(imageId, 'decoded')
        state.decodedCount++
        continue
      }

      // 상태 초기화
      state.frameStatus.set(imageId, 'pending')

      // 우선순위 계산 (현재 프레임 주변 높은 우선순위)
      const distanceFromCurrent = Math.abs(i - state.currentFrameIndex)
      const framePriority =
        distanceFromCurrent <= this.config.priorityBoostRadius
          ? basePriority + this.config.priorityBoost - distanceFromCurrent * 10
          : basePriority - Math.min(distanceFromCurrent, 50)

      state.framePriority.set(imageId, framePriority)

      // 디코딩 작업 생성
      tasks.push({
        id: imageId,
        priority: framePriority,
        slotId,
        execute: async () => {
          await this.executePreDecode(slotId, imageId)
        },
      })
    }

    // 상태 업데이트
    state.totalFrames = imageIds.length

    if (DEBUG_PREDECODE) {
      console.log(
        `[PreDecodeManager] Queued ${tasks.length} frames for slot ${slotId} ` +
          `(total: ${state.totalFrames}, decoded: ${state.decodedCount})`
      )
    }

    // 일괄 스케줄
    if (tasks.length > 0) {
      idleDecodeScheduler.scheduleBatch(tasks)
    }

    // 리스너 알림
    this.notifyListeners(slotId)
  }

  /**
   * 현재 프레임 인덱스 설정 (우선순위 재계산)
   *
   * @param slotId 슬롯 ID
   * @param frameIndex 현재 프레임 인덱스
   */
  setCurrentFrame(slotId: number, frameIndex: number): void {
    const state = this.slotStates.get(slotId)
    if (!state) return

    const prevIndex = state.currentFrameIndex
    state.currentFrameIndex = frameIndex

    // 프레임 인덱스가 크게 변경되면 우선순위 재계산
    if (Math.abs(prevIndex - frameIndex) > this.config.priorityBoostRadius) {
      this.recalculatePriorities(slotId)
    }
  }

  /**
   * 프레임 디코딩 상태 조회
   *
   * @param imageId 이미지 ID
   */
  getDecodeStatus(imageId: string): DecodeStatus {
    // 모든 슬롯에서 검색
    for (const state of this.slotStates.values()) {
      const status = state.frameStatus.get(imageId)
      if (status) return status
    }
    return 'pending'
  }

  /**
   * 슬롯의 사전 디코딩 상태 조회
   *
   * @param slotId 슬롯 ID
   */
  getSlotState(slotId: number): SlotPreDecodeState | null {
    return this.slotStates.get(slotId) || null
  }

  /**
   * 슬롯의 디코딩 진행률 조회 (0-100)
   *
   * @param slotId 슬롯 ID
   */
  getProgress(slotId: number): number {
    const state = this.slotStates.get(slotId)
    if (!state || state.totalFrames === 0) return 0
    return Math.round((state.decodedCount / state.totalFrames) * 100)
  }

  /**
   * 특정 프레임 디코딩 완료 대기
   *
   * @param imageId 이미지 ID
   * @param timeout 타임아웃 (ms)
   */
  waitForDecode(imageId: string, timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      // 이미 디코딩됨
      if (this.getDecodeStatus(imageId) === 'decoded') {
        resolve()
        return
      }

      // Cornerstone 캐시 확인
      if (cache.getImage(imageId)) {
        resolve()
        return
      }

      // 폴링으로 대기
      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        if (this.getDecodeStatus(imageId) === 'decoded' || cache.getImage(imageId)) {
          clearInterval(checkInterval)
          resolve()
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          reject(new Error(`Timeout waiting for decode: ${imageId}`))
        }
      }, 50)
    })
  }

  /**
   * 슬롯의 사전 디코딩 취소
   *
   * @param slotId 슬롯 ID
   */
  cancelSlot(slotId: number): void {
    const cancelled = idleDecodeScheduler.cancelBySlotId(slotId)
    this.slotStates.delete(slotId)

    if (DEBUG_PREDECODE) {
      console.log(`[PreDecodeManager] Cancelled ${cancelled} tasks for slot ${slotId}`)
    }
  }

  /**
   * 모든 사전 디코딩 취소
   */
  cancelAll(): void {
    idleDecodeScheduler.cancelAll()
    this.slotStates.clear()

    if (DEBUG_PREDECODE) {
      console.log('[PreDecodeManager] All pre-decode tasks cancelled')
    }
  }

  /**
   * 일시 중지
   */
  pause(): void {
    idleDecodeScheduler.pause()
  }

  /**
   * 재개
   */
  resume(): void {
    idleDecodeScheduler.resume()
  }

  /**
   * 상태 변경 리스너 등록
   *
   * @param slotId 슬롯 ID
   * @param callback 콜백 함수
   */
  subscribe(slotId: number, callback: (state: SlotPreDecodeState) => void): () => void {
    this.listeners.set(slotId, callback)
    return () => {
      this.listeners.delete(slotId)
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<PreDecodeConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      scheduler: idleDecodeScheduler.getStats(),
      slots: Array.from(this.slotStates.entries()).map(([slotId, state]) => ({
        slotId,
        totalFrames: state.totalFrames,
        decodedCount: state.decodedCount,
        progress: this.getProgress(slotId),
      })),
    }
  }

  /**
   * 실제 사전 디코딩 실행
   */
  private async executePreDecode(slotId: number, imageId: string): Promise<void> {
    const state = this.slotStates.get(slotId)
    if (!state) return

    // 상태 업데이트: decoding
    state.frameStatus.set(imageId, 'decoding')

    try {
      // Cornerstone 캐시에 이미 있는지 재확인
      if (cache.getImage(imageId)) {
        state.frameStatus.set(imageId, 'decoded')
        state.decodedCount++
        this.notifyListeners(slotId)
        return
      }

      // Cornerstone의 imageLoader를 통해 이미지 로드 + 디코딩
      // loadImage()는 내부적으로 Web Worker에서 디코딩 수행
      const { imageLoader } = await import('@cornerstonejs/core')
      await imageLoader.loadImage(imageId)

      // 성공
      state.frameStatus.set(imageId, 'decoded')
      state.decodedCount++

      if (DEBUG_PREDECODE) {
        console.log(
          `[PreDecodeManager] Pre-decoded ${imageId} (${state.decodedCount}/${state.totalFrames})`
        )
      }
    } catch (error) {
      // 실패
      state.frameStatus.set(imageId, 'failed')
      if (DEBUG_PREDECODE) {
        console.warn(`[PreDecodeManager] Pre-decode failed for ${imageId}:`, error)
      }
    }

    // 리스너 알림
    this.notifyListeners(slotId)
  }

  /**
   * 우선순위 재계산
   */
  private recalculatePriorities(slotId: number): void {
    const state = this.slotStates.get(slotId)
    if (!state) return

    // 모든 pending 프레임의 우선순위 재계산
    const tasks: DecodeTask[] = []

    let frameIndex = 0
    for (const [imageId, status] of state.frameStatus.entries()) {
      if (status === 'pending') {
        // 현재 스케줄에서 제거
        idleDecodeScheduler.cancelById(imageId)

        // 새 우선순위 계산
        const distanceFromCurrent = Math.abs(frameIndex - state.currentFrameIndex)
        const newPriority =
          distanceFromCurrent <= this.config.priorityBoostRadius
            ? this.config.basePriority + this.config.priorityBoost - distanceFromCurrent * 10
            : this.config.basePriority - Math.min(distanceFromCurrent, 50)

        state.framePriority.set(imageId, newPriority)

        tasks.push({
          id: imageId,
          priority: newPriority,
          slotId,
          execute: async () => {
            await this.executePreDecode(slotId, imageId)
          },
        })
      }
      frameIndex++
    }

    if (tasks.length > 0) {
      idleDecodeScheduler.scheduleBatch(tasks)
      if (DEBUG_PREDECODE) {
        console.log(`[PreDecodeManager] Recalculated priorities for ${tasks.length} frames in slot ${slotId}`)
      }
    }
  }

  /**
   * 리스너 알림
   */
  private notifyListeners(slotId: number): void {
    const state = this.slotStates.get(slotId)
    const listener = this.listeners.get(slotId)
    if (state && listener) {
      listener(state)
    }
  }
}

// 싱글톤 인스턴스
export const preDecodeManager = new PreDecodeManager()
