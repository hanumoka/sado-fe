import type { Series, Instance } from '@/types/entities'

// DICOMweb QIDO-RS Series 응답 타입
// 모든 필드를 Optional로 정의 (실제 응답에서 일부 필드가 누락될 수 있음)
interface DicomWebSeries {
  '0020000E'?: { vr?: 'UI'; Value?: [string] }  // SeriesInstanceUID
  '00080060'?: { vr?: 'CS'; Value?: [string] }  // Modality
  '00200011'?: { vr?: 'IS'; Value?: [string] }  // SeriesNumber
  '0008103E'?: { vr?: 'LO'; Value?: [string] }  // SeriesDescription
  '00201209'?: { vr?: 'IS'; Value?: [string] }  // NumberOfSeriesRelatedInstances
}

/**
 * DICOMweb QIDO-RS Series → Frontend Series 변환
 * @param dicom DICOMweb QIDO-RS Series 응답 객체
 * @param studyId Study ID (내부 ID, 예: "STU-001")
 * @param dbId 선택적 DB ID
 * @returns Frontend Series 타입
 */
export function adaptDicomWebSeries(
  dicom: DicomWebSeries,
  studyId: string,
  dbId?: number
): Series {
  return {
    id: dbId ? String(dbId) : dicom['0020000E']?.Value?.[0] ?? '',
    seriesInstanceUid: dicom['0020000E']?.Value?.[0] ?? '',
    studyId,  // ✅ 매개변수로 전달받음
    modality: dicom['00080060']?.Value?.[0] ?? '',
    seriesNumber: parseInt(dicom['00200011']?.Value?.[0] ?? '0'),
    seriesDescription: dicom['0008103E']?.Value?.[0] ?? '',
    instancesCount: parseInt(dicom['00201209']?.Value?.[0] ?? '0'),
  }
}

// DICOMweb QIDO-RS Instance 응답 타입
// 모든 필드를 Optional로 정의 (실제 응답에서 일부 필드가 누락될 수 있음)
interface DicomWebInstance {
  '00080018'?: { vr?: 'UI'; Value?: [string] }  // SOPInstanceUID
  '00200013'?: { vr?: 'IS'; Value?: [string] }  // InstanceNumber
  '00280010'?: { vr?: 'US'; Value?: [number] }  // Rows
  '00280011'?: { vr?: 'US'; Value?: [number] }  // Columns
}

/**
 * DICOMweb QIDO-RS Instance → Frontend Instance 변환
 * @param dicom DICOMweb QIDO-RS Instance 응답 객체
 * @param seriesId Series ID (내부 ID, 예: "SER-001")
 * @param storageUri WADO-RS URL 또는 SeaweedFS URI
 * @param dbId 선택적 DB ID
 * @returns Frontend Instance 타입
 */
export function adaptDicomWebInstance(
  dicom: DicomWebInstance,
  seriesId: string,
  storageUri: string,
  dbId?: number
): Instance {
  const sopInstanceUid = dicom['00080018']?.Value?.[0] ?? ''

  return {
    id: dbId ? String(dbId) : sopInstanceUid,
    sopInstanceUid: sopInstanceUid,
    seriesId,  // ✅ 매개변수로 전달받음
    instanceNumber: parseInt(dicom['00200013']?.Value?.[0] ?? '0'),
    storageUri,  // ✅ 매개변수로 전달받음
  }
}
