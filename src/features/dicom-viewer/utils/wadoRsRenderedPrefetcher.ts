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

// 디버그 로그 플래그 (테스트 후 false로 변경)
const DEBUG_PREFETCHER = true

// 프리페치 통계
let totalPrefetchCalls = 0
let totalFramesPrefetched = 0
let totalBytesPrefetched = 0

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
 * @returns Rendered 프레임 URL
 */
function buildRenderedFrameUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber: number
): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10201'
  return `${baseUrl}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNumber}/rendered`
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
 * @returns 캐시된 프레임 수
 */
export async function prefetchRenderedFrameBatch(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumbers: number[],
  onProgress?: (loaded: number, total: number) => void
): Promise<number> {
  if (frameNumbers.length === 0) {
    return 0
  }

  // 이미 캐시된 프레임 필터링
  const uncachedFrames = frameNumbers.filter((frameNumber) => {
    const url = buildRenderedFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber)
    return !hasRenderedFrame(url)
  })

  if (uncachedFrames.length === 0) {
    if (DEBUG_PREFETCHER) {
      console.log(
        `[RenderedPrefetcher] All ${frameNumbers.length} frames already cached, skipping`
      )
    }
    onProgress?.(frameNumbers.length, frameNumbers.length)
    return frameNumbers.length
  }

  if (DEBUG_PREFETCHER) {
    console.log(
      `[RenderedPrefetcher] Prefetching ${uncachedFrames.length} frames (${frameNumbers.length - uncachedFrames.length} already cached)`
    )
  }

  totalPrefetchCalls++

  try {
    // 배치 API 호출 (ParsedFrame[] 반환)
    const parsedFrames = await retrieveRenderedFrameBatch(
      studyUid,
      seriesUid,
      sopInstanceUid,
      uncachedFrames
    )

    // 각 프레임을 캐시에 저장
    let cached = frameNumbers.length - uncachedFrames.length // 이미 캐시된 수
    let bytesCached = 0

    for (const frame of parsedFrames) {
      const url = buildRenderedFrameUrl(studyUid, seriesUid, sopInstanceUid, frame.frameNumber)
      cacheRenderedFrame(url, frame.data)

      cached++
      bytesCached += frame.data.byteLength
      totalFramesPrefetched++
      totalBytesPrefetched += frame.data.byteLength

      onProgress?.(cached, frameNumbers.length)
    }

    if (DEBUG_PREFETCHER) {
      console.log(
        `[RenderedPrefetcher] Prefetched ${parsedFrames.length} frames (${formatBytes(bytesCached)})`
      )
    }

    return cached
  } catch (error) {
    console.error('[RenderedPrefetcher] Prefetch failed:', error)
    throw error
  }
}

/**
 * 전체 인스턴스 Rendered 프레임 프리페치
 *
 * 지정된 배치 크기로 나누어 모든 프레임을 프리페치.
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param totalFrames 총 프레임 수
 * @param batchSize 배치 크기 (기본값: 10)
 * @param onProgress 진행 콜백 (loaded, total)
 * @returns 캐시된 총 프레임 수
 */
export async function prefetchAllRenderedFrames(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  totalFrames: number,
  batchSize: number = 10,
  onProgress?: (loaded: number, total: number) => void
): Promise<number> {
  if (totalFrames <= 0) {
    return 0
  }

  if (DEBUG_PREFETCHER) {
    console.log(
      `[RenderedPrefetcher] Starting prefetch of ${totalFrames} frames in batches of ${batchSize}`
    )
  }

  let totalCached = 0

  for (let i = 0; i < totalFrames; i += batchSize) {
    const frameNumbers: number[] = []
    for (let j = i; j < Math.min(i + batchSize, totalFrames); j++) {
      frameNumbers.push(j + 1) // 1-based
    }

    const cached = await prefetchRenderedFrameBatch(
      studyUid,
      seriesUid,
      sopInstanceUid,
      frameNumbers,
      (loaded, _total) => {
        const overallLoaded = i + loaded
        onProgress?.(overallLoaded, totalFrames)
      }
    )

    totalCached = i + cached
  }

  if (DEBUG_PREFETCHER) {
    console.log(`[RenderedPrefetcher] Prefetch complete: ${totalCached}/${totalFrames} frames`)
  }

  return totalCached
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
} {
  return {
    totalPrefetchCalls,
    totalFramesPrefetched,
    totalBytesPrefetched,
    avgFramesPerCall: totalPrefetchCalls > 0 ? totalFramesPrefetched / totalPrefetchCalls : 0,
  }
}

/**
 * 프리페치 통계 리셋
 */
export function resetRenderedPrefetcherStats(): void {
  totalPrefetchCalls = 0
  totalFramesPrefetched = 0
  totalBytesPrefetched = 0
}

/**
 * 바이트를 읽기 쉬운 형식으로 변환
 *
 * @param bytes 바이트 수
 * @returns 형식화된 문자열
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
