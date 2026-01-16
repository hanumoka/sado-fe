/**
 * WADO-RS BulkData ImageId Helper
 *
 * WADO-RS BulkData 방식의 Cornerstone imageId 생성 유틸리티
 * cornerstoneDICOMImageLoader가 처리하는 'wadors:' 스킴 사용
 *
 * WADO-URI와의 차이:
 * - WADO-URI: wadouri:http://host/wado?requestType=WADO&...
 * - WADO-RS BulkData: wadors:/dicomweb/studies/.../frames/1 (상대 경로)
 *
 * 상대 경로 사용 이유:
 * - Vite 프록시가 /dicomweb 요청을 백엔드로 전달
 * - 배치 프리페처와 동일한 경로로 캐시 키 일치 보장
 * - 포트 불일치 문제 해결 (10300 vs 10201)
 */

/**
 * Cornerstone imageId용: 상대 경로 사용 (Vite 프록시 활용)
 * - 배치 프리페처의 DICOMWEB_BASE_URL과 동일한 형식
 * - 캐시 키 정규화 시 경로만 비교하므로 일치 보장
 */
const API_BASE = ''

/**
 * 썸네일 URL용: 상대 경로 사용 (Vite 프록시 활용)
 * - <img src="..."> 태그에서 Vite 프록시를 통해 /dicomweb → 백엔드로 전달
 * - CORS 문제 방지 및 포트 불일치 해결
 */
const THUMBNAIL_BASE = ''

/**
 * WADO-RS BulkData imageId 생성 (Original 포맷)
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (0-based, 멀티프레임용)
 * @returns wadors:URL 형식의 imageId
 *
 * @example
 * // 단일 프레임 (frame 1)
 * createWadoRsBulkDataImageId('1.2.3', '1.2.4', '1.2.5')
 * // → 'wadors:/dicomweb/studies/1.2.3/series/1.2.4/instances/1.2.5/frames/1'
 *
 * // 멀티프레임 (프레임 5, 0-based → frame 6)
 * createWadoRsBulkDataImageId('1.2.3', '1.2.4', '1.2.5', 5)
 * // → 'wadors:/dicomweb/studies/1.2.3/series/1.2.4/instances/1.2.5/frames/6'
 */
export function createWadoRsBulkDataImageId(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber?: number
): string {
  // DICOM frame 번호는 1-based
  const frameNum = frameNumber !== undefined ? frameNumber + 1 : 1

  // WADO-RS BulkData URL 형식 (Original 포맷 - 기본값이므로 쿼리 파라미터 불필요)
  const url = `${API_BASE}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNum}`

  return `wadors:${url}`
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
export function createWadoRsBulkDataImageIds(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  numberOfFrames: number
): string[] {
  // 단일 프레임인 경우
  if (numberOfFrames <= 1) {
    return [createWadoRsBulkDataImageId(studyUid, seriesUid, sopInstanceUid)]
  }

  // 멀티프레임: 각 프레임별 imageId 생성
  return Array.from({ length: numberOfFrames }, (_, i) =>
    createWadoRsBulkDataImageId(studyUid, seriesUid, sopInstanceUid, i)
  )
}

/**
 * WADO-RS BulkData 썸네일 URL 생성
 *
 * BulkData는 렌더링 없이 raw 데이터를 반환하므로
 * 썸네일은 WADO-RS Rendered API를 사용
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @returns WADO-RS Rendered URL (첫 프레임)
 */
export function getWadoRsBulkDataThumbnailUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): string {
  // WADO-RS Rendered API (PNG)로 썸네일 생성
  // 썸네일은 <img> 태그에서 직접 사용되므로 절대 경로 사용
  return `${THUMBNAIL_BASE}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/rendered`
}

/**
 * imageId에서 프레임 번호 추출
 *
 * @param imageId WADO-RS BulkData imageId
 * @returns 프레임 번호 (0-based) 또는 0
 */
export function getFrameNumberFromImageId(imageId: string): number {
  try {
    // wadors:http://host/dicomweb/studies/.../frames/N
    const url = imageId.replace('wadors:', '')
    const match = url.match(/\/frames\/(\d+)/)
    if (match) {
      // URL의 frame 번호는 1-based, 반환값은 0-based
      return parseInt(match[1], 10) - 1
    }
    return 0
  } catch {
    return 0
  }
}

/**
 * imageId에서 SOP Instance UID 추출
 *
 * @param imageId WADO-RS BulkData imageId
 * @returns SOP Instance UID 또는 null
 */
export function getSopInstanceUidFromImageId(imageId: string): string | null {
  try {
    // wadors:http://host/dicomweb/studies/.../instances/{sopInstanceUid}/frames/N
    const url = imageId.replace('wadors:', '')
    const match = url.match(/\/instances\/([^/]+)\/frames\//)
    return match ? match[1] : null
  } catch {
    return null
  }
}
