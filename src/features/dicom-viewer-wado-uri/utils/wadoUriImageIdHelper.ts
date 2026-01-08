/**
 * WADO-URI ImageId Helper
 *
 * WADO-URI 방식의 Cornerstone imageId 생성 유틸리티
 * cornerstoneWADOImageLoader가 처리하는 'wadouri:' 스킴 사용
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10201'

/**
 * WADO-URI imageId 생성
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (0-based, 멀티프레임용)
 * @returns wadouri:URL 형식의 imageId
 *
 * @example
 * // 단일 프레임
 * createWadoUriImageId('1.2.3', '1.2.4', '1.2.5')
 * // → 'wadouri:http://localhost:10201/dicomweb/wado?requestType=WADO&studyUID=1.2.3&seriesUID=1.2.4&objectUID=1.2.5'
 *
 * // 멀티프레임 (프레임 5)
 * createWadoUriImageId('1.2.3', '1.2.4', '1.2.5', 5)
 * // → 'wadouri:http://localhost:10201/dicomweb/wado?requestType=WADO&studyUID=1.2.3&seriesUID=1.2.4&objectUID=1.2.5&frame=6'
 */
export function createWadoUriImageId(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber?: number
): string {
  const params = new URLSearchParams({
    requestType: 'WADO',
    studyUID: studyUid,
    seriesUID: seriesUid,
    objectUID: sopInstanceUid,
  })

  // 멀티프레임인 경우 frame 파라미터 추가 (1-based)
  if (frameNumber !== undefined && frameNumber > 0) {
    params.append('frame', String(frameNumber + 1))
  }

  return `wadouri:${API_BASE}/dicomweb/wado?${params}`
}

/**
 * 멀티프레임 Instance의 모든 imageId 배열 생성
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param numberOfFrames 총 프레임 수
 * @returns imageId 배열
 */
export function createWadoUriImageIds(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  numberOfFrames: number
): string[] {
  // 단일 프레임인 경우
  if (numberOfFrames <= 1) {
    return [createWadoUriImageId(studyUid, seriesUid, sopInstanceUid)]
  }

  // 멀티프레임: 각 프레임별 imageId 생성
  return Array.from({ length: numberOfFrames }, (_, i) =>
    createWadoUriImageId(studyUid, seriesUid, sopInstanceUid, i)
  )
}

/**
 * WADO-URI 썸네일 URL 생성
 *
 * WADO-URI는 이미지를 JPEG/PNG로 반환하지 않으므로
 * 썸네일도 WADO-URI로 가져와서 클라이언트에서 렌더링해야 함
 * 또는 WADO-RS Rendered를 썸네일용으로 사용 (혼합 가능)
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @returns WADO-URI URL (wadouri: 프리픽스 없음)
 */
export function getWadoUriThumbnailUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): string {
  const params = new URLSearchParams({
    requestType: 'WADO',
    studyUID: studyUid,
    seriesUID: seriesUid,
    objectUID: sopInstanceUid,
    // 썸네일용으로 JPEG 반환 요청 (서버 지원 시)
    contentType: 'image/jpeg',
    rows: '128',
    columns: '128',
  })

  return `${API_BASE}/dicomweb/wado?${params}`
}

/**
 * imageId에서 프레임 번호 추출
 *
 * @param imageId WADO-URI imageId
 * @returns 프레임 번호 (0-based) 또는 0
 */
export function getFrameNumberFromImageId(imageId: string): number {
  try {
    const url = new URL(imageId.replace('wadouri:', ''))
    const frameParam = url.searchParams.get('frame')
    if (frameParam) {
      // frame 파라미터는 1-based, 반환값은 0-based
      return parseInt(frameParam, 10) - 1
    }
    return 0
  } catch {
    return 0
  }
}

/**
 * imageId에서 SOP Instance UID 추출
 *
 * @param imageId WADO-URI imageId
 * @returns SOP Instance UID 또는 null
 */
export function getSopInstanceUidFromImageId(imageId: string): string | null {
  try {
    const url = new URL(imageId.replace('wadouri:', ''))
    return url.searchParams.get('objectUID')
  } catch {
    return null
  }
}
