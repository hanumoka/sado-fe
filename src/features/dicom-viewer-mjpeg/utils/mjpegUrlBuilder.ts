/**
 * MJPEG URL Builder
 *
 * MJPEG 스트리밍 URL 생성 유틸리티
 */

import { API_BASE_URL } from '@/lib/config'
import type { MjpegResolution } from '../types'

/**
 * MJPEG 스트리밍 URL 생성
 *
 * @param sopInstanceUid SOP Instance UID
 * @param resolution 해상도 (256, 128, 64, 32)
 * @param frameRate 프레임 레이트 (1-60)
 * @returns MJPEG 스트리밍 URL
 *
 * @example
 * buildMjpegStreamUrl('1.2.3.4.5', 256, 30)
 * // => 'http://localhost:10201/dicomweb/mjpeg/1.2.3.4.5?resolution=256&frameRate=30'
 */
export function buildMjpegStreamUrl(
  sopInstanceUid: string,
  resolution: MjpegResolution = 256,
  frameRate: number = 30
): string {
  const params = new URLSearchParams({
    resolution: String(resolution),
    frameRate: String(frameRate),
  })
  return `${API_BASE_URL}/dicomweb/mjpeg/${sopInstanceUid}?${params.toString()}`
}

/**
 * MJPEG 스트리밍 정보 URL 생성
 *
 * @param sopInstanceUid SOP Instance UID
 * @returns MJPEG 정보 API URL
 */
export function buildMjpegInfoUrl(sopInstanceUid: string): string {
  return `${API_BASE_URL}/dicomweb/mjpeg/${sopInstanceUid}/info`
}
