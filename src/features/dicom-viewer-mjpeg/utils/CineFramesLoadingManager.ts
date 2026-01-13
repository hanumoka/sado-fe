/**
 * CineFramesLoadingManager
 *
 * 병렬 로딩 큐 시스템으로 다중 슬롯 프레임 로딩 최적화
 *
 * 문제:
 * - 4x4 레이아웃에서 16개 슬롯이 동시에 fetch하면 서버 부하 급증
 * - 브라우저 동시 연결 제한으로 일부 요청이 지연됨
 *
 * 해결:
 * - 동시 로딩 수 제한 (기본 4개)
 * - 큐 기반 순차 처리
 * - 로딩 진행률 콜백
 * - 취소 기능
 */

import { fetchAllCineFrames, decodeAllFrames, type CineFramesResponse } from './cineFramesApi'
import type { MjpegResolution } from '../types'

/** 로딩 상태 */
export type LoadingStatus = 'idle' | 'queued' | 'loading' | 'decoding' | 'completed' | 'error'

/** 로딩 진행률 정보 */
export interface LoadingProgress {
  slotId: number
  status: LoadingStatus
  progress: number // 0-100
  error?: string
}

/** 로딩 결과 */
export interface LoadingResult {
  slotId: number
  sopInstanceUid: string
  frames: HTMLImageElement[]
  success: boolean
  error?: string
}

/** 로딩 작업 */
interface LoadingTask {
  slotId: number
  sopInstanceUid: string
  resolution: MjpegResolution
  onProgress: (progress: LoadingProgress) => void
  onComplete: (result: LoadingResult) => void
}

/** 로딩 매니저 설정 */
interface LoadingManagerConfig {
  /** 최대 동시 로딩 수 (기본: 4) */
  maxConcurrent?: number
  /** 디버그 로그 활성화 */
  debug?: boolean
}

/**
 * Cine Frames 로딩 매니저 (싱글톤)
 */
class CineFramesLoadingManager {
  private static instance: CineFramesLoadingManager | null = null

  private maxConcurrent: number = 4
  private debug: boolean = false

  // 큐와 활성 작업
  private queue: LoadingTask[] = []
  private activeCount: number = 0
  private activeSlots: Set<number> = new Set()

  // 캐시 (슬롯별 프레임)
  private frameCache: Map<number, HTMLImageElement[]> = new Map()
  private cacheKeys: Map<number, string> = new Map() // slotId → sopInstanceUid:resolution

  private constructor() {}

  static getInstance(): CineFramesLoadingManager {
    if (!CineFramesLoadingManager.instance) {
      CineFramesLoadingManager.instance = new CineFramesLoadingManager()
    }
    return CineFramesLoadingManager.instance
  }

  /**
   * 설정 변경
   */
  configure(config: LoadingManagerConfig): void {
    if (config.maxConcurrent !== undefined) {
      this.maxConcurrent = Math.max(1, Math.min(16, config.maxConcurrent))
    }
    if (config.debug !== undefined) {
      this.debug = config.debug
    }
    this.log(`Configured: maxConcurrent=${this.maxConcurrent}`)
  }

  /**
   * 프레임 로딩 요청
   */
  loadFrames(
    slotId: number,
    sopInstanceUid: string,
    resolution: MjpegResolution,
    onProgress: (progress: LoadingProgress) => void,
    onComplete: (result: LoadingResult) => void
  ): void {
    // 캐시 확인
    const cacheKey = `${sopInstanceUid}:${resolution}`
    const existingKey = this.cacheKeys.get(slotId)

    if (existingKey === cacheKey && this.frameCache.has(slotId)) {
      this.log(`Cache hit for slot ${slotId}`)
      onProgress({ slotId, status: 'completed', progress: 100 })
      onComplete({
        slotId,
        sopInstanceUid,
        frames: this.frameCache.get(slotId)!,
        success: true,
      })
      return
    }

    // 기존 로딩 취소
    if (this.activeSlots.has(slotId)) {
      this.cancelSlot(slotId)
    }

    // 큐에 추가
    const task: LoadingTask = {
      slotId,
      sopInstanceUid,
      resolution,
      onProgress,
      onComplete,
    }

    this.queue.push(task)
    onProgress({ slotId, status: 'queued', progress: 0 })
    this.log(`Queued slot ${slotId}, queue size: ${this.queue.length}`)

    // 처리 시작
    this.processQueue()
  }

  /**
   * 큐 처리
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const task = this.queue.shift()!
      this.activeCount++
      this.activeSlots.add(task.slotId)

      this.log(`Processing slot ${task.slotId}, active: ${this.activeCount}`)

      // 비동기 로딩 (await 없이 시작하여 병렬 처리)
      this.executeTask(task)
    }
  }

  /**
   * 단일 작업 실행
   */
  private async executeTask(task: LoadingTask): Promise<void> {
    const { slotId, sopInstanceUid, resolution, onProgress, onComplete } = task
    const cacheKey = `${sopInstanceUid}:${resolution}`

    try {
      // 1. 로딩 시작
      onProgress({ slotId, status: 'loading', progress: 10 })

      // 2. API 호출
      const response: CineFramesResponse = await fetchAllCineFrames(sopInstanceUid, resolution)

      if (!this.activeSlots.has(slotId)) {
        // 취소됨
        this.log(`Slot ${slotId} was cancelled during fetch`)
        return
      }

      onProgress({ slotId, status: 'loading', progress: 50 })

      // 3. 디코딩
      onProgress({ slotId, status: 'decoding', progress: 60 })
      const frames = await decodeAllFrames(response.frames)

      if (!this.activeSlots.has(slotId)) {
        this.log(`Slot ${slotId} was cancelled during decode`)
        return
      }

      if (frames.length === 0) {
        throw new Error('No frames decoded')
      }

      // 4. 캐시 저장
      this.frameCache.set(slotId, frames)
      this.cacheKeys.set(slotId, cacheKey)

      onProgress({ slotId, status: 'completed', progress: 100 })
      onComplete({
        slotId,
        sopInstanceUid,
        frames,
        success: true,
      })

      this.log(`Completed slot ${slotId}, ${frames.length} frames cached`)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Error loading slot ${slotId}: ${message}`)

      onProgress({ slotId, status: 'error', progress: 0, error: message })
      onComplete({
        slotId,
        sopInstanceUid,
        frames: [],
        success: false,
        error: message,
      })
    } finally {
      this.activeCount--
      this.activeSlots.delete(slotId)

      // 다음 작업 처리
      this.processQueue()
    }
  }

  /**
   * 특정 슬롯 로딩 취소
   */
  cancelSlot(slotId: number): void {
    // 큐에서 제거
    this.queue = this.queue.filter(task => task.slotId !== slotId)

    // 활성 작업 표시 제거 (실행 중인 fetch는 완료되지만 결과 무시됨)
    this.activeSlots.delete(slotId)

    this.log(`Cancelled slot ${slotId}`)
  }

  /**
   * 모든 로딩 취소
   */
  cancelAll(): void {
    this.queue = []
    this.activeSlots.clear()
    this.log('Cancelled all loading')
  }

  /**
   * 슬롯 캐시 가져오기
   */
  getCachedFrames(slotId: number): HTMLImageElement[] | null {
    return this.frameCache.get(slotId) ?? null
  }

  /**
   * 슬롯 캐시 삭제
   */
  clearSlotCache(slotId: number): void {
    this.frameCache.delete(slotId)
    this.cacheKeys.delete(slotId)
    this.log(`Cleared cache for slot ${slotId}`)
  }

  /**
   * 전체 캐시 삭제
   */
  clearAllCache(): void {
    this.frameCache.clear()
    this.cacheKeys.clear()
    this.log('Cleared all cache')
  }

  /**
   * 캐시 통계
   */
  getCacheStats(): {
    cachedSlots: number
    totalFrames: number
    estimatedMemoryMB: number
  } {
    let totalFrames = 0
    this.frameCache.forEach(frames => {
      totalFrames += frames.length
    })

    // 대략적인 메모리 추정 (256x256 RGBA = 256KB per frame)
    const estimatedMemoryMB = (totalFrames * 256 * 1024) / (1024 * 1024)

    return {
      cachedSlots: this.frameCache.size,
      totalFrames,
      estimatedMemoryMB: Math.round(estimatedMemoryMB * 100) / 100,
    }
  }

  /**
   * 현재 상태
   */
  getStatus(): {
    queueLength: number
    activeCount: number
    maxConcurrent: number
  } {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
    }
  }

  /**
   * 슬롯이 캐시되어 있는지 확인
   */
  isSlotCached(slotId: number): boolean {
    return this.frameCache.has(slotId)
  }

  /**
   * 슬롯이 현재 로딩 중인지 확인
   */
  isSlotLoading(slotId: number): boolean {
    return this.activeSlots.has(slotId) || this.queue.some(t => t.slotId === slotId)
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[CineFramesLoadingManager] ${message}`)
    }
  }
}

// 싱글톤 인스턴스 export
export const cineFramesLoadingManager = CineFramesLoadingManager.getInstance()
