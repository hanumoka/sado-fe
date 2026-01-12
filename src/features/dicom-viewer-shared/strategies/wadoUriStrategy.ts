/**
 * WADO-URI 로더 전략
 *
 * 레거시 WADO-URI API로 전체 DICOM 파일을 받아 클라이언트에서 디코딩하는 방식
 * - 장점: 레거시 PACS 호환, 완전한 DICOM 메타데이터 접근
 * - 단점: 대용량 전송, 느린 로딩
 */
import type { ViewerLoaderStrategy } from '../types/viewerTypes'
import {
  createWadoUriImageIds,
  getWadoUriThumbnailUrl,
} from '@/features/dicom-viewer-wado-uri/utils/wadoUriImageIdHelper'

export const wadoUriStrategy: ViewerLoaderStrategy = {
  loaderType: 'wadouri',
  displayName: 'WADO-URI',
  accentColor: 'yellow',
  toolGroupId: 'WADO_URI_TOOL_GROUP',
  renderingEngineId: 'wadoUriEngine',

  /**
   * ImageId 배열 생성
   * wadouri:http://host/wado?requestType=WADO&studyUID=...&seriesUID=...&objectUID=...
   */
  createImageIds: (
    studyUid: string,
    seriesUid: string,
    sopUid: string,
    numberOfFrames: number
  ): string[] => {
    return createWadoUriImageIds(studyUid, seriesUid, sopUid, numberOfFrames)
  },

  /**
   * 썸네일 URL 생성
   * WADO-URI는 썸네일용 파라미터(contentType, rows, columns) 지원
   */
  getThumbnailUrl: (
    studyUid: string,
    seriesUid: string,
    sopUid: string,
    _frameNumber: number
  ): string => {
    return getWadoUriThumbnailUrl(studyUid, seriesUid, sopUid)
  },
}
