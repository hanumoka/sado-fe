/**
 * wadoUriImageLoader.ts
 *
 * WADO-URI 이미지 로딩을 위한 캐싱 및 중복 요청 방지 레이어
 * WADO-RS Rendered의 pendingLoads 패턴을 WADO-URI에 적용
 *
 * 주요 기능:
 * 1. LRU 이미지 캐시 (재방문 시 네트워크 요청 없음)
 * 2. 동일 imageId에 대한 중복 요청 방지 (pendingLoads)
 * 3. 요청 통계 제공
 *
 * 성능 최적화 (2026-01-09):
 * - LRU 캐시 추가로 재방문 시 100% 성능 향상
 * - 메모리 제한 (MAX_CACHE_SIZE)으로 메모리 누수 방지
 */
import { imageLoader, type Types } from '@cornerstonejs/core'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_LOADER = false

// ==================== 캐시 설정 ====================
/**
 * 최대 캐시 크기 (이미지 개수)
 * - 512x512 16-bit 이미지 기준: 약 0.5MB/이미지
 * - 200개 캐시 시 약 100MB 메모리 사용
 */
const MAX_CACHE_SIZE = 200

// 이미지 캐시: imageId → IImage (LRU 방식)
const imageCache = new Map<string, Types.IImage>()

// 진행 중인 로드 요청 Map (중복 방지)
const pendingLoads = new Map<string, Promise<Types.IImage>>()

// 통계
let totalRequests = 0
let cacheHits = 0
let deduplicatedRequests = 0

/**
 * LRU 캐시 eviction
 * Map은 삽입 순서를 유지하므로 첫 번째 항목이 가장 오래된 항목
 */
function evictOldestCacheEntry(): void {
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value
    if (oldestKey) {
      imageCache.delete(oldestKey)
    }
  }
}

/**
 * 캐시에서 이미지 조회 (LRU 갱신)
 * 조회 시 해당 항목을 맨 뒤로 이동 (최근 사용으로 표시)
 */
function getFromCache(imageId: string): Types.IImage | undefined {
  const image = imageCache.get(imageId)
  if (image) {
    // LRU 갱신: 삭제 후 재삽입으로 맨 뒤로 이동
    imageCache.delete(imageId)
    imageCache.set(imageId, image)
  }
  return image
}

/**
 * WADO-URI 이미지 로드 (LRU 캐시 + 중복 요청 방지)
 *
 * 1. 캐시 확인 → 캐시 히트 시 즉시 반환
 * 2. 진행 중인 요청 확인 → 중복 요청 방지
 * 3. 새 네트워크 요청 → 완료 시 캐시 저장
 *
 * @param imageId WADO-URI imageId (wadouri:...)
 * @returns 로드된 이미지
 */
export async function loadWadoUriImage(imageId: string): Promise<Types.IImage> {
  totalRequests++

  // 1. 캐시 확인 (LRU 갱신 포함)
  const cached = getFromCache(imageId)
  if (cached) {
    cacheHits++
    return cached
  }

  // 2. 이미 로딩 중인 요청이 있으면 해당 Promise 반환 (중복 방지)
  const pending = pendingLoads.get(imageId)
  if (pending) {
    deduplicatedRequests++
    return pending
  }

  // 3. 새 로드 요청 생성
  const loadPromise = imageLoader
    .loadImage(imageId)
    .then((image) => {
      pendingLoads.delete(imageId)

      // 캐시에 저장 (LRU eviction 적용)
      evictOldestCacheEntry()
      imageCache.set(imageId, image)

      return image
    })
    .catch((error) => {
      pendingLoads.delete(imageId)
      throw error
    })

  pendingLoads.set(imageId, loadPromise)
  return loadPromise
}

/**
 * 로더 통계 조회
 */
export function getWadoUriLoaderStats(): {
  totalRequests: number
  cacheHits: number
  deduplicatedRequests: number
  pendingCount: number
  cacheSize: number
  maxCacheSize: number
  cacheHitRate: string
  deduplicationRate: string
} {
  const hitRate =
    totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(1) : '0.0'
  const dedupRate =
    totalRequests > 0 ? ((deduplicatedRequests / totalRequests) * 100).toFixed(1) : '0.0'

  return {
    totalRequests,
    cacheHits,
    deduplicatedRequests,
    pendingCount: pendingLoads.size,
    cacheSize: imageCache.size,
    maxCacheSize: MAX_CACHE_SIZE,
    cacheHitRate: `${hitRate}%`,
    deduplicationRate: `${dedupRate}%`,
  }
}

/**
 * 진행 중인 요청 수 조회
 */
export function getPendingLoadCount(): number {
  return pendingLoads.size
}

/**
 * 캐시 크기 조회
 */
export function getCacheSize(): number {
  return imageCache.size
}

/**
 * 통계 리셋
 */
export function resetWadoUriLoaderStats(): void {
  totalRequests = 0
  cacheHits = 0
  deduplicatedRequests = 0
}

/**
 * 모든 진행 중인 요청 취소 (페이지 전환 시 사용)
 * 주의: 실제 네트워크 요청은 취소되지 않음 (Promise만 제거)
 */
export function clearPendingLoads(): void {
  pendingLoads.clear()
}

/**
 * 이미지 캐시 초기화 (페이지 전환 시 메모리 정리)
 */
export function clearImageCache(): void {
  const prevSize = imageCache.size
  imageCache.clear()
  if (DEBUG_LOADER) console.log(`[WadoUriImageLoader] Image cache cleared (was ${prevSize} items)`)
}

/**
 * 특정 인스턴스의 캐시 삭제
 * @param sopInstanceUid SOP Instance UID
 * @returns 삭제된 캐시 항목 수
 */
export function clearInstanceCache(sopInstanceUid: string): number {
  let cleared = 0
  for (const key of imageCache.keys()) {
    if (key.includes(sopInstanceUid)) {
      imageCache.delete(key)
      cleared++
    }
  }
  if (cleared > 0) {
    if (DEBUG_LOADER) console.log(`[WadoUriImageLoader] Cleared ${cleared} cached frames for instance: ${sopInstanceUid}`)
  }
  return cleared
}

/**
 * 전체 초기화 (캐시 + 진행 중 요청 + 통계)
 */
export function resetWadoUriLoader(): void {
  clearImageCache()
  clearPendingLoads()
  resetWadoUriLoaderStats()
}
