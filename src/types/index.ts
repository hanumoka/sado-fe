/**
 * types/index.ts
 *
 * 타입 모듈 통합 export
 */

// 엔티티 타입
export type {
  Patient,
  Study,
  Series,
  Instance,
  Gender,
  Modality,
} from './entities'

// API 공통 타입
export type {
  ApiResponse,
  Pagination,
  PaginatedResponse,
  PaginationParams,
} from './api'

// 요청 타입
export type {
  PatientListRequest,
  PatientDetailRequest,
  StudyListRequest,
  StudyDetailRequest,
  SeriesListRequest,
  SeriesDetailRequest,
  InstanceListRequest,
  UploadDicomRequest,
  RetrieveInstanceRequest,
  RenderedImageRequest,
} from './request'

// 응답 타입
export type {
  PatientListResponse,
  PatientDetailResponse,
  StudyListResponse,
  StudyDetailResponse,
  SeriesListResponse,
  SeriesDetailResponse,
  InstanceListResponse,
  ViewerSeriesData,
  ViewerInstanceData,
  UploadDicomResponse,
  ApiErrorDetail,
  ApiErrorResponse,
  ErrorCode,
} from './response'

// 에러 코드 상수
export { ErrorCodes } from './response'
