/**
 * services/index.ts
 *
 * 서비스 레이어 통합 export
 */

// Patient 서비스
export { fetchPatients, fetchPatientById } from './patientService'

// Study 서비스
export {
  fetchStudies,
  fetchStudyById,
  fetchSeriesByStudyId,
} from './studyService'

// Instance 서비스
export { fetchInstancesBySeriesId } from './instanceService'

// DICOMweb 서비스 (QIDO-RS, WADO-RS)
export {
  // Types
  type DicomStudy,
  type DicomSeries,
  type DicomInstance,
  // QIDO-RS
  searchStudies,
  searchSeries,
  searchInstances,
  // WADO-RS
  getStudyMetadata,
  getSeriesMetadata,
  getInstanceMetadata,
  getInstanceUrl,
  retrieveInstance,
  // WADO-URI
  getWadoUriUrl,
} from './dicomWebService'
