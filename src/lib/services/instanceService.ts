/**
 * instanceService.ts
 *
 * Instance 관련 API 서비스
 *
 * 목적:
 * - Instance 목록 페이지에서 사용 (REST API)
 * - DICOM Viewer에서 사용 (DICOMweb API)
 */

import { api } from '@/lib/api'
import type { Instance } from '@/types'
import type { ViewerInstance } from '@/features/dicom-viewer/types/viewer'
import { adaptDicomWebInstance } from '@/lib/adapters/seriesAdapter'
import { getWadoUriUrl } from '@/lib/services/dicomWebService'

/**
 * Instance 검색 파라미터
 */
export interface InstanceSearchParams {
  seriesId?: string
  studyId?: string
  sopInstanceUid?: string
  storageTier?: string // HOT, WARM, COLD
  page?: number // 0부터 시작
  size?: number // 기본값: 10
}

/**
 * Instance 페이지네이션 응답
 */
export interface InstancePageResponse {
  content: Instance[]
  totalElements: number
  totalPages: number
  size: number
  number: number // 현재 페이지 (0부터 시작)
  first: boolean
  last: boolean
  empty: boolean
}

/**
 * Backend InstanceResponse DTO
 */
interface InstanceResponse {
  id: number
  uuid: string | null
  seriesId: number
  sopInstanceUid: string
  sopClassUid: string | null
  rows: number | null
  columns: number | null
  numberOfFrames: number | null
  frameRate: number | null
  frameRateSource: string | null
  instanceNumber: number | null
  storagePath: string | null
  storageUri: string | null
  fileSize: number | null
  transcodingStatus: string | null
  thumbnailPath: string | null
  videoPath: string | null
  storageTier: string | null
  createdAt: string | null
  updatedAt: string | null
  tenantId: number | null
}

/**
 * Backend InstanceResponse → Frontend Instance 변환
 */
function adaptInstanceResponse(response: InstanceResponse): Instance {
  return {
    id: String(response.id),
    uuid: response.uuid ?? undefined,
    seriesId: String(response.seriesId),
    sopInstanceUid: response.sopInstanceUid,
    sopClassUid: response.sopClassUid ?? undefined,
    instanceNumber: response.instanceNumber ?? 0,
    rows: response.rows ?? undefined,
    columns: response.columns ?? undefined,
    numberOfFrames: response.numberOfFrames ?? undefined,
    frameRate: response.frameRate ?? undefined,
    storagePath: response.storagePath ?? undefined,
    storageUri: response.storageUri || '',
    fileSize: response.fileSize ?? undefined,
    transcodingStatus: response.transcodingStatus ?? undefined,
    thumbnailPath: response.thumbnailPath ?? undefined,
    videoPath: response.videoPath ?? undefined,
    storageTier: response.storageTier ?? undefined,
    createdAt: response.createdAt ?? undefined,
    updatedAt: response.updatedAt ?? undefined,
    tenantId: response.tenantId ?? undefined,
  }
}

/**
 * Backend Spring Page 응답 형식
 */
interface SpringPageResponse {
  content: InstanceResponse[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  empty: boolean
}

/**
 * Instance 목록 조회 (REST API, 페이지네이션)
 *
 * @param searchParams - 검색 파라미터 (선택적)
 * @returns Promise<InstancePageResponse>
 */
async function fetchInstancesImpl(
  searchParams?: InstanceSearchParams
): Promise<InstancePageResponse> {
  const params = new URLSearchParams()

  if (searchParams?.seriesId) {
    params.append('seriesId', searchParams.seriesId)
  }
  if (searchParams?.studyId) {
    params.append('studyId', searchParams.studyId)
  }
  if (searchParams?.sopInstanceUid) {
    params.append('sopInstanceUid', searchParams.sopInstanceUid)
  }
  if (searchParams?.storageTier) {
    params.append('storageTier', searchParams.storageTier)
  }

  // 페이지네이션 파라미터 (기본값: page=0, size=10)
  params.append('page', String(searchParams?.page ?? 0))
  params.append('size', String(searchParams?.size ?? 10))

  const url = `/api/instances?${params.toString()}`

  const response = await api.get<SpringPageResponse>(url)

  if (!response) {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: searchParams?.size ?? 10,
      number: searchParams?.page ?? 0,
      first: true,
      last: true,
      empty: true,
    }
  }

  return {
    content: response.content.map(adaptInstanceResponse),
    totalElements: response.totalElements,
    totalPages: response.totalPages,
    size: response.size,
    number: response.number,
    first: response.first,
    last: response.last,
    empty: response.empty,
  }
}

/**
 * Instance 상세 조회 (REST API)
 *
 * @param instanceId - Instance ID (내부 PK)
 * @returns Promise<Instance | null>
 */
async function fetchInstanceByIdImpl(
  instanceId: string
): Promise<Instance | null> {
  const response = await api.get<InstanceResponse>(`/api/instances/${instanceId}`)

  if (!response) {
    return null
  }

  return adaptInstanceResponse(response)
}

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
  return (response ?? []).map((dicomInstance) => {
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
export const fetchInstances = fetchInstancesImpl
export const fetchInstanceById = fetchInstanceByIdImpl
export const fetchInstancesBySeriesId = fetchInstancesBySeriesIdImpl
