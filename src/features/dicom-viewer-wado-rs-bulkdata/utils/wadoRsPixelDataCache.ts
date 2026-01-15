/**
 * wadoRsPixelDataCache.ts
 *
 * WADO-RS PixelData 캐시
 *
 * 배치 API로 받은 PixelData를 URL 기반으로 캐싱.
 * HTTP Interceptor가 이 캐시를 참조하여 네트워크 요청을 대체함.
 *
 * 핵심 원칙:
 * - IImage 생성은 cornerstoneDICOMImageLoader가 담당 (호환성 보장)
 * - 이 캐시는 Raw PixelData (ArrayBuffer)만 저장
 * - HTTP 요청을 캐시된 데이터로 대체하여 네트워크 최적화
 *
 * 성능 최적화 (2026-01-13):
 * - LRUHeapCache 사용으로 O(N log N) → O(log N) 캐시 작업
 * - URL 정규화 캐시 크기 제한 (10,000개)
 */

import { formatBytes } from '@/lib/utils'
import { LRUHeapCache } from '@/lib/utils/minHeap'

// 디버그 로그 플래그
const DEBUG_CACHE = false

// 최대 캐시 크기 (1GB)
// L2 캐시 역할: Cornerstone L1 캐시 eviction 시 네트워크 요청 대체
// 메모리 최적화: 2GB → 1GB (L1과 합쳐 2GB 총 캐시 용량)
// 3x3 레이아웃 (9슬롯 × 100프레임 × 2MB = 1.8GB) 지원
const MAX_CACHE_SIZE = 1024 * 1024 * 1024

// LRU 캐시 (MinHeap 기반 - O(log N) eviction)
const pixelDataCache = new LRUHeapCache<string, ArrayBuffer>({
  maxBytes: MAX_CACHE_SIZE,
})

// URL 정규화 캐시 (원본 URL → 정규화된 경로)
// new URL() 생성 비용을 줄이기 위해 캐싱
const normalizedUrlCache = new Map<string, string>()
const MAX_URL_CACHE_SIZE = 10000

// 캐시 히트/미스 통계
let cacheHits = 0
let cacheMisses = 0

/**
 * URL을 경로(path)+쿼리로 정규화
 *
 * 포트 번호 차이로 인한 캐시 미스를 방지하기 위해
 * 호스트/포트를 제거하고 경로+쿼리만 사용
 *
 * wadors: 스킴도 처리하여 Cornerstone imageId와 프리로드 URL 간의
 * 캐시 키 불일치 문제를 해결
 *
 * NOTE: 쿼리 파라미터 보존 - format=raw/original 등 구분 필요
 *
 * @example
 * - "http://localhost:10201/dicomweb/studies/.../frames/1" → "/dicomweb/studies/.../frames/1"
 * - "http://localhost:10300/dicomweb/studies/.../frames/1" → "/dicomweb/studies/.../frames/1"
 * - "/dicomweb/studies/.../frames/1" → "/dicomweb/studies/.../frames/1"
 * - "wadors:/dicomweb/studies/.../frames/1" → "/dicomweb/studies/.../frames/1"
 * - "wadors:http://localhost:10201/dicomweb/.../frames/1" → "/dicomweb/.../frames/1"
 * - "/dicomweb/.../frames/1?format=raw" → "/dicomweb/.../frames/1?format=raw"
 * - "http://localhost:10300/dicomweb/.../frames/1?format=original" → "/dicomweb/.../frames/1?format=original"
 *
 * @param url 원본 URL
 * @returns 정규화된 경로 (쿼리 파라미터 포함)
 */
function normalizeUrlToPath(url: string): string {
  // 캐시에서 먼저 조회 (O(1))
  const cached = normalizedUrlCache.get(url)
  if (cached !== undefined) {
    return cached
  }

  let normalized: string
  try {
    // wadors: 스킴 제거 (Cornerstone imageId 형식)
    // 예: "wadors:/dicomweb/..." → "/dicomweb/..."
    // 예: "wadors:http://localhost:10201/dicomweb/..." → "http://localhost:10201/dicomweb/..."
    let urlToProcess = url
    if (url.startsWith('wadors:')) {
      urlToProcess = url.slice(7) // 'wadors:' (7글자) 제거
    }

    // 프로토콜이 있는 절대 URL인 경우
    if (urlToProcess.startsWith('http://') || urlToProcess.startsWith('https://')) {
      const urlObj = new URL(urlToProcess)
      // pathname + search (쿼리 파라미터 보존)
      normalized = urlObj.pathname + urlObj.search
    } else {
      // 이미 경로만 있는 경우 (쿼리 파라미터 포함)
      normalized = urlToProcess
    }
  } catch {
    // URL 파싱 실패 시 원본 반환
    normalized = url
  }

  // URL 캐시 크기 제한 (10,000개 초과 시 절반 삭제)
  if (normalizedUrlCache.size >= MAX_URL_CACHE_SIZE) {
    const entries = [...normalizedUrlCache.entries()]
    // 앞쪽 절반 삭제 (오래된 항목)
    const deleteCount = Math.floor(MAX_URL_CACHE_SIZE / 2)
    for (let i = 0; i < deleteCount; i++) {
      normalizedUrlCache.delete(entries[i][0])
    }
    if (DEBUG_CACHE) {
      console.log(`[PixelDataCache] URL cache trimmed: deleted ${deleteCount} entries`)
    }
  }

  normalizedUrlCache.set(url, normalized)
  return normalized
}

/**
 * PixelData를 캐시에 저장
 *
 * @param url 캐시 키 (프레임 URL)
 * @param data PixelData (ArrayBuffer)
 */
export function cachePixelData(url: string, data: ArrayBuffer): void {
  // URL을 경로만으로 정규화 (포트 차이 문제 해결)
  const normalizedKey = normalizeUrlToPath(url)

  // 이미 캐시에 있으면 스킵
  if (pixelDataCache.has(normalizedKey)) {
    if (DEBUG_CACHE) {
      console.log(`[PixelDataCache] Skip caching (already exists): ${normalizedKey}`)
    }
    return
  }

  // LRUHeapCache handles eviction automatically with O(log N) performance
  pixelDataCache.set(normalizedKey, data, data.byteLength)

  if (DEBUG_CACHE) {
    console.log(
      `[PixelDataCache] Cached: ${normalizedKey} (${formatBytes(data.byteLength)}, total: ${formatBytes(pixelDataCache.bytes)})`
    )
  }
}

/**
 * 캐시에서 PixelData 조회
 *
 * @param url 캐시 키 (프레임 URL)
 * @returns PixelData (ArrayBuffer) 또는 undefined
 */
export function getCachedPixelData(url: string): ArrayBuffer | undefined {
  // URL을 경로만으로 정규화 (포트 차이 문제 해결)
  const normalizedKey = normalizeUrlToPath(url)
  // LRUHeapCache.get() automatically updates timestamp (LRU) with O(log N)
  const data = pixelDataCache.get(normalizedKey)

  if (data) {
    cacheHits++
    if (DEBUG_CACHE) {
      console.log(`[PixelDataCache] Cache HIT: ${normalizedKey}`)
    }
    return data
  }

  cacheMisses++
  if (DEBUG_CACHE) {
    console.log(`[PixelDataCache] Cache MISS: ${normalizedKey}`)
  }
  return undefined
}

/**
 * 캐시에 PixelData가 존재하는지 확인
 *
 * @param url 캐시 키 (프레임 URL)
 * @returns 존재 여부
 */
export function hasPixelData(url: string): boolean {
  // URL을 경로만으로 정규화 (포트 차이 문제 해결)
  const normalizedKey = normalizeUrlToPath(url)
  return pixelDataCache.has(normalizedKey)
}

/**
 * 전체 캐시 삭제
 */
export function clearPixelDataCache(): void {
  pixelDataCache.clear()
  cacheHits = 0
  cacheMisses = 0
  normalizedUrlCache.clear()

  if (DEBUG_CACHE) {
    console.log('[PixelDataCache] Cache cleared')
  }
}

/**
 * 특정 인스턴스의 모든 프레임 캐시 삭제
 *
 * @param sopInstanceUid SOP Instance UID
 */
export function clearInstanceCache(sopInstanceUid: string): void {
  const deletedCount = pixelDataCache.deleteMatching(
    (url) => url.includes(`/instances/${sopInstanceUid}/`)
  )

  if (DEBUG_CACHE && deletedCount > 0) {
    console.log(`[PixelDataCache] Cleared ${deletedCount} frames for instance: ${sopInstanceUid}`)
  }
}

/**
 * 캐시 통계 조회
 *
 * @returns 캐시 통계 객체
 */
export function getPixelDataCacheStats(): {
  size: number
  entries: number
  maxSize: number
  hitRate: number
  hits: number
  misses: number
} {
  const totalRequests = cacheHits + cacheMisses
  const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0

  return {
    size: pixelDataCache.bytes,
    entries: pixelDataCache.size,
    maxSize: MAX_CACHE_SIZE,
    hitRate: Math.round(hitRate * 100) / 100,
    hits: cacheHits,
    misses: cacheMisses,
  }
}

/**
 * 캐시 통계 리셋
 */
export function resetCacheStats(): void {
  cacheHits = 0
  cacheMisses = 0
}
