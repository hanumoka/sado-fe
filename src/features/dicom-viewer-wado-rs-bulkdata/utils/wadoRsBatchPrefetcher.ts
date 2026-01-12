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
 * 상대 경로 사용:
 * - wadoRsBulkDataImageIdHelper.ts와 동일한 형식
 * - 캐시 키 정규화 시 경로만 비교하므로 일치 보장
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
  // 상대 경로 사용 (Vite 프록시 활용)
  return `/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNumber}`
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
 * 전체 인스턴스 프레임 프리페치 (병렬 배치 처리)
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
 * @returns 캐시된 총 프레임 수
 */
export async function prefetchAllFrames(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  totalFrames: number,
  batchSize: number = 10,
  onProgress?: (loaded: number, total: number) => void,
  onFrameLoaded?: (frameNumber: number) => void
): Promise<number> {
  if (totalFrames <= 0) {
    return 0
  }

  // 동시 요청 배치 수 (네트워크 활용도 ↑, 서버 부하 고려)
  const CONCURRENT_BATCHES = 3

  if (DEBUG_PREFETCHER) {
    console.log(
      `[WadoRsBatchPrefetcher] Starting prefetch of ${totalFrames} frames in batches of ${batchSize}, concurrent: ${CONCURRENT_BATCHES}`
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
    console.log(`[WadoRsBatchPrefetcher] Created ${allBatches.length} batches`)
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
        prefetchFrameBatch(
          studyUid,
          seriesUid,
          sopInstanceUid,
          frames,
          () => {
            // 진행률 업데이트: 배치 내부 진행은 무시
          }
        ).then((cached) => {
          // 공유 카운터 업데이트 후 진행률 보고
          globalLoadedCount += cached
          onProgress?.(Math.min(globalLoadedCount, totalFrames), totalFrames)

          // 개별 프레임 로드 콜백 (0-based로 변환)
          if (onFrameLoaded) {
            for (const frame of frames) {
              onFrameLoaded(frame - 1)
            }
          }

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
        console.warn('[WadoRsBatchPrefetcher] Batch failed:', result.reason)
      }
    }
  }

  if (DEBUG_PREFETCHER) {
    console.log(`[WadoRsBatchPrefetcher] Prefetch complete: ${totalCached}/${totalFrames} frames`)
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

