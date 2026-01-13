/**
 * Cine Frames API Client
 *
 * 서버에서 모든 cine 프레임을 한 번에 다운로드하는 API
 * MJPEG 무한 스트리밍 대신 클라이언트 사이드 캐싱 + 로컬 재생 방식
 */

import type { MjpegResolution } from '../types'

/**
 * Cine Frames API 응답 타입
 */
export interface CineFramesResponse {
  sopInstanceUid: string
  numberOfFrames: number
  resolution: number
  /** Base64 인코딩된 JPEG 프레임 배열 */
  frames: string[]
}

/**
 * Cine Frames 정보 응답 타입
 */
export interface CineFramesInfoResponse {
  sopInstanceUid: string
  numberOfFrames: number
  frameRate: number
  transcodingStatus: string
  available: boolean
  supportedResolutions: number[]
  defaultResolution: number
  estimatedTotalSizeBytes: number
  estimatedTotalSizeKB: number
  estimatedTotalSizeMB: number
  estimatedDurationSeconds: number
  framesUrl: string
}

/** API 베이스 URL */
const API_BASE_URL = '/dicomweb/cine-frames'

/**
 * 모든 cine 프레임 다운로드
 *
 * @param sopInstanceUid SOP Instance UID
 * @param resolution 해상도 (256, 128, 64, 32)
 * @returns Base64 인코딩된 JPEG 프레임 배열
 */
export async function fetchAllCineFrames(
  sopInstanceUid: string,
  resolution: MjpegResolution = 256
): Promise<CineFramesResponse> {
  const url = `${API_BASE_URL}/${sopInstanceUid}?resolution=${resolution}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch cine frames: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Cine 프레임 정보 조회
 *
 * @param sopInstanceUid SOP Instance UID
 * @returns 프레임 정보 (예상 크기, 프레임 수 등)
 */
export async function fetchCineFramesInfo(
  sopInstanceUid: string
): Promise<CineFramesInfoResponse> {
  const url = `${API_BASE_URL}/${sopInstanceUid}/info`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch cine frames info: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Base64 문자열을 HTMLImageElement로 변환
 *
 * @param base64 Base64 인코딩된 JPEG 데이터
 * @returns 로드된 HTMLImageElement
 */
export function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * 모든 Base64 프레임을 HTMLImageElement 배열로 변환
 *
 * @param frames Base64 인코딩된 JPEG 프레임 배열
 * @returns 로드된 HTMLImageElement 배열
 */
export async function decodeAllFrames(frames: string[]): Promise<HTMLImageElement[]> {
  const imagePromises = frames.map((base64) => {
    if (!base64) {
      // 빈 프레임은 null 처리 (서버에서 실패한 프레임)
      return Promise.resolve(null)
    }
    return base64ToImage(base64).catch(() => null)
  })

  const results = await Promise.all(imagePromises)

  // null 제외하고 유효한 이미지만 반환 (타입 안전)
  return results.filter((img): img is HTMLImageElement => img !== null)
}
