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
 */

import { formatBytes } from '@/lib/utils'

// 디버그 로그 플래그
const DEBUG_CACHE = false

// 캐시 저장소 (URL → ArrayBuffer)
const pixelDataCache = new Map<string, ArrayBuffer>()

// URL 정규화 캐시 (원본 URL → 정규화된 경로)
// new URL() 생성 비용을 줄이기 위해 캐싱
const normalizedUrlCache = new Map<string, string>()

// 캐시 항목 메타데이터 (LRU 관리용)
interface CacheEntry {
  url: string
  size: number
  timestamp: number
}
const cacheMetadata: CacheEntry[] = []

// 최대 캐시 크기 (500MB)
const MAX_CACHE_SIZE = 500 * 1024 * 1024

// 현재 캐시 크기
let currentCacheSize = 0

// 캐시 히트/미스 통계
let cacheHits = 0
let cacheMisses = 0

/**
 * URL을 경로(path)만으로 정규화
 *
 * 포트 번호 차이로 인한 캐시 미스를 방지하기 위해
 * 호스트/포트를 제거하고 경로만 사용
 *
 * @example
 * - "http://localhost:10201/dicomweb/studies/.../frames/1" → "/dicomweb/studies/.../frames/1"
 * - "http://localhost:10300/dicomweb/studies/.../frames/1" → "/dicomweb/studies/.../frames/1"
 * - "/dicomweb/studies/.../frames/1" → "/dicomweb/studies/.../frames/1"
 *
 * @param url 원본 URL
 * @returns 정규화된 경로
 */
function normalizeUrlToPath(url: string): string {
  // 캐시에서 먼저 조회 (O(1))
  const cached = normalizedUrlCache.get(url)
  if (cached !== undefined) {
    return cached
  }

  let normalized: string
  try {
    // 프로토콜이 있는 절대 URL인 경우
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url)
      normalized = urlObj.pathname
    } else {
      // 이미 경로만 있는 경우
      normalized = url
    }
  } catch {
    // URL 파싱 실패 시 원본 반환
    normalized = url
  }

  // 캐시에 저장 (URL 정규화 캐시는 크기 제한 없음 - 문자열만 저장하므로 메모리 영향 적음)
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
      if (DEBUG_CACHE) console.log(`[PixelDataCache] Skip caching (already exists): ${normalizedKey}`)
    }
    return
  }

  // 메모리 제한 확인 및 필요시 오래된 항목 제거
  enforceMemoryLimit(data.byteLength)

  // 캐시에 저장 (정규화된 키 사용)
  pixelDataCache.set(normalizedKey, data)
  currentCacheSize += data.byteLength

  // 메타데이터 추가 (정규화된 키 사용)
  cacheMetadata.push({
    url: normalizedKey,
    size: data.byteLength,
    timestamp: Date.now(),
  })

  if (DEBUG_CACHE) {
    console.log(
      `[PixelDataCache] Cached: ${normalizedKey} (${formatBytes(data.byteLength)}, total: ${formatBytes(currentCacheSize)})`
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
  const data = pixelDataCache.get(normalizedKey)

  if (data) {
    cacheHits++
    if (DEBUG_CACHE) {
      if (DEBUG_CACHE) console.log(`[PixelDataCache] Cache HIT: ${normalizedKey}`)
    }

    // LRU: 타임스탬프 업데이트
    const metaIndex = cacheMetadata.findIndex((m) => m.url === normalizedKey)
    if (metaIndex !== -1) {
      cacheMetadata[metaIndex].timestamp = Date.now()
    }

    return data
  }

  cacheMisses++
  if (DEBUG_CACHE) {
    if (DEBUG_CACHE) console.log(`[PixelDataCache] Cache MISS: ${normalizedKey}`)
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
  cacheMetadata.length = 0
  currentCacheSize = 0
  cacheHits = 0
  cacheMisses = 0
  normalizedUrlCache.clear()

  if (DEBUG_CACHE) {
    if (DEBUG_CACHE) console.log('[PixelDataCache] Cache cleared')
  }
}

/**
 * 특정 인스턴스의 모든 프레임 캐시 삭제
 *
 * @param sopInstanceUid SOP Instance UID
 */
export function clearInstanceCache(sopInstanceUid: string): void {
  const urlsToDelete: string[] = []

  // 해당 인스턴스의 URL 찾기
  for (const url of pixelDataCache.keys()) {
    if (url.includes(`/instances/${sopInstanceUid}/`)) {
      urlsToDelete.push(url)
    }
  }

  // 삭제
  for (const url of urlsToDelete) {
    const data = pixelDataCache.get(url)
    if (data) {
      currentCacheSize -= data.byteLength
    }
    pixelDataCache.delete(url)

    // 메타데이터에서도 삭제
    const metaIndex = cacheMetadata.findIndex((m) => m.url === url)
    if (metaIndex !== -1) {
      cacheMetadata.splice(metaIndex, 1)
    }
  }

  if (DEBUG_CACHE) {
    if (DEBUG_CACHE) console.log(`[PixelDataCache] Cleared ${urlsToDelete.length} frames for instance: ${sopInstanceUid}`)
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
    size: currentCacheSize,
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

/**
 * 메모리 제한 적용 (LRU 방식으로 오래된 항목 제거)
 *
 * @param newDataSize 새로 추가할 데이터 크기
 */
function enforceMemoryLimit(newDataSize: number): void {
  // 새 데이터를 추가해도 제한 이내면 OK
  if (currentCacheSize + newDataSize <= MAX_CACHE_SIZE) {
    return
  }

  // LRU 방식으로 오래된 항목부터 제거
  // 타임스탬프 기준 오름차순 정렬 (오래된 것이 앞에)
  cacheMetadata.sort((a, b) => a.timestamp - b.timestamp)

  const targetSize = MAX_CACHE_SIZE - newDataSize
  let evictedCount = 0

  while (currentCacheSize > targetSize && cacheMetadata.length > 0) {
    const oldest = cacheMetadata.shift()
    if (oldest) {
      pixelDataCache.delete(oldest.url)
      currentCacheSize -= oldest.size
      evictedCount++
    }
  }

  if (DEBUG_CACHE && evictedCount > 0) {
    if (DEBUG_CACHE) console.log(`[PixelDataCache] Evicted ${evictedCount} entries to free memory`)
  }
}

