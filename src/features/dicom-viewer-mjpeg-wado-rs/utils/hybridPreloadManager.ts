/**
 * HybridPreloadManager
 *
 * 하이브리드 뷰어 전용 프레임 로딩 매니저 (싱글톤)
 * 기존 cineFramesLoadingManager와 완전 독립 (사이드이펙트 방지)
 *
 * 기능:
 * - MJPEG 프레임 병렬 로딩 큐
 * - 슬롯별 프레임 캐시
 * - 로딩 진행률 콜백
 */

import type { HybridMjpegResolution, MjpegLoadingProgress, MjpegLoadingResult } from '../types'

// ============================================================================
// API Types (cineFramesApi와 동일하지만 독립적으로 정의)
// ============================================================================

interface CineFramesResponse {
  sopInstanceUid: string
  numberOfFrames: number
  resolution: number
  frames: string[]
}

// ============================================================================
// Loading Task Types
// ============================================================================

interface LoadingTask {
  slotId: number
  sopInstanceUid: string
  resolution: HybridMjpegResolution
  onProgress: (progress: MjpegLoadingProgress) => void
  onComplete: (result: MjpegLoadingResult) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Cine 프레임 API 호출
 */
async function fetchAllCineFrames(
  sopInstanceUid: string,
  resolution: HybridMjpegResolution
): Promise<CineFramesResponse> {
  const url = `/dicomweb/cine-frames/${sopInstanceUid}?resolution=${resolution}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch cine frames: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Base64 → HTMLImageElement 변환
 */
function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * 모든 프레임 디코딩
 */
async function decodeAllFrames(frames: string[]): Promise<HTMLImageElement[]> {
  const imagePromises = frames.map((base64) => {
    if (!base64) return Promise.resolve(null)
    return base64ToImage(base64).catch(() => null)
  })

  const results = await Promise.all(imagePromises)
  return results.filter((img): img is HTMLImageElement => img !== null)
}

// ============================================================================
// HybridPreloadManager Class
// ============================================================================

/**
 * 하이브리드 뷰어용 프레임 로딩 매니저 (싱글톤)
 *
 * 주의: cineFramesLoadingManager와 완전 독립
 * 같은 슬롯 ID라도 서로 다른 캐시 공간 사용
 */
class HybridPreloadManager {
  private static instance: HybridPreloadManager | null = null

  private maxConcurrent: number = 4
  private debug: boolean = false

  // 큐와 활성 작업
  private queue: LoadingTask[] = []
  private activeCount: number = 0
  private activeSlots: Set<number> = new Set()

  // 캐시 (슬롯별 프레임)
  private frameCache: Map<number, HTMLImageElement[]> = new Map()
  private cacheKeys: Map<number, string> = new Map()

  private constructor() {}

  static getInstance(): HybridPreloadManager {
    if (!HybridPreloadManager.instance) {
      HybridPreloadManager.instance = new HybridPreloadManager()
    }
    return HybridPreloadManager.instance
  }

  /**
   * 설정 변경
   */
  configure(config: { maxConcurrent?: number; debug?: boolean }): void {
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
    resolution: HybridMjpegResolution,
    onProgress: (progress: MjpegLoadingProgress) => void,
    onComplete: (result: MjpegLoadingResult) => void
  ): void {
    const cacheKey = `${sopInstanceUid}:${resolution}`
    const existingKey = this.cacheKeys.get(slotId)

    // 캐시 히트
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

    this.processQueue()
  }

  /**
   * 큐 처리
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const task = this.queue.shift()!
      this.activeCount++
      this.activeSlots.add(task.slotId)

      this.log(`Processing slot ${task.slotId}, active: ${this.activeCount}`)
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
      onProgress({ slotId, status: 'loading', progress: 10 })

      const response = await fetchAllCineFrames(sopInstanceUid, resolution)

      if (!this.activeSlots.has(slotId)) {
        this.log(`Slot ${slotId} was cancelled during fetch`)
        return
      }

      onProgress({ slotId, status: 'loading', progress: 50 })
      onProgress({ slotId, status: 'decoding', progress: 60 })

      const frames = await decodeAllFrames(response.frames)

      if (!this.activeSlots.has(slotId)) {
        this.log(`Slot ${slotId} was cancelled during decode`)
        return
      }

      if (frames.length === 0) {
        throw new Error('No frames decoded')
      }

      // 캐시 저장
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
      this.processQueue()
    }
  }

  /**
   * 특정 슬롯 로딩 취소
   */
  cancelSlot(slotId: number): void {
    this.queue = this.queue.filter((task) => task.slotId !== slotId)
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
   * 캐시된 프레임 가져오기
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
   * 슬롯이 캐시되어 있는지 확인
   */
  isSlotCached(slotId: number): boolean {
    return this.frameCache.has(slotId)
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
    this.frameCache.forEach((frames) => {
      totalFrames += frames.length
    })

    const estimatedMemoryMB = (totalFrames * 256 * 1024) / (1024 * 1024)

    return {
      cachedSlots: this.frameCache.size,
      totalFrames,
      estimatedMemoryMB: Math.round(estimatedMemoryMB * 100) / 100,
    }
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[HybridPreloadManager] ${message}`)
    }
  }
}

// 싱글톤 인스턴스 export
export const hybridPreloadManager = HybridPreloadManager.getInstance()
