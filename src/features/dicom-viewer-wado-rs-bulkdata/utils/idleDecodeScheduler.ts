/**
 * idleDecodeScheduler.ts
 *
 * 브라우저 유휴 시간을 활용한 백그라운드 디코딩 스케줄러
 * requestIdleCallback API를 사용하여 UI 블로킹 없이 프레임 디코딩
 *
 * Safari 호환성: requestIdleCallback 폴리필 포함
 */

// 디버그 로그 플래그
const DEBUG_SCHEDULER = false

/** 디코딩 작업 인터페이스 */
export interface DecodeTask {
  /** 작업 ID (imageId) */
  id: string
  /** 우선순위 (높을수록 먼저 실행) */
  priority: number
  /** 디코딩 실행 함수 */
  execute: () => Promise<void>
  /** 슬롯 ID (취소용) */
  slotId?: number
}

/** 스케줄러 통계 */
export interface SchedulerStats {
  /** 총 예약된 작업 수 */
  totalScheduled: number
  /** 완료된 작업 수 */
  completed: number
  /** 실패한 작업 수 */
  failed: number
  /** 취소된 작업 수 */
  cancelled: number
  /** 현재 큐 크기 */
  queueSize: number
  /** 평균 유휴 시간 (ms) */
  avgIdleTime: number
}

/**
 * requestIdleCallback 폴리필 (Safari 지원)
 * Safari는 requestIdleCallback을 지원하지 않으므로 setTimeout 기반 폴리필 제공
 */
const requestIdleCallbackPolyfill =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (callback: IdleRequestCallback, options?: IdleRequestOptions): number => {
        const start = Date.now()
        return window.setTimeout(() => {
          callback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          })
        }, options?.timeout ?? 1) as unknown as number
      }

const cancelIdleCallbackPolyfill =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number): void => {
        window.clearTimeout(id)
      }

/**
 * 유휴 시간 디코딩 스케줄러
 *
 * requestIdleCallback을 사용하여 브라우저가 유휴 상태일 때만 디코딩 실행
 * 우선순위 큐로 중요한 프레임 먼저 처리
 */
class IdleDecodeScheduler {
  /** 디코딩 작업 큐 (우선순위 정렬) */
  private queue: DecodeTask[] = []

  /** 스케줄 ID (중복 방지) */
  private scheduledId: number | null = null

  /** 작업 중인 상태 */
  private isProcessing = false

  /** 일시 중지 상태 */
  private isPaused = false

  /** 최소 유휴 시간 (ms) - 이보다 짧으면 작업 건너뜀 */
  private minIdleTime = 5

  /** 타임아웃 (ms) - 이 시간 내에 유휴 시간이 없으면 강제 실행 */
  private timeout = 100

  /** 통계 */
  private stats: SchedulerStats = {
    totalScheduled: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    queueSize: 0,
    avgIdleTime: 0,
  }

  /** 유휴 시간 기록 (평균 계산용) */
  private idleTimeHistory: number[] = []

  /**
   * 작업 예약
   *
   * @param task 디코딩 작업
   */
  schedule(task: DecodeTask): void {
    // 중복 작업 방지
    if (this.queue.some((t) => t.id === task.id)) {
      if (DEBUG_SCHEDULER) console.log(`[IdleDecodeScheduler] Task ${task.id} already queued, skipping`)
      return
    }

    this.queue.push(task)
    this.stats.totalScheduled++
    this.stats.queueSize = this.queue.length

    // 우선순위 내림차순 정렬
    this.queue.sort((a, b) => b.priority - a.priority)

    if (DEBUG_SCHEDULER) {
      console.log(`[IdleDecodeScheduler] Scheduled task ${task.id} (priority: ${task.priority}, queue: ${this.queue.length})`)
    }

    // 스케줄 시작
    this.scheduleNextBatch()
  }

  /**
   * 여러 작업 일괄 예약
   *
   * @param tasks 디코딩 작업 배열
   */
  scheduleBatch(tasks: DecodeTask[]): void {
    const newTasks = tasks.filter((task) => !this.queue.some((t) => t.id === task.id))

    if (newTasks.length === 0) return

    this.queue.push(...newTasks)
    this.stats.totalScheduled += newTasks.length
    this.stats.queueSize = this.queue.length

    // 우선순위 내림차순 정렬
    this.queue.sort((a, b) => b.priority - a.priority)

    if (DEBUG_SCHEDULER) {
      console.log(`[IdleDecodeScheduler] Scheduled ${newTasks.length} tasks (queue: ${this.queue.length})`)
    }

    this.scheduleNextBatch()
  }

  /**
   * 특정 슬롯의 작업 취소
   *
   * @param slotId 슬롯 ID
   */
  cancelBySlotId(slotId: number): number {
    const before = this.queue.length
    this.queue = this.queue.filter((task) => task.slotId !== slotId)
    const cancelled = before - this.queue.length

    this.stats.cancelled += cancelled
    this.stats.queueSize = this.queue.length

    if (DEBUG_SCHEDULER && cancelled > 0) {
      console.log(`[IdleDecodeScheduler] Cancelled ${cancelled} tasks for slot ${slotId}`)
    }

    return cancelled
  }

  /**
   * 특정 작업 취소
   *
   * @param taskId 작업 ID
   */
  cancelById(taskId: string): boolean {
    const index = this.queue.findIndex((task) => task.id === taskId)
    if (index === -1) return false

    this.queue.splice(index, 1)
    this.stats.cancelled++
    this.stats.queueSize = this.queue.length

    return true
  }

  /**
   * 모든 작업 취소
   */
  cancelAll(): void {
    this.stats.cancelled += this.queue.length
    this.queue = []
    this.stats.queueSize = 0

    if (this.scheduledId !== null) {
      cancelIdleCallbackPolyfill(this.scheduledId)
      this.scheduledId = null
    }

    if (DEBUG_SCHEDULER) {
      console.log('[IdleDecodeScheduler] All tasks cancelled')
    }
  }

  /**
   * 스케줄러 일시 중지
   */
  pause(): void {
    this.isPaused = true
    if (DEBUG_SCHEDULER) {
      console.log('[IdleDecodeScheduler] Paused')
    }
  }

  /**
   * 스케줄러 재개
   */
  resume(): void {
    this.isPaused = false
    this.scheduleNextBatch()
    if (DEBUG_SCHEDULER) {
      console.log('[IdleDecodeScheduler] Resumed')
    }
  }

  /**
   * 작업이 큐에 있는지 확인
   */
  isQueued(taskId: string): boolean {
    return this.queue.some((task) => task.id === taskId)
  }

  /**
   * 통계 조회
   */
  getStats(): SchedulerStats {
    return { ...this.stats }
  }

  /**
   * 통계 리셋
   */
  resetStats(): void {
    this.stats = {
      totalScheduled: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      queueSize: this.queue.length,
      avgIdleTime: 0,
    }
    this.idleTimeHistory = []
  }

  /**
   * 큐 크기 조회
   */
  getQueueSize(): number {
    return this.queue.length
  }

  /**
   * 다음 배치 스케줄
   */
  private scheduleNextBatch(): void {
    // 이미 스케줄됨, 일시 중지, 또는 빈 큐면 스킵
    if (this.scheduledId !== null || this.isPaused || this.queue.length === 0) {
      return
    }

    this.scheduledId = requestIdleCallbackPolyfill(
      (deadline) => {
        this.scheduledId = null
        this.processQueue(deadline)
      },
      { timeout: this.timeout }
    )
  }

  /**
   * 큐 처리
   */
  private async processQueue(deadline: IdleDeadline): Promise<void> {
    if (this.isPaused || this.isProcessing) {
      return
    }

    this.isProcessing = true

    try {
      // 유휴 시간 기록
      const initialIdleTime = deadline.timeRemaining()
      this.recordIdleTime(initialIdleTime)

      // 유휴 시간이 충분할 때까지 작업 실행
      while (this.queue.length > 0 && (deadline.timeRemaining() > this.minIdleTime || deadline.didTimeout)) {
        const task = this.queue.shift()
        if (!task) break

        this.stats.queueSize = this.queue.length

        try {
          await task.execute()
          this.stats.completed++
          if (DEBUG_SCHEDULER) {
            console.log(`[IdleDecodeScheduler] Completed task ${task.id} (remaining: ${deadline.timeRemaining().toFixed(1)}ms)`)
          }
        } catch (error) {
          this.stats.failed++
          if (DEBUG_SCHEDULER) {
            console.warn(`[IdleDecodeScheduler] Task ${task.id} failed:`, error)
          }
        }
      }
    } finally {
      this.isProcessing = false
    }

    // 남은 작업이 있으면 다음 유휴 시간에 계속
    if (this.queue.length > 0) {
      this.scheduleNextBatch()
    }
  }

  /**
   * 유휴 시간 기록 (평균 계산용)
   */
  private recordIdleTime(idleTime: number): void {
    this.idleTimeHistory.push(idleTime)
    // 최근 100개만 유지
    if (this.idleTimeHistory.length > 100) {
      this.idleTimeHistory.shift()
    }
    // 평균 계산
    this.stats.avgIdleTime =
      this.idleTimeHistory.reduce((sum, t) => sum + t, 0) / this.idleTimeHistory.length
  }
}

// 싱글톤 인스턴스
export const idleDecodeScheduler = new IdleDecodeScheduler()
