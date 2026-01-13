/**
 * wadoRsRenderedCache.ts
 *
 * WADO-RS Rendered 이미지 캐시
 *
 * 배치 API로 받은 PNG/JPEG 이미지를 URL 기반으로 캐싱.
 * HTTP Interceptor가 이 캐시를 참조하여 네트워크 요청을 대체함.
 *
 * 핵심 원칙:
 * - PNG/JPEG ArrayBuffer를 캐싱
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

// 최대 캐시 크기 (500MB)
const MAX_CACHE_SIZE = 500 * 1024 * 1024

// LRU 캐시 (MinHeap 기반 - O(log N) eviction)
const renderedCache = new LRUHeapCache<string, ArrayBuffer>({
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
 * URL을 경로(path + query)로 정규화
 *
 * 포트 번호 차이로 인한 캐시 미스를 방지하기 위해
 * 호스트/포트를 제거하고 경로 + 쿼리만 사용
 *
 * @example
 * - "http://localhost:10201/.../frames/1/rendered" → "/dicomweb/.../frames/1/rendered"
 * - "http://localhost:10201/.../frames/1/rendered?resolution=256" → "/dicomweb/.../frames/1/rendered?resolution=256"
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
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url)
      // pathname + search (쿼리 파라미터 포함)로 resolution별 캐시 분리
      normalized = urlObj.pathname + urlObj.search
    } else {
      normalized = url
    }
  } catch {
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
      console.log(`[RenderedCache] URL cache trimmed: deleted ${deleteCount} entries`)
    }
  }

  normalizedUrlCache.set(url, normalized)
  return normalized
}

/**
 * Rendered 프레임을 캐시에 저장
 *
 * @param url 캐시 키 (프레임 URL)
 * @param data PNG/JPEG 데이터 (ArrayBuffer)
 */
export function cacheRenderedFrame(url: string, data: ArrayBuffer): void {
  const normalizedKey = normalizeUrlToPath(url)

  if (renderedCache.has(normalizedKey)) {
    if (DEBUG_CACHE) {
      console.log(`[RenderedCache] Skip caching (already exists): ${normalizedKey}`)
    }
    return
  }

  // LRUHeapCache handles eviction automatically with O(log N) performance
  renderedCache.set(normalizedKey, data, data.byteLength)

  if (DEBUG_CACHE) {
    console.log(
      `[RenderedCache] Cached: ${normalizedKey} (${formatBytes(data.byteLength)}, total: ${formatBytes(renderedCache.bytes)})`
    )
  }
}

/**
 * 캐시에서 Rendered 프레임 조회
 *
 * @param url 캐시 키 (프레임 URL)
 * @returns PNG/JPEG 데이터 (ArrayBuffer) 또는 undefined
 */
export function getCachedRenderedFrame(url: string): ArrayBuffer | undefined {
  const normalizedKey = normalizeUrlToPath(url)
  // LRUHeapCache.get() automatically updates timestamp (LRU) with O(log N)
  const data = renderedCache.get(normalizedKey)

  if (data) {
    cacheHits++
    if (DEBUG_CACHE) {
      console.log(`[RenderedCache] Cache HIT: ${normalizedKey}`)
    }
    return data
  }

  cacheMisses++
  if (DEBUG_CACHE) {
    console.log(`[RenderedCache] Cache MISS: ${normalizedKey}`)
  }
  return undefined
}

/**
 * 캐시에 Rendered 프레임이 존재하는지 확인
 *
 * @param url 캐시 키 (프레임 URL)
 * @returns 존재 여부
 */
export function hasRenderedFrame(url: string): boolean {
  const normalizedKey = normalizeUrlToPath(url)
  return renderedCache.has(normalizedKey)
}

/**
 * 전체 캐시 삭제
 */
export function clearRenderedCache(): void {
  renderedCache.clear()
  cacheHits = 0
  cacheMisses = 0
  normalizedUrlCache.clear()

  if (DEBUG_CACHE) {
    console.log('[RenderedCache] Cache cleared')
  }
}

/**
 * 특정 인스턴스의 모든 프레임 캐시 삭제
 *
 * @param sopInstanceUid SOP Instance UID
 */
export function clearInstanceRenderedCache(sopInstanceUid: string): void {
  const deletedCount = renderedCache.deleteMatching(
    (url) => url.includes(`/instances/${sopInstanceUid}/`)
  )

  if (DEBUG_CACHE && deletedCount > 0) {
    console.log(`[RenderedCache] Cleared ${deletedCount} frames for instance: ${sopInstanceUid}`)
  }
}

/**
 * 캐시 통계 조회
 */
export function getRenderedCacheStats(): {
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
    size: renderedCache.bytes,
    entries: renderedCache.size,
    maxSize: MAX_CACHE_SIZE,
    hitRate: Math.round(hitRate * 100) / 100,
    hits: cacheHits,
    misses: cacheMisses,
  }
}

/**
 * 캐시 통계 리셋
 */
export function resetRenderedCacheStats(): void {
  cacheHits = 0
  cacheMisses = 0
}

