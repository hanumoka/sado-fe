/**
 * instanceService.ts
 *
 * Instance 관련 API 서비스
 *
 * 목적:
 * - DICOM Viewer에서 사용
 * - Backend DICOMweb API 연동
 */

import { api } from '@/lib/api'
import type { ViewerInstance } from '@/features/dicom-viewer/types/viewer'
import { adaptDicomWebInstance } from '@/lib/adapters/seriesAdapter'
import { getWadoUriUrl } from '@/lib/services/dicomWebService'

/**
 * Series의 Instance 목록 조회 (DICOMWeb QIDO-RS)
 *
 * @param studyInstanceUid - Study Instance UID
 * @param seriesInstanceUid - Series Instance UID
 * @returns Promise<ViewerInstance[]>
 */
async function fetchInstancesBySeriesIdImpl(
  studyInstanceUid: string,
  seriesInstanceUid: string
): Promise<ViewerInstance[]> {
  const response = await api.get<any[]>(
    `/dicomweb/studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances`
  )

  // DICOMweb DTO → Frontend Entity 변환
  return response.map((dicomInstance) => {
    // SOP Instance UID 추출
    const sopInstanceUid = dicomInstance['00080018']?.Value[0] || ''

    // WADO-URI URL 생성 (storageUri)
    const storageUri = getWadoUriUrl(
      studyInstanceUid,
      seriesInstanceUid,
      sopInstanceUid
    )

    // Adapter 호출 시 seriesId와 storageUri 전달
    return adaptDicomWebInstance(
      dicomInstance,
      seriesInstanceUid,  // seriesId (현재는 UID 사용)
      storageUri
    )
  })
}

// Export
export const fetchInstancesBySeriesId = fetchInstancesBySeriesIdImpl
