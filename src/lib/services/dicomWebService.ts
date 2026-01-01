/**
 * dicomWebService.ts
 *
 * DICOMweb API 서비스 (QIDO-RS, WADO-RS)
 *
 * 표준 DICOMweb API를 통해 DICOM 데이터를 조회합니다.
 * - QIDO-RS: Query (Study, Series, Instance 검색)
 * - WADO-RS: Retrieve (메타데이터, DICOM 파일 다운로드)
 *
 * @see https://www.dicomstandard.org/using/dicomweb
 */

const DICOMWEB_BASE_URL = '/dicomweb'

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
    headers: {
      'Accept': 'application/dicom+json',
    },
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
    headers: {
      'Accept': 'application/dicom+json',
    },
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
    headers: {
      'Accept': 'application/dicom+json',
    },
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
    headers: {
      'Accept': 'application/dicom+json',
    },
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
    headers: {
      'Accept': 'application/dicom+json',
    },
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
    headers: {
      'Accept': 'application/dicom+json',
    },
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
    headers: {
      'Accept': 'application/dicom',
    },
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
