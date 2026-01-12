/**
 * WADO-RS Rendered 로더 전략
 *
 * 서버 측에서 PNG/JPEG로 렌더링된 이미지를 받아오는 방식
 * - 장점: 클라이언트 디코딩 불필요, 가장 빠른 로딩
 * - 단점: Window/Level 조절 제한
 */
import type { ViewerLoaderStrategy } from '../types/viewerTypes'
import { getRenderedFrameUrl } from '@/lib/services/dicomWebService'
import { createWadoRsRenderedImageIds } from '@/lib/cornerstone/wadoRsRenderedLoader'

export const wadoRsRenderedStrategy: ViewerLoaderStrategy = {
  loaderType: 'wadors-rendered',
  displayName: 'WADO-RS Rendered',
  accentColor: 'blue',
  toolGroupId: 'WADORS_RENDERED_TOOL_GROUP',
  renderingEngineId: 'wadoRsRenderedEngine',

  /**
   * ImageId 배열 생성
   * wadors-rendered:{studyUid}:{seriesUid}:{sopUid}:{frameNumber}
   */
  createImageIds: (
    studyUid: string,
    seriesUid: string,
    sopUid: string,
    numberOfFrames: number
  ): string[] => {
    return createWadoRsRenderedImageIds(studyUid, seriesUid, sopUid, numberOfFrames)
  },

  /**
   * 썸네일 URL 생성
   * WADO-RS Rendered API로 직접 이미지 반환
   */
  getThumbnailUrl: (
    studyUid: string,
    seriesUid: string,
    sopUid: string,
    frameNumber: number
  ): string => {
    return getRenderedFrameUrl(studyUid, seriesUid, sopUid, frameNumber)
  },
}
