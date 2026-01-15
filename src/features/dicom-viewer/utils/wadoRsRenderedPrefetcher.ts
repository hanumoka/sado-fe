/**
 * wadoRsRenderedPrefetcher.ts
 *
 * WADO-RS Rendered 배치 프리페처
 *
 * 배치 API를 사용하여 여러 Rendered 프레임을 한 번에 로드하고
 * Rendered 캐시에 저장.
 *
 * 핵심 기능:
 * 1. 배치 API 호출 (/frames/1,2,3,4,5/rendered)
 * 2. multipart/related 응답 파싱 (PNG 이미지들)
 * 3. Rendered 캐시에 저장
 *
 * 이후 커스텀 로더가 개별 프레임을 요청하면
 * Rendered Interceptor가 캐시에서 데이터를 반환함.
 */

import { retrieveRenderedFrameBatch } from '@/lib/services/dicomWebService'
import { cacheRenderedFrame, hasRenderedFrame } from './wadoRsRenderedCache'
import { formatBytes } from '@/lib/utils'

// Vite 프록시를 통해 /dicomweb → http://localhost:10201 로 전달
// 절대 URL 대신 상대 경로 사용 (CORS 문제 방지)
const API_BASE = ''

// 디버그 로그 플래그
const DEBUG_PREFETCHER = false

// 프리페치 통계
let totalPrefetchCalls = 0
let totalFramesPrefetched = 0
let totalBytesPrefetched = 0

// Resolution별 통계 (크기 비교용)
interface ResolutionStats {
  frameCount: number
  totalBytes: number
  minBytes: number
  maxBytes: number
}
const resolutionStats = new Map<number, ResolutionStats>()

/**
 * Rendered 프레임 URL 생성
 *
 * 커스텀 로더가 요청하는 URL과 동일한 형식으로 생성해야 함.
 * Rendered Interceptor가 이 URL을 캐시 키로 사용.
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (1-based)
 * @param resolution 사전렌더링 해상도 (512/256/128, optional)
 * @returns Rendered 프레임 URL
 */
function buildRenderedFrameUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber: number,
  resolution?: number
): string {
  const baseUrl = `${API_BASE}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNumber}/rendered`
  return resolution && resolution !== 512 ? `${baseUrl}?resolution=${resolution}` : baseUrl
}

/**
 * Rendered 프레임 배치 프리페치
 *
 * 배치 API를 사용하여 여러 프레임을 한 번에 로드하고 캐시에 저장.
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumbers 프레임 번호 배열 (1-based)
 * @param onProgress 진행 콜백 (loaded, total)
 * @param onFrameLoaded 개별 프레임 로드 콜백 (frameNumber: 0-based)
 * @param resolution 사전렌더링 해상도 (512/256/128, optional)
 * @returns 캐시된 프레임 수
 */
export async function prefetchRenderedFrameBatch(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumbers: number[],
  onProgress?: (loaded: number, total: number) => void,
  onFrameLoaded?: (frameNumber: number) => void,
  resolution?: number
): Promise<number> {
  if (frameNumbers.length === 0) {
    return 0
  }

  // 이미 캐시된 프레임 필터링 (resolution 포함한 URL)
  const uncachedFrames = frameNumbers.filter((frameNumber) => {
    const url = buildRenderedFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber, resolution)
    return !hasRenderedFrame(url)
  })

  if (uncachedFrames.length === 0) {
    if (DEBUG_PREFETCHER) {
      if (DEBUG_PREFETCHER) console.log(
        `[RenderedPrefetcher] All ${frameNumbers.length} frames already cached, skipping`
      )
    }
    onProgress?.(frameNumbers.length, frameNumbers.length)
    return frameNumbers.length
  }

  if (DEBUG_PREFETCHER) {
    if (DEBUG_PREFETCHER) console.log(
      `[RenderedPrefetcher] Prefetching ${uncachedFrames.length} frames (${frameNumbers.length - uncachedFrames.length} already cached)`
    )
  }

  totalPrefetchCalls++

  try {
    // 배치 API 호출 (ParsedFrame[] 반환, resolution 포함)
    const parsedFrames = await retrieveRenderedFrameBatch(
      studyUid,
      seriesUid,
      sopInstanceUid,
      uncachedFrames,
      resolution
    )

    // 각 프레임을 캐시에 저장 (resolution 포함한 URL)
    let cached = frameNumbers.length - uncachedFrames.length // 이미 캐시된 수
    let bytesCached = 0

    // Resolution별 통계를 위한 키 (512는 기본값으로 처리)
    const resKey = resolution || 512

    for (const frame of parsedFrames) {
      const url = buildRenderedFrameUrl(studyUid, seriesUid, sopInstanceUid, frame.frameNumber, resolution)
      cacheRenderedFrame(url, frame.data)

      const frameSize = frame.data.byteLength

      cached++
      bytesCached += frameSize
      totalFramesPrefetched++
      totalBytesPrefetched += frameSize

      // Resolution별 통계 업데이트
      const stats = resolutionStats.get(resKey) || {
        frameCount: 0,
        totalBytes: 0,
        minBytes: Infinity,
        maxBytes: 0,
      }
      stats.frameCount++
      stats.totalBytes += frameSize
      stats.minBytes = Math.min(stats.minBytes, frameSize)
      stats.maxBytes = Math.max(stats.maxBytes, frameSize)
      resolutionStats.set(resKey, stats)

      onProgress?.(cached, frameNumbers.length)
      // 개별 프레임 로드 즉시 콜백 (0-based로 변환)
      onFrameLoaded?.(frame.frameNumber - 1)
    }

    if (DEBUG_PREFETCHER) {
      if (DEBUG_PREFETCHER) console.log(
        `[RenderedPrefetcher] Prefetched ${parsedFrames.length} frames (${formatBytes(bytesCached)})`
      )
    }

    return cached
  } catch (error) {
    if (DEBUG_PREFETCHER) console.error('[RenderedPrefetcher] Prefetch failed:', error)
    throw error
  }
}

/**
 * 전체 인스턴스 Rendered 프레임 프리페치 (병렬 배치 처리)
 *
 * 지정된 배치 크기로 나누어 모든 프레임을 프리페치.
 * 병렬 배치 처리로 네트워크 활용도를 높임.
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param totalFrames 총 프레임 수
 * @param batchSize 배치 크기 (기본값: 10)
 * @param onProgress 진행 콜백 (loaded, total)
 * @param onFrameLoaded 개별 프레임 로드 콜백 (frameNumber: 0-based)
 * @param resolution 사전렌더링 해상도 (512/256/128, optional)
 * @returns 캐시된 총 프레임 수
 */
export async function prefetchAllRenderedFrames(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  totalFrames: number,
  batchSize: number = 10,
  onProgress?: (loaded: number, total: number) => void,
  onFrameLoaded?: (frameNumber: number) => void,
  resolution?: number
): Promise<number> {
  if (totalFrames <= 0) {
    return 0
  }

  // 동시 요청 배치 수 (3 → 4로 증가, 네트워크 활용도 ↑)
  const CONCURRENT_BATCHES = 4

  if (DEBUG_PREFETCHER) {
    console.log(
      `[RenderedPrefetcher] Starting prefetch of ${totalFrames} frames in batches of ${batchSize}, concurrent: ${CONCURRENT_BATCHES}`
    )
  }

  // 1. 모든 배치 생성
  const allBatches: number[][] = []
  for (let i = 0; i < totalFrames; i += batchSize) {
    const frames: number[] = []
    for (let j = i; j < Math.min(i + batchSize, totalFrames); j++) {
      frames.push(j + 1) // 1-based for API
    }
    allBatches.push(frames)
  }

  if (DEBUG_PREFETCHER) {
    console.log(`[RenderedPrefetcher] Created ${allBatches.length} batches`)
  }

  // 2. N개 배치씩 병렬 처리
  let totalCached = 0
  // 공유 카운터로 진행률 정확하게 추적 (병렬 처리 중에도 정확)
  let globalLoadedCount = 0

  for (let i = 0; i < allBatches.length; i += CONCURRENT_BATCHES) {
    const concurrentBatches = allBatches.slice(i, i + CONCURRENT_BATCHES)

    // 병렬 요청 - Promise.allSettled로 부분 실패 허용
    const results = await Promise.allSettled(
      concurrentBatches.map((frames) =>
        prefetchRenderedFrameBatch(
          studyUid,
          seriesUid,
          sopInstanceUid,
          frames,
          () => {
            // 진행률 업데이트: 배치 내부 진행은 무시
          },
          // 개별 프레임 로드 콜백 - 각 프레임 캐시 시 즉시 호출됨
          onFrameLoaded,
          resolution
        ).then((cached) => {
          // 공유 카운터 업데이트 후 진행률 보고
          globalLoadedCount += cached
          onProgress?.(Math.min(globalLoadedCount, totalFrames), totalFrames)
          return cached
        })
      )
    )

    // 결과 집계 - Promise.allSettled 결과 처리
    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalCached += result.value
      } else {
        // 실패한 배치 로그
        console.warn('[RenderedPrefetcher] Batch failed:', result.reason)
      }
    }
  }

  if (DEBUG_PREFETCHER) {
    console.log(`[RenderedPrefetcher] Prefetch complete: ${totalCached}/${totalFrames} frames`)
  }

  return totalCached
}

/**
 * Resolution별 통계 정보
 */
export interface ResolutionStatsInfo {
  resolution: number
  frameCount: number
  totalBytes: number
  avgBytes: number
  minBytes: number
  maxBytes: number
}

/**
 * 프리페치 통계 조회
 *
 * @returns 통계 객체
 */
export function getRenderedPrefetcherStats(): {
  totalPrefetchCalls: number
  totalFramesPrefetched: number
  totalBytesPrefetched: number
  avgFramesPerCall: number
  avgBytesPerFrame: number
  resolutionStats: ResolutionStatsInfo[]
} {
  // Resolution별 통계를 배열로 변환
  const resStats: ResolutionStatsInfo[] = []
  resolutionStats.forEach((stats, resolution) => {
    resStats.push({
      resolution,
      frameCount: stats.frameCount,
      totalBytes: stats.totalBytes,
      avgBytes: stats.frameCount > 0 ? Math.round(stats.totalBytes / stats.frameCount) : 0,
      minBytes: stats.minBytes === Infinity ? 0 : stats.minBytes,
      maxBytes: stats.maxBytes,
    })
  })

  // Resolution 순으로 정렬
  resStats.sort((a, b) => b.resolution - a.resolution)

  return {
    totalPrefetchCalls,
    totalFramesPrefetched,
    totalBytesPrefetched,
    avgFramesPerCall: totalPrefetchCalls > 0 ? totalFramesPrefetched / totalPrefetchCalls : 0,
    avgBytesPerFrame: totalFramesPrefetched > 0 ? Math.round(totalBytesPrefetched / totalFramesPrefetched) : 0,
    resolutionStats: resStats,
  }
}

/**
 * 특정 Resolution의 통계만 조회
 *
 * @param resolution 해상도 (512, 256, 128, 64, 32)
 * @returns Resolution 통계 또는 null
 */
export function getResolutionStats(resolution: number): ResolutionStatsInfo | null {
  const stats = resolutionStats.get(resolution)
  if (!stats) return null

  return {
    resolution,
    frameCount: stats.frameCount,
    totalBytes: stats.totalBytes,
    avgBytes: stats.frameCount > 0 ? Math.round(stats.totalBytes / stats.frameCount) : 0,
    minBytes: stats.minBytes === Infinity ? 0 : stats.minBytes,
    maxBytes: stats.maxBytes,
  }
}

/**
 * 프리페치 통계 리셋
 */
export function resetRenderedPrefetcherStats(): void {
  totalPrefetchCalls = 0
  totalFramesPrefetched = 0
  totalBytesPrefetched = 0
  resolutionStats.clear()
}

