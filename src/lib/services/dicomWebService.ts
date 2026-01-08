/**
 * dicomWebService.ts
 *
 * DICOMweb API 서비스 (QIDO-RS, WADO-RS)
 *
 * 표준 DICOMweb API를 통해 DICOM 데이터를 조회합니다.
 * - QIDO-RS: Query (Study, Series, Instance 검색)
 * - WADO-RS: Retrieve (메타데이터, DICOM 파일 다운로드)
 * - 멀티테넌시 지원 (X-Tenant-Id 헤더 자동 추가)
 *
 * @see https://www.dicomstandard.org/using/dicomweb
 */

import { getTenantId } from '../tenantStore'

const DICOMWEB_BASE_URL = '/dicomweb'

/**
 * DICOMweb API용 공통 헤더 생성
 *
 * @param accept Accept 헤더 값
 * @returns 헤더 객체
 */
function getDicomWebHeaders(accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': accept,
  }

  // 멀티테넌시: X-Tenant-Id 헤더 추가
  const tenantId = getTenantId()
  if (tenantId !== undefined && tenantId !== null) {
    headers['X-Tenant-Id'] = String(tenantId)
  }

  return headers
}

/**
 * DICOM JSON 값 타입
 */
interface DicomValue {
  vr: string
  Value?: (string | number | Record<string, unknown>)[]
}

/**
 * DICOM JSON 객체 타입
 */
type DicomJsonObject = Record<string, DicomValue>

/**
 * Study 검색 결과 타입
 */
export interface DicomStudy {
  studyInstanceUid: string
  studyDate?: string
  studyDescription?: string
  patientId?: string
  patientName?: string
  numberOfSeries?: number
  numberOfInstances?: number
}

/**
 * Series 검색 결과 타입
 */
export interface DicomSeries {
  studyInstanceUid: string
  seriesInstanceUid: string
  seriesNumber?: number
  modality?: string
  seriesDescription?: string
  numberOfInstances?: number
}

/**
 * Instance 검색 결과 타입
 */
export interface DicomInstance {
  studyInstanceUid: string
  seriesInstanceUid: string
  sopInstanceUid: string
  sopClassUid?: string
  instanceNumber?: number
  rows?: number
  columns?: number
  numberOfFrames?: number
}

// ============================================================
// DICOM JSON 파싱 헬퍼
// ============================================================

/**
 * DICOM JSON에서 문자열 값 추출
 */
function getDicomString(json: DicomJsonObject, tag: string): string | undefined {
  const value = json[tag]?.Value?.[0]
  return typeof value === 'string' ? value : undefined
}

/**
 * DICOM JSON에서 숫자 값 추출
 */
function getDicomNumber(json: DicomJsonObject, tag: string): number | undefined {
  const value = json[tag]?.Value?.[0]
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

/**
 * DICOM JSON을 DicomStudy로 변환
 */
function parseStudy(json: DicomJsonObject): DicomStudy {
  return {
    studyInstanceUid: getDicomString(json, '0020000D') || '',
    studyDate: getDicomString(json, '00080020'),
    studyDescription: getDicomString(json, '00081030'),
    patientId: getDicomString(json, '00100020'),
    patientName: getDicomString(json, '00100010'),
    numberOfSeries: getDicomNumber(json, '00201206'),
    numberOfInstances: getDicomNumber(json, '00201208'),
  }
}

/**
 * DICOM JSON을 DicomSeries로 변환
 */
function parseSeries(json: DicomJsonObject): DicomSeries {
  return {
    studyInstanceUid: getDicomString(json, '0020000D') || '',
    seriesInstanceUid: getDicomString(json, '0020000E') || '',
    seriesNumber: getDicomNumber(json, '00200011'),
    modality: getDicomString(json, '00080060'),
    seriesDescription: getDicomString(json, '0008103E'),
    numberOfInstances: getDicomNumber(json, '00201209'),
  }
}

/**
 * DICOM JSON을 DicomInstance로 변환
 */
function parseInstance(json: DicomJsonObject): DicomInstance {
  return {
    studyInstanceUid: getDicomString(json, '0020000D') || '',
    seriesInstanceUid: getDicomString(json, '0020000E') || '',
    sopInstanceUid: getDicomString(json, '00080018') || '',
    sopClassUid: getDicomString(json, '00080016'),
    instanceNumber: getDicomNumber(json, '00200013'),
    rows: getDicomNumber(json, '00280010'),
    columns: getDicomNumber(json, '00280011'),
    numberOfFrames: getDicomNumber(json, '00280008'),
  }
}

// ============================================================
// QIDO-RS: Query Services
// ============================================================

/**
 * QIDO-RS: Study 검색
 *
 * @param params 검색 파라미터
 * @returns Study 목록
 */
export async function searchStudies(params?: {
  PatientID?: string
  PatientName?: string
  StudyDate?: string
  StudyInstanceUID?: string
  limit?: number
  offset?: number
}): Promise<DicomStudy[]> {
  const searchParams = new URLSearchParams()

  if (params?.PatientID) searchParams.set('PatientID', params.PatientID)
  if (params?.PatientName) searchParams.set('PatientName', params.PatientName)
  if (params?.StudyDate) searchParams.set('StudyDate', params.StudyDate)
  if (params?.StudyInstanceUID) searchParams.set('StudyInstanceUID', params.StudyInstanceUID)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const url = `${DICOMWEB_BASE_URL}/studies${searchParams.toString() ? `?${searchParams}` : ''}`

  const response = await fetch(url, {
    headers: getDicomWebHeaders('application/dicom+json'),
  })

  if (!response.ok) {
    throw new Error(`QIDO-RS searchStudies failed: ${response.status}`)
  }

  const data: DicomJsonObject[] = await response.json()
  return data.map(parseStudy)
}

/**
 * QIDO-RS: Series 검색
 *
 * @param studyUid Study Instance UID
 * @param params 검색 파라미터
 * @returns Series 목록
 */
export async function searchSeries(
  studyUid: string,
  params?: {
    Modality?: string
    SeriesInstanceUID?: string
  }
): Promise<DicomSeries[]> {
  const searchParams = new URLSearchParams()

  if (params?.Modality) searchParams.set('Modality', params.Modality)
  if (params?.SeriesInstanceUID) searchParams.set('SeriesInstanceUID', params.SeriesInstanceUID)

  const url = `${DICOMWEB_BASE_URL}/studies/${studyUid}/series${searchParams.toString() ? `?${searchParams}` : ''}`

  const response = await fetch(url, {
    headers: getDicomWebHeaders('application/dicom+json'),
  })

  if (!response.ok) {
    if (response.status === 404) return []
    throw new Error(`QIDO-RS searchSeries failed: ${response.status}`)
  }

  const data: DicomJsonObject[] = await response.json()
  return data.map(parseSeries)
}

/**
 * QIDO-RS: Instance 검색
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param params 검색 파라미터
 * @returns Instance 목록
 */
export async function searchInstances(
  studyUid: string,
  seriesUid: string,
  params?: {
    SOPInstanceUID?: string
  }
): Promise<DicomInstance[]> {
  const searchParams = new URLSearchParams()

  if (params?.SOPInstanceUID) searchParams.set('SOPInstanceUID', params.SOPInstanceUID)

  const url = `${DICOMWEB_BASE_URL}/studies/${studyUid}/series/${seriesUid}/instances${searchParams.toString() ? `?${searchParams}` : ''}`

  const response = await fetch(url, {
    headers: getDicomWebHeaders('application/dicom+json'),
  })

  if (!response.ok) {
    if (response.status === 404) return []
    throw new Error(`QIDO-RS searchInstances failed: ${response.status}`)
  }

  const data: DicomJsonObject[] = await response.json()
  return data.map(parseInstance)
}

// ============================================================
// WADO-RS: Retrieve Services
// ============================================================

/**
 * WADO-RS: Study 메타데이터 조회
 *
 * @param studyUid Study Instance UID
 * @returns Instance 메타데이터 목록
 */
export async function getStudyMetadata(studyUid: string): Promise<DicomInstance[]> {
  const url = `${DICOMWEB_BASE_URL}/studies/${studyUid}/metadata`

  const response = await fetch(url, {
    headers: getDicomWebHeaders('application/dicom+json'),
  })

  if (!response.ok) {
    throw new Error(`WADO-RS getStudyMetadata failed: ${response.status}`)
  }

  const data: DicomJsonObject[] = await response.json()
  return data.map(parseInstance)
}

/**
 * WADO-RS: Series 메타데이터 조회
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @returns Instance 메타데이터 목록
 */
export async function getSeriesMetadata(
  studyUid: string,
  seriesUid: string
): Promise<DicomInstance[]> {
  const url = `${DICOMWEB_BASE_URL}/studies/${studyUid}/series/${seriesUid}/metadata`

  const response = await fetch(url, {
    headers: getDicomWebHeaders('application/dicom+json'),
  })

  if (!response.ok) {
    throw new Error(`WADO-RS getSeriesMetadata failed: ${response.status}`)
  }

  const data: DicomJsonObject[] = await response.json()
  return data.map(parseInstance)
}

/**
 * WADO-RS: Instance 메타데이터 조회
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @returns Instance 메타데이터
 */
export async function getInstanceMetadata(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): Promise<DicomInstance | null> {
  const url = `${DICOMWEB_BASE_URL}/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/metadata`

  const response = await fetch(url, {
    headers: getDicomWebHeaders('application/dicom+json'),
  })

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error(`WADO-RS getInstanceMetadata failed: ${response.status}`)
  }

  const data: DicomJsonObject[] = await response.json()
  return data.length > 0 ? parseInstance(data[0]) : null
}

/**
 * WADO-RS: DICOM 파일 URL 생성
 *
 * Cornerstone3D에서 사용할 WADO-RS URL을 반환합니다.
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @returns WADO-RS URL
 */
export function getInstanceUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): string {
  return `${DICOMWEB_BASE_URL}/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}`
}

/**
 * WADO-RS: DICOM 파일 다운로드
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @returns ArrayBuffer (DICOM 파일)
 */
export async function retrieveInstance(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): Promise<ArrayBuffer> {
  const url = getInstanceUrl(studyUid, seriesUid, sopInstanceUid)

  const response = await fetch(url, {
    headers: getDicomWebHeaders('application/dicom'),
  })

  if (!response.ok) {
    throw new Error(`WADO-RS retrieveInstance failed: ${response.status}`)
  }

  return response.arrayBuffer()
}

// ============================================================
// WADO-URI: Legacy Support
// ============================================================

/**
 * WADO-URI: 레거시 URL 생성
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param objectUid SOP Instance UID
 * @returns WADO-URI URL
 */
export function getWadoUriUrl(
  studyUid: string,
  seriesUid: string,
  objectUid: string
): string {
  const params = new URLSearchParams({
    requestType: 'WADO',
    studyUID: studyUid,
    seriesUID: seriesUid,
    objectUID: objectUid,
  })
  return `${DICOMWEB_BASE_URL}/wado?${params}`
}

// ============================================================
// WADO-RS Rendered: Multi-Slot Viewer Support
// ============================================================

/**
 * WADO-RS Rendered: 특정 프레임의 렌더링된 이미지 URL 생성
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (1-based)
 * @returns Rendered image URL
 */
export function getRenderedFrameUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber: number
): string {
  return `${DICOMWEB_BASE_URL}/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNumber}/rendered`
}

/**
 * WADO-RS Rendered: 렌더링된 프레임 이미지 조회
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (1-based)
 * @returns Image Blob
 */
export async function getRenderedFrame(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber: number
): Promise<Blob> {
  const url = getRenderedFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber)
  console.log('[dicomWebService] getRenderedFrame URL:', url)

  try {
    const response = await fetch(url, {
      headers: getDicomWebHeaders('image/jpeg, image/png'),
    })

    console.log('[dicomWebService] getRenderedFrame response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
    })

    if (!response.ok) {
      throw new Error(`WADO-RS getRenderedFrame failed: ${response.status}`)
    }

    const blob = await response.blob()
    console.log('[dicomWebService] getRenderedFrame blob:', { size: blob.size, type: blob.type })
    return blob
  } catch (error) {
    console.error('[dicomWebService] getRenderedFrame error:', error)
    throw error
  }
}

/**
 * WADO-RS: 특정 프레임의 DICOM 데이터 URL 생성
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (1-based)
 * @returns Frame URL
 */
export function getFrameUrl(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber: number
): string {
  return `${DICOMWEB_BASE_URL}/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNumber}`
}

/**
 * WADO-RS: 특정 프레임 조회
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 프레임 번호 (1-based)
 * @returns ArrayBuffer (DICOM 프레임 데이터)
 */
export async function retrieveFrame(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumber: number
): Promise<ArrayBuffer> {
  const url = getFrameUrl(studyUid, seriesUid, sopInstanceUid, frameNumber)

  const response = await fetch(url, {
    headers: getDicomWebHeaders('application/octet-stream'),
  })

  if (!response.ok) {
    throw new Error(`WADO-RS retrieveFrame failed: ${response.status}`)
  }

  return response.arrayBuffer()
}

// ============================================================
// STOW-RS: Store Services
// ============================================================

/**
 * STOW-RS Response 타입
 */
export interface StowRsResponse {
  /**
   * 업로드된 Study Instance UID
   */
  studyInstanceUid?: string
  /**
   * 업로드된 Series Instance UID
   */
  seriesInstanceUid?: string
  /**
   * 업로드된 SOP Instance UID
   */
  sopInstanceUid?: string
  /**
   * 업로드 성공 여부
   */
  success: boolean
  /**
   * 에러 메시지 (실패 시)
   */
  error?: string
}

/**
 * STOW-RS 업로드 옵션
 */
export interface StoreInstanceOptions {
  /**
   * 테넌트 ID (멀티테넌시)
   * 지정하지 않으면 서버 기본값(1) 사용
   */
  tenantId?: number | string
  /**
   * 진행률 콜백 (0-100)
   */
  onProgress?: (progress: number) => void
}

/**
 * STOW-RS: DICOM 파일 업로드
 *
 * @param file DICOM 파일
 * @param options 업로드 옵션 (tenantId, onProgress)
 * @returns StowRsResponse
 *
 * @example
 * // 기본 업로드 (tenant_id = 1)
 * await storeInstance(file)
 *
 * // 특정 테넌트로 업로드
 * await storeInstance(file, { tenantId: 2 })
 *
 * // 진행률 추적과 함께
 * await storeInstance(file, {
 *   tenantId: 2,
 *   onProgress: (progress) => console.log(`${progress}%`)
 * })
 */
export async function storeInstance(
  file: File,
  options?: StoreInstanceOptions
): Promise<StowRsResponse> {
  const url = `${DICOMWEB_BASE_URL}/studies`
  const { tenantId, onProgress } = options || {}

  // multipart/related 형식으로 전송
  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // 진행률 추적
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        // 성공
        try {
          const response = xhr.responseText ? JSON.parse(xhr.responseText) : {}
          resolve({
            studyInstanceUid: response.studyInstanceUid,
            seriesInstanceUid: response.seriesInstanceUid,
            sopInstanceUid: response.sopInstanceUid,
            success: true,
          })
        } catch {
          // JSON 파싱 실패해도 성공으로 처리 (일부 STOW-RS 구현은 빈 응답)
          resolve({
            success: true,
          })
        }
      } else if (xhr.status === 409) {
        // Conflict - 중복 파일
        resolve({
          success: false,
          error: '이미 존재하는 파일입니다',
        })
      } else if (xhr.status === 413) {
        // Payload Too Large
        resolve({
          success: false,
          error: '파일 크기가 너무 큽니다',
        })
      } else if (xhr.status === 415) {
        // Unsupported Media Type
        resolve({
          success: false,
          error: '지원하지 않는 파일 형식입니다',
        })
      } else if (xhr.status === 422) {
        // Unprocessable Entity
        resolve({
          success: false,
          error: '유효하지 않은 DICOM 파일입니다',
        })
      } else {
        reject(new Error(`STOW-RS upload failed: ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('네트워크 오류')))
    xhr.addEventListener('timeout', () => reject(new Error('요청 시간 초과')))

    xhr.open('POST', url)
    xhr.setRequestHeader('Accept', 'application/dicom+json')

    // 멀티테넌시: X-Tenant-Id 헤더 설정
    if (tenantId !== undefined && tenantId !== null) {
      xhr.setRequestHeader('X-Tenant-Id', String(tenantId))
    }

    xhr.timeout = 120000 // 120초 타임아웃
    xhr.send(formData)
  })
}
