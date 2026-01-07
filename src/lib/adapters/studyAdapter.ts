import type { Study } from '@/types/entities'

// DICOM PersonName 타입 정의 (PN VR)
type DicomPersonName = { Alphabetic?: string } | string | null | undefined

// DICOMweb QIDO-RS Study 응답 타입
// DICOM JSON 형식: { "TagGroup+TagElement": { vr: "VR", Value: [...] } }
// 모든 필드를 Optional로 정의 (실제 응답에서 일부 필드가 누락될 수 있음)
interface DicomWebStudy {
  '0020000D'?: { vr?: 'UI'; Value?: [string] }  // StudyInstanceUID
  '00080020'?: { vr?: 'DA'; Value?: [string] }  // StudyDate
  '00080030'?: { vr?: 'TM'; Value?: [string] }  // StudyTime
  '00081030'?: { vr?: 'LO'; Value?: [string] }  // StudyDescription
  '00100020'?: { vr?: 'LO'; Value?: [string] }  // PatientID
  '00100010'?: { vr?: 'PN'; Value?: [{ Alphabetic?: string }] }  // PatientName
  '00201206'?: { vr?: 'IS'; Value?: [string] }  // NumberOfStudyRelatedSeries
  '00201208'?: { vr?: 'IS'; Value?: [string] }  // NumberOfStudyRelatedInstances
  '00080061'?: { vr?: 'CS'; Value?: [string] }  // ModalitiesInStudy
}

/**
 * DICOM PN (Person Name) VR 값 추출
 * @param pnValue DICOM PN 형식 객체 또는 문자열
 * @returns 추출된 이름 문자열
 */
function extractPersonName(pnValue: DicomPersonName): string {
  if (!pnValue) return ''

  // DICOM JSON 형식: { Alphabetic: "LastName^FirstName" }
  if (typeof pnValue === 'object' && pnValue.Alphabetic) {
    return pnValue.Alphabetic
  }

  // 단순 문자열인 경우
  if (typeof pnValue === 'string') {
    return pnValue
  }

  return ''
}

/**
 * DICOMweb QIDO-RS Study → Frontend Study 변환
 * @param dicom DICOMweb QIDO-RS 응답 객체
 * @param dbId 선택적 DB ID (있으면 사용, 없으면 StudyInstanceUID 사용)
 * @returns Frontend Study 타입
 */
export function adaptDicomWebStudy(dicom: DicomWebStudy, dbId?: number): Study {
  return {
    id: dbId ? String(dbId) : dicom['0020000D']?.Value?.[0] ?? '',
    studyInstanceUid: dicom['0020000D']?.Value?.[0] ?? '',
    studyDate: dicom['00080020']?.Value?.[0] ?? '',
    studyTime: dicom['00080030']?.Value?.[0] ?? '',
    studyDescription: dicom['00081030']?.Value?.[0] ?? '',
    patientId: dicom['00100020']?.Value?.[0] ?? '',
    patientName: extractPersonName(dicom['00100010']?.Value?.[0] ?? null),
    seriesCount: parseInt(dicom['00201206']?.Value?.[0] ?? '0'),
    instancesCount: parseInt(dicom['00201208']?.Value?.[0] ?? '0'),
    modality: dicom['00080061']?.Value?.[0] ?? '',
  }
}
