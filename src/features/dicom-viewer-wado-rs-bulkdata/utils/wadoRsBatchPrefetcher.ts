/**
 * wadoRsBatchPrefetcher.ts
 *
 * WADO-RS 배치 프리페처
 *
 * 배치 API를 사용하여 여러 프레임을 한 번에 로드하고
 * PixelData 캐시에 저장.
 *
 * 핵심 기능:
 * 1. 배치 API 호출 (/frames/1,2,3,4,5)
 * 2. multipart/related 응답 파싱
 * 3. PixelData 캐시에 저장
 *
 * 이후 cornerstoneDICOMImageLoader가 개별 프레임을 요청하면
 * Fetch Interceptor가 캐시에서 데이터를 반환함.
 */

import { retrieveFrameBatch } from '@/lib/services/dicomWebService'
import { cachePixelData, hasPixelData } from './wadoRsPixelDataCache'
import { API_BASE_URL } from '@/lib/config'
import { formatBytes } from '@/lib/utils'

// 디버그 로그 플래그
const DEBUG_PREFETCHER = false

// 프리페치 통계
let totalPrefetchCalls = 0
let totalFramesPrefetched = 0
let totalBytesPrefetched = 0

/**
 * 프레임 URL 생성
 *
 * cornerstoneDICOMImageLoader가 요청하는 URL과 동일한 형식으로 생성해야 함.
 * Fetch Interceptor가 이 URL을 캐시 키로 사용.
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (1-based)
 * @returns 프레임 URL
 */
function buildFrameUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber: number
): string {
  return `${API_BASE_URL}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNumber}`
}

/**
 * 프레임 배치 프리페치
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
export async function prefetchFrameBatch(
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
    const url = buildFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber)
    return !hasPixelData(url)
  })

  if (uncachedFrames.length === 0) {
    if (DEBUG_PREFETCHER) {
      if (DEBUG_PREFETCHER) console.log(
        `[WadoRsBatchPrefetcher] All ${frameNumbers.length} frames already cached, skipping`
      )
    }
    onProgress?.(frameNumbers.length, frameNumbers.length)
    return frameNumbers.length
  }

  if (DEBUG_PREFETCHER) {
    if (DEBUG_PREFETCHER) console.log(
      `[WadoRsBatchPrefetcher] Prefetching ${uncachedFrames.length} frames (${frameNumbers.length - uncachedFrames.length} already cached)`
    )
  }

  totalPrefetchCalls++

  try {
    // 배치 API 호출
    const frameDataMap = await retrieveFrameBatch(
      studyUid,
      seriesUid,
      sopInstanceUid,
      uncachedFrames
    )

    // 각 프레임을 캐시에 저장
    let cached = frameNumbers.length - uncachedFrames.length // 이미 캐시된 수
    let bytesCached = 0

    for (const [frameNumber, pixelData] of frameDataMap) {
      const url = buildFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber)
      cachePixelData(url, pixelData)

      cached++
      bytesCached += pixelData.byteLength
      totalFramesPrefetched++
      totalBytesPrefetched += pixelData.byteLength

      onProgress?.(cached, frameNumbers.length)
    }

    if (DEBUG_PREFETCHER) {
      if (DEBUG_PREFETCHER) console.log(
        `[WadoRsBatchPrefetcher] Prefetched ${frameDataMap.size} frames (${formatBytes(bytesCached)})`
      )
    }

    return cached
  } catch (error) {
    if (DEBUG_PREFETCHER) console.error('[WadoRsBatchPrefetcher] Prefetch failed:', error)
    throw error
  }
}

/**
 * 전체 인스턴스 프레임 프리페치
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
export async function prefetchAllFrames(
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
    if (DEBUG_PREFETCHER) console.log(
      `[WadoRsBatchPrefetcher] Starting prefetch of ${totalFrames} frames in batches of ${batchSize}`
    )
  }

  let totalCached = 0

  for (let i = 0; i < totalFrames; i += batchSize) {
    const frameNumbers: number[] = []
    for (let j = i; j < Math.min(i + batchSize, totalFrames); j++) {
      frameNumbers.push(j + 1) // 1-based
    }

    const cached = await prefetchFrameBatch(
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
    if (DEBUG_PREFETCHER) if (DEBUG_PREFETCHER) console.log(`[WadoRsBatchPrefetcher] Prefetch complete: ${totalCached}/${totalFrames} frames`)
  }

  return totalCached
}

/**
 * 프리페치 통계 조회
 *
 * @returns 통계 객체
 */
export function getPrefetcherStats(): {
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
export function resetPrefetcherStats(): void {
  totalPrefetchCalls = 0
  totalFramesPrefetched = 0
  totalBytesPrefetched = 0
}

