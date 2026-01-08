/**
 * wadoUriImageLoader.ts
 *
 * WADO-URI 이미지 로딩을 위한 중복 요청 방지 레이어
 * WADO-RS Rendered의 pendingLoads 패턴을 WADO-URI에 적용
 *
 * 주요 기능:
 * 1. 동일 imageId에 대한 중복 요청 방지 (pendingLoads)
 * 2. 요청 통계 제공
 */
import { imageLoader, type Types } from '@cornerstonejs/core'

// 진행 중인 로드 요청 Map (중복 방지)
const pendingLoads = new Map<string, Promise<Types.IImage>>()

// 통계
let totalRequests = 0
let deduplicatedRequests = 0

/**
 * WADO-URI 이미지 로드 (중복 요청 방지)
 *
 * 동일한 imageId에 대한 동시 요청이 있으면
 * 새 네트워크 요청을 생성하지 않고 기존 Promise를 반환
 *
 * @param imageId WADO-URI imageId (wadouri:...)
 * @returns 로드된 이미지
 */
export async function loadWadoUriImage(imageId: string): Promise<Types.IImage> {
  totalRequests++

  // 이미 로딩 중인 요청이 있으면 해당 Promise 반환 (중복 방지)
  const pending = pendingLoads.get(imageId)
  if (pending) {
    deduplicatedRequests++
    return pending
  }

  // 새 로드 요청 생성
  const loadPromise = imageLoader
    .loadImage(imageId)
    .then((image) => {
      pendingLoads.delete(imageId)
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
  deduplicatedRequests: number
  pendingCount: number
  deduplicationRate: string
} {
  const rate =
    totalRequests > 0 ? ((deduplicatedRequests / totalRequests) * 100).toFixed(1) : '0.0'

  return {
    totalRequests,
    deduplicatedRequests,
    pendingCount: pendingLoads.size,
    deduplicationRate: `${rate}%`,
  }
}

/**
 * 진행 중인 요청 수 조회
 */
export function getPendingLoadCount(): number {
  return pendingLoads.size
}

/**
 * 통계 리셋
 */
export function resetWadoUriLoaderStats(): void {
  totalRequests = 0
  deduplicatedRequests = 0
}

/**
 * 모든 진행 중인 요청 취소 (페이지 전환 시 사용)
 * 주의: 실제 네트워크 요청은 취소되지 않음 (Promise만 제거)
 */
export function clearPendingLoads(): void {
  pendingLoads.clear()
}
