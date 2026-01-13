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
 * 3. 압축 데이터 클라이언트 디코딩 (JPEG 2000, JPEG Baseline)
 * 4. PixelData 캐시에 저장
 *
 * 이후 cornerstoneDICOMImageLoader가 개별 프레임을 요청하면
 * Fetch Interceptor가 캐시에서 데이터를 반환함.
 */

import { retrieveFrameBatch, retrieveFrameBatchWithMetadata } from '@/lib/services/dicomWebService'
import { cachePixelData, hasPixelData } from './wadoRsPixelDataCache'
import { formatBytes } from '@/lib/utils'
import { decodeCompressedFrame, isCompressedContentType } from './frameDecoder'
import type { DicomPixelMetadata } from './wadoRsBulkDataMetadataProvider'

// 디버그 로그 플래그
const DEBUG_PREFETCHER = false

// 프리페치 통계
let totalPrefetchCalls = 0
let totalFramesPrefetched = 0
let totalBytesPrefetched = 0
let totalCompressedBytesFetched = 0

function buildFrameUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber: number,
  format?: 'raw' | 'original'
): string {
  const baseUrl = `/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNumber}`
  // format 쿼리 파라미터 추가 (캐시 키에 포함)
  if (format) {
    return `${baseUrl}?format=${format}`
  }
  return baseUrl
}

export interface PrefetchOptions {
  preferCompressed?: boolean
  format?: 'raw' | 'original'
  metadata?: DicomPixelMetadata
}

export async function prefetchFrameBatch(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumbers: number[],
  onProgress?: (loaded: number, total: number) => void,
  options?: PrefetchOptions
): Promise<number> {
  if (frameNumbers.length === 0) return 0

  const format = options?.format

  const uncachedFrames = frameNumbers.filter((frameNumber) => {
    // format을 포함한 URL로 캐시 키 생성
    const url = buildFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber, format)
    return !hasPixelData(url)
  })

  if (uncachedFrames.length === 0) {
    onProgress?.(frameNumbers.length, frameNumbers.length)
    return frameNumbers.length
  }

  totalPrefetchCalls++
  const preferCompressed = options?.preferCompressed ?? false
  const metadata = options?.metadata

  try {
    if (preferCompressed && metadata) {
      return await prefetchWithCompression(studyUid, seriesUid, sopInstanceUid, frameNumbers, uncachedFrames, metadata, onProgress, format)
    }
    return await prefetchRawPixels(studyUid, seriesUid, sopInstanceUid, frameNumbers, uncachedFrames, onProgress, format)
  } catch (error) {
    if (DEBUG_PREFETCHER) console.error('[WadoRsBatchPrefetcher] Prefetch failed:', error)
    throw error
  }
}

async function prefetchWithCompression(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumbers: number[],
  uncachedFrames: number[],
  metadata: DicomPixelMetadata,
  onProgress?: (loaded: number, total: number) => void,
  format?: 'raw' | 'original'
): Promise<number> {
  const frameDataMap = await retrieveFrameBatchWithMetadata(
    studyUid, seriesUid, sopInstanceUid, uncachedFrames,
    { preferCompressed: true, format }
  )

  let cached = frameNumbers.length - uncachedFrames.length
  let bytesCached = 0
  let compressedBytes = 0

  for (const [frameNumber, frameData] of frameDataMap) {
    // format을 포함한 URL로 캐시 키 생성
    const url = buildFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber, format)
    let pixelData: ArrayBuffer = frameData.data
    compressedBytes += frameData.data.byteLength

    if (isCompressedContentType(frameData.contentType)) {
      try {
        pixelData = await decodeCompressedFrame(frameData.data, frameData.contentType, metadata, frameData.transferSyntax)
      } catch (decodeError) {
        console.warn(`[WadoRsBatchPrefetcher] Frame ${frameNumber}: Decode failed`, decodeError)
      }
    }

    cachePixelData(url, pixelData)
    cached++
    bytesCached += pixelData.byteLength
    totalFramesPrefetched++
    totalBytesPrefetched += pixelData.byteLength
    totalCompressedBytesFetched += frameData.data.byteLength
    onProgress?.(cached, frameNumbers.length)
  }

  if (DEBUG_PREFETCHER) {
    const ratio = bytesCached > 0 ? ((1 - compressedBytes / bytesCached) * 100).toFixed(1) : 0
    console.log(`[WadoRsBatchPrefetcher] Prefetched ${frameDataMap.size} frames: ${formatBytes(compressedBytes)} -> ${formatBytes(bytesCached)} (${ratio}% saved)`)
  }

  return cached
}

async function prefetchRawPixels(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumbers: number[],
  uncachedFrames: number[],
  onProgress?: (loaded: number, total: number) => void,
  format?: 'raw' | 'original'
): Promise<number> {
  const frameDataMap = await retrieveFrameBatch(studyUid, seriesUid, sopInstanceUid, uncachedFrames, format)

  let cached = frameNumbers.length - uncachedFrames.length
  let bytesCached = 0

  for (const [frameNumber, pixelData] of frameDataMap) {
    // format을 포함한 URL로 캐시 키 생성
    const url = buildFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber, format)
    cachePixelData(url, pixelData)
    cached++
    bytesCached += pixelData.byteLength
    totalFramesPrefetched++
    totalBytesPrefetched += pixelData.byteLength
    onProgress?.(cached, frameNumbers.length)
  }

  if (DEBUG_PREFETCHER) {
    console.log(`[WadoRsBatchPrefetcher] Prefetched ${frameDataMap.size} frames (${formatBytes(bytesCached)})`)
  }

  return cached
}

export async function prefetchAllFrames(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  totalFrames: number,
  batchSize: number = 10,
  onProgress?: (loaded: number, total: number) => void,
  onFrameLoaded?: (frameNumber: number) => void,
  options?: PrefetchOptions
): Promise<number> {
  if (totalFrames <= 0) return 0

  const CONCURRENT_BATCHES = 3
  const allBatches: number[][] = []
  for (let i = 0; i < totalFrames; i += batchSize) {
    const frames: number[] = []
    for (let j = i; j < Math.min(i + batchSize, totalFrames); j++) {
      frames.push(j + 1)
    }
    allBatches.push(frames)
  }

  let totalCached = 0
  let globalLoadedCount = 0

  for (let i = 0; i < allBatches.length; i += CONCURRENT_BATCHES) {
    const concurrentBatches = allBatches.slice(i, i + CONCURRENT_BATCHES)

    const results = await Promise.allSettled(
      concurrentBatches.map((frames) =>
        prefetchFrameBatch(studyUid, seriesUid, sopInstanceUid, frames, () => {}, options)
          .then((cached) => {
            globalLoadedCount += cached
            onProgress?.(Math.min(globalLoadedCount, totalFrames), totalFrames)
            if (onFrameLoaded) {
              for (const frame of frames) {
                onFrameLoaded(frame - 1)
              }
            }
            return cached
          })
      )
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalCached += result.value
      } else {
        console.warn('[WadoRsBatchPrefetcher] Batch failed:', result.reason)
      }
    }
  }

  return totalCached
}

export function getPrefetcherStats(): {
  totalPrefetchCalls: number
  totalFramesPrefetched: number
  totalBytesPrefetched: number
  totalCompressedBytesFetched: number
  avgFramesPerCall: number
  compressionSavings: string
} {
  const savings = totalBytesPrefetched > 0
    ? ((1 - totalCompressedBytesFetched / totalBytesPrefetched) * 100).toFixed(1) + '%'
    : 'N/A'

  return {
    totalPrefetchCalls,
    totalFramesPrefetched,
    totalBytesPrefetched,
    totalCompressedBytesFetched,
    avgFramesPerCall: totalPrefetchCalls > 0 ? totalFramesPrefetched / totalPrefetchCalls : 0,
    compressionSavings: savings,
  }
}

export function resetPrefetcherStats(): void {
  totalPrefetchCalls = 0
  totalFramesPrefetched = 0
  totalBytesPrefetched = 0
  totalCompressedBytesFetched = 0
}
