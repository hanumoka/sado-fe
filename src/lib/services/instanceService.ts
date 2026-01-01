/**
 * instanceService.ts
 *
 * Instance 관련 API 서비스
 *
 * 목적:
 * - Mock/Real API 전환 로직 중앙화
 * - DICOM Viewer에서 사용
 */

import { MOCK_INSTANCES, MOCK_SERIES, MOCK_STUDIES } from '@/lib/mockData'
import { api } from '@/lib/api'
import { apiConfig, mockConfig } from '@/lib/config'
import type {
  ViewerInstance,
  ViewerSeries,
} from '@/features/dicom-viewer/types/viewer'

/**
 * Mock: Series 정보 조회
 */
async function mockFetchSeriesById(
  seriesId: string
): Promise<ViewerSeries | null> {
  await new Promise((resolve) => setTimeout(resolve, mockConfig.delay * 0.6))

  const series = MOCK_SERIES.find((s) => s.id === seriesId)
  if (!series) return null

  // Study에서 studyInstanceUid 가져오기
  const study = MOCK_STUDIES.find((st) => st.id === series.studyId)
  const studyInstanceUid = study?.studyInstanceUid || ''

  return {
    id: series.id,
    seriesInstanceUid: series.seriesInstanceUid,
    studyInstanceUid, // Cornerstone3D WADO-RS URL 생성용
    seriesNumber: series.seriesNumber,
    modality: series.modality,
    seriesDescription: series.seriesDescription,
    instancesCount: series.instancesCount,
  }
}

/**
 * Real: Series 정보 조회
 */
async function realFetchSeriesById(
  seriesId: string
): Promise<ViewerSeries | null> {
  return api.get<ViewerSeries>(`/api/series/${seriesId}`)
}

/**
 * Mock: Series의 Instance 목록 조회
 * @param _studyInstanceUid - Study Instance UID (Mock에서는 무시)
 * @param seriesInstanceUid - Series Instance UID (Mock에서는 seriesId로 사용)
 */
async function mockFetchInstancesBySeriesId(
  _studyInstanceUid: string,
  seriesInstanceUid: string
): Promise<ViewerInstance[]> {
  await new Promise((resolve) => setTimeout(resolve, mockConfig.delay))

  // Mock에서는 seriesInstanceUid를 seriesId처럼 사용하여 필터링
  // 실제 Mock 데이터에서는 id와 seriesInstanceUid 모두 검사
  const instances = MOCK_INSTANCES.filter(
    (i) => i.seriesId === seriesInstanceUid ||
           MOCK_SERIES.find(s => s.seriesInstanceUid === seriesInstanceUid && s.id === i.seriesId)
  )

  // Mock Instance에 추가 정보 (실제로는 DICOM 파일에서 파싱)
  return instances.map((instance) => ({
    id: instance.id,
    sopInstanceUid: instance.sopInstanceUid,
    seriesId: instance.seriesId,
    studyId: 'STU-001', // Mock: 실제로는 Series에서 가져옴
    instanceNumber: instance.instanceNumber,
    storageUri: instance.storageUri,
    rows: 512,
    columns: 512,
    pixelSpacing: [0.5, 0.5] as [number, number],
  }))
}

/**
 * Real: Series의 Instance 목록 조회 (DICOMWeb QIDO-RS)
 * @param studyInstanceUid - Study Instance UID
 * @param seriesInstanceUid - Series Instance UID
 */
async function realFetchInstancesBySeriesId(
  studyInstanceUid: string,
  seriesInstanceUid: string
): Promise<ViewerInstance[]> {
  return api.get<ViewerInstance[]>(
    `/dicomweb/studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances`
  )
}

// ============================================================
// Export: 환경에 따라 Mock 또는 Real 함수 선택
// ============================================================

/**
 * Series 정보 조회
 */
export const fetchSeriesById = apiConfig.useMock
  ? mockFetchSeriesById
  : realFetchSeriesById

/**
 * Series의 Instance 목록 조회
 */
export const fetchInstancesBySeriesId = apiConfig.useMock
  ? mockFetchInstancesBySeriesId
  : realFetchInstancesBySeriesId
