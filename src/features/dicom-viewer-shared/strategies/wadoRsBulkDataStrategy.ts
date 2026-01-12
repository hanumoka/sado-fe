/**
 * WADO-RS BulkData 로더 전략
 *
 * WADO-RS BulkData API로 PixelData를 받아 클라이언트에서 디코딩하는 방식
 * - 장점: Window/Level 조절 가능, 원본 데이터 활용
 * - 단점: 클라이언트 디코딩 필요, 메타데이터 사전 로드 필요
 */
import type { ViewerLoaderStrategy } from '../types/viewerTypes'
import {
  createWadoRsBulkDataImageIds,
  getWadoRsBulkDataThumbnailUrl,
} from '@/features/dicom-viewer-wado-rs-bulkdata/utils/wadoRsBulkDataImageIdHelper'
import { fetchAndCacheMetadata } from '@/features/dicom-viewer-wado-rs-bulkdata/utils/wadoRsBulkDataMetadataProvider'

export const wadoRsBulkDataStrategy: ViewerLoaderStrategy = {
  loaderType: 'wadors',
  displayName: 'WADO-RS BulkData',
  accentColor: 'cyan',
  toolGroupId: 'WADORS_BULKDATA_TOOL_GROUP',
  renderingEngineId: 'wadoRsBulkDataEngine',

  /**
   * ImageId 배열 생성
   * wadors:http://host/dicomweb/studies/.../frames/N
   */
  createImageIds: (
    studyUid: string,
    seriesUid: string,
    sopUid: string,
    numberOfFrames: number
  ): string[] => {
    return createWadoRsBulkDataImageIds(studyUid, seriesUid, sopUid, numberOfFrames)
  },

  /**
   * 썸네일 URL 생성
   * WADO-RS Rendered API 사용 (BulkData는 렌더링 없이 raw 반환하므로)
   */
  getThumbnailUrl: (
    studyUid: string,
    seriesUid: string,
    sopUid: string,
    _frameNumber: number
  ): string => {
    return getWadoRsBulkDataThumbnailUrl(studyUid, seriesUid, sopUid)
  },

  /**
   * 메타데이터 사전 로드 (BulkData 전용)
   * cornerstoneDICOMImageLoader가 이미지 디코딩에 필요한 메타데이터를 미리 캐시
   */
  fetchMetadata: async (
    studyUid: string,
    seriesUid: string,
    sopUid: string
  ): Promise<void> => {
    await fetchAndCacheMetadata(studyUid, seriesUid, sopUid)
  },
}
