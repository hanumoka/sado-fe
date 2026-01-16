/**
 * Cornerstone 프리로드 큐 매니저
 *
 * 한 번에 1개 슬롯만 프리로드하여 MJPEG 재생에 리소스 양보
 * 슬롯 번호 순서로 우선순위 부여
 *
 * 사용법:
 * 1. CornerstoneLayer에서 프리로드 시 enqueue() 호출
 * 2. 슬롯 인스턴스 변경/제거 시 cancel() 호출
 * 3. 전체 초기화 시 clear() 호출
 */

import { imageLoader } from '@cornerstonejs/core'

// 디버그 로그 플래그
const DEBUG_QUEUE = false

/**
 * 프리로드 태스크 타입
 */
type PreloadTask = {
  slotId: number
  imageIds: string[]
  onProgress: (progress: number) => void
  onComplete: () => void
  onError: (error: string) => void
}

/**
 * Cornerstone 프리로드 큐
 *
 * 특징:
 * - 한 번에 1개 슬롯만 프리로드
 * - 슬롯 번호 순서로 우선순위 (낮은 슬롯 먼저)
 * - 중간 취소 지원 (AbortController)
 * - 동일 슬롯 재요청 시 기존 태스크 대체
 */
class CornerstonePreloadQueue {
  private queue: PreloadTask[] = []
  private activeTask: PreloadTask | null = null
  private abortController: AbortController | null = null

  /**
   * 프리로드 요청 등록
   * 슬롯 번호 기준 정렬 삽입
   */
  enqueue(task: PreloadTask): void {
    // 동일 슬롯 기존 태스크 제거
    this.queue = this.queue.filter((t) => t.slotId !== task.slotId)

    // 슬롯 번호 순서로 삽입 (낮은 번호가 앞)
    const insertIndex = this.queue.findIndex((t) => t.slotId > task.slotId)
    if (insertIndex === -1) {
      this.queue.push(task)
    } else {
      this.queue.splice(insertIndex, 0, task)
    }

    if (DEBUG_QUEUE) {
      console.log(
        `[CornerstonePreloadQueue] Slot ${task.slotId} enqueued, queue size: ${this.queue.length}`
      )
    }

    this.processNext()
  }

  /**
   * 슬롯 프리로드 취소 (인스턴스 변경/제거 시)
   */
  cancel(slotId: number): void {
    // 큐에서 제거
    const hadInQueue = this.queue.some((t) => t.slotId === slotId)
    this.queue = this.queue.filter((t) => t.slotId !== slotId)

    // 현재 진행 중인 태스크면 중단
    if (this.activeTask?.slotId === slotId) {
      if (DEBUG_QUEUE) {
        console.log(`[CornerstonePreloadQueue] Slot ${slotId} cancelled (was active)`)
      }
      this.abortController?.abort()
      this.activeTask = null
      this.processNext()
    } else if (hadInQueue && DEBUG_QUEUE) {
      console.log(`[CornerstonePreloadQueue] Slot ${slotId} removed from queue`)
    }
  }

  /**
   * 다음 태스크 처리
   */
  private async processNext(): Promise<void> {
    // 이미 진행 중이거나 큐가 비었으면 스킵
    if (this.activeTask || this.queue.length === 0) return

    this.activeTask = this.queue.shift()!
    this.abortController = new AbortController()

    // 태스크 참조 저장 (cancel() 호출 시 this.activeTask가 null이 될 수 있음)
    const task = this.activeTask

    if (DEBUG_QUEUE) {
      console.log(
        `[CornerstonePreloadQueue] Slot ${task.slotId} preload started, ${task.imageIds.length} frames`
      )
    }

    try {
      await this.executePreload(task)
      // cancel()로 인해 activeTask가 null이 되었을 수 있으므로 저장된 task 사용
      task.onComplete()

      if (DEBUG_QUEUE) {
        console.log(`[CornerstonePreloadQueue] Slot ${task.slotId} preload completed`)
      }
    } catch (error) {
      // AbortError가 아닌 경우에만 onError 호출
      if ((error as Error).name !== 'AbortError') {
        task.onError((error as Error).message || 'Preload failed')

        if (DEBUG_QUEUE) {
          console.error(
            `[CornerstonePreloadQueue] Slot ${task.slotId} preload error:`,
            error
          )
        }
      }
    } finally {
      this.activeTask = null
      this.abortController = null
      this.processNext()
    }
  }

  /**
   * 실제 프리로드 실행 (순차 프레임 로딩)
   */
  private async executePreload(task: PreloadTask): Promise<void> {
    const { imageIds, onProgress } = task
    let loadedCount = 0

    for (const imageId of imageIds) {
      // 취소 확인
      if (this.abortController?.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      try {
        await imageLoader.loadImage(imageId)
        loadedCount++
        onProgress(Math.round((loadedCount / imageIds.length) * 100))
      } catch {
        // 개별 프레임 실패는 무시하고 계속 진행
      }
    }
  }

  /**
   * 전체 큐 초기화 (페이지 이동 등)
   */
  clear(): void {
    if (DEBUG_QUEUE) {
      console.log(`[CornerstonePreloadQueue] Queue cleared`)
    }

    this.queue = []
    this.abortController?.abort()
    this.activeTask = null
  }

  /**
   * 현재 상태 조회 (디버깅용)
   */
  getStatus(): {
    activeSlotId: number | null
    queuedSlotIds: number[]
  } {
    return {
      activeSlotId: this.activeTask?.slotId ?? null,
      queuedSlotIds: this.queue.map((t) => t.slotId),
    }
  }
}

// 싱글톤 인스턴스
export const cornerstonePreloadQueue = new CornerstonePreloadQueue()
