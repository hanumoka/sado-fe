/**
 * MJPEG URL Builder
 *
 * MJPEG 스트리밍 URL 생성 유틸리티
 */

import type { MjpegResolution } from '../types'

// Vite 프록시를 통해 /dicomweb → http://localhost:10201 로 전달
// 절대 URL 대신 상대 경로 사용 (CORS 문제 방지)

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
 * // => '/dicomweb/mjpeg/1.2.3.4.5?resolution=256&frameRate=30'
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
  return `/dicomweb/mjpeg/${sopInstanceUid}?${params.toString()}`
}

/**
 * MJPEG 스트리밍 정보 URL 생성
 *
 * @param sopInstanceUid SOP Instance UID
 * @returns MJPEG 정보 API URL
 */
export function buildMjpegInfoUrl(sopInstanceUid: string): string {
  return `/dicomweb/mjpeg/${sopInstanceUid}/info`
}
