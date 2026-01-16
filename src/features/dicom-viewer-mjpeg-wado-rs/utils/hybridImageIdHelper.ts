/**
 * HybridImageIdHelper
 *
 * 하이브리드 뷰어 전용 WADO-RS BulkData ImageId 생성 유틸리티
 * 기존 wadoRsBulkDataImageIdHelper.ts와 동일한 로직이지만
 * 격리를 위해 독립적으로 정의
 *
 * 주의: 기존 dicom-viewer-wado-rs-bulkdata 임포트 금지
 */

/**
 * Vite 프록시를 통해 /dicomweb → 백엔드로 전달
 * 상대 경로 사용 (CORS 문제 방지)
 */
const API_BASE = ''

/**
 * WADO-RS BulkData imageId 생성
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (0-based)
 * @returns wadors:URL 형식의 imageId
 */
export function createHybridImageId(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber?: number
): string {
  // DICOM frame 번호는 1-based
  const frameNum = frameNumber !== undefined ? frameNumber + 1 : 1

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
export function createHybridImageIds(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  numberOfFrames: number
): string[] {
  if (numberOfFrames <= 1) {
    return [createHybridImageId(studyUid, seriesUid, sopInstanceUid)]
  }

  return Array.from({ length: numberOfFrames }, (_, i) =>
    createHybridImageId(studyUid, seriesUid, sopInstanceUid, i)
  )
}

/**
 * imageId에서 프레임 번호 추출
 *
 * @param imageId WADO-RS BulkData imageId
 * @returns 프레임 번호 (0-based)
 */
export function getFrameNumberFromImageId(imageId: string): number {
  try {
    const url = imageId.replace('wadors:', '')
    const match = url.match(/\/frames\/(\d+)/)
    if (match) {
      return parseInt(match[1], 10) - 1
    }
    return 0
  } catch {
    return 0
  }
}
