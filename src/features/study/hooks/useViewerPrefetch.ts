/**
 * useViewerPrefetch - DICOM 뷰어 사전 준비 훅
 *
 * 뷰어 페이지 진입 전 필요한 리소스를 사전 로드하여
 * Play 버튼 클릭 시 즉시 재생이 가능하도록 준비합니다.
 *
 * 사전 준비 작업:
 * 1. Cornerstone 초기화 (500-800ms 절감)
 * 2. Instance 목록 조회 (300-500ms 절감)
 * 3. 메타데이터 Fetch (200-300ms 절감)
 * 4. 첫 프레임 Prefetch (100-200ms 절감)
 */

import { useState, useCallback } from 'react'
import { initCornerstone } from '@/lib/cornerstone/initCornerstone'
import { searchInstances } from '@/lib/services/dicomWebService'
import { fetchAndCacheMetadata } from '@/features/dicom-viewer-wado-rs-bulkdata/utils/wadoRsBulkDataMetadataProvider'
import { createWadoRsBulkDataImageIds } from '@/features/dicom-viewer-wado-rs-bulkdata/utils/wadoRsBulkDataImageIdHelper'
import { loadWadoRsBulkDataImage } from '@/features/dicom-viewer-wado-rs-bulkdata/utils/wadoRsBulkDataImageLoader'

// 디버그 로그 플래그
const DEBUG_PREFETCH = false

interface PrefetchOptions {
  studyInstanceUid: string
  seriesInstanceUid: string
}

export function useViewerPrefetch() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState('')

  const prefetch = useCallback(async (options: PrefetchOptions): Promise<void> => {
    const { studyInstanceUid, seriesInstanceUid } = options

    setIsLoading(true)

    try {
      const startTime = performance.now()

      // Step 1: Cornerstone 초기화 (이미 되어있으면 즉시 반환)
      setProgress('뷰어 초기화 중...')
      const csStart = performance.now()
      await initCornerstone()
      if (DEBUG_PREFETCH) {
        console.log(`[ViewerPrefetch] Cornerstone 초기화 완료 (${Math.round(performance.now() - csStart)}ms)`)
      }

      // Step 2: Instance 목록 조회
      setProgress('DICOM 목록 조회 중...')
      const instanceStart = performance.now()
      const instances = await searchInstances(studyInstanceUid, seriesInstanceUid)
      if (DEBUG_PREFETCH) {
        console.log(`[ViewerPrefetch] Instance 목록 조회 완료 (${Math.round(performance.now() - instanceStart)}ms) - ${instances.length}개`)
      }

      if (instances.length === 0) {
        setProgress('DICOM 파일 없음')
        return
      }

      // Step 3: 첫 번째 Instance 메타데이터 Fetch
      const firstInstance = instances[0]
      const sopInstanceUid = firstInstance['00080018']?.Value?.[0] || ''
      const numberOfFramesRaw = firstInstance['00280008']?.Value?.[0]
      const numberOfFrames = typeof numberOfFramesRaw === 'string'
        ? parseInt(numberOfFramesRaw, 10)
        : (numberOfFramesRaw || 1)

      if (sopInstanceUid) {
        setProgress('메타데이터 로딩 중...')
        const metaStart = performance.now()
        await fetchAndCacheMetadata(studyInstanceUid, seriesInstanceUid, sopInstanceUid)
        if (DEBUG_PREFETCH) {
          console.log(`[ViewerPrefetch] 메타데이터 캐시 완료 (${Math.round(performance.now() - metaStart)}ms)`)
        }

        // Step 4: 첫 프레임 Prefetch
        if (numberOfFrames > 0) {
          setProgress('첫 프레임 로딩 중...')
          const frameStart = performance.now()
          const imageIds = createWadoRsBulkDataImageIds(
            studyInstanceUid,
            seriesInstanceUid,
            sopInstanceUid,
            numberOfFrames
          )
          await loadWadoRsBulkDataImage(imageIds[0])
          if (DEBUG_PREFETCH) {
            console.log(`[ViewerPrefetch] 첫 프레임 로드 완료 (${Math.round(performance.now() - frameStart)}ms)`)
          }
        }
      }

      const totalTime = Math.round(performance.now() - startTime)
      setProgress('준비 완료!')
      if (DEBUG_PREFETCH) {
        console.log(`[ViewerPrefetch] 전체 사전 준비 완료 (${totalTime}ms)`)
      }
    } catch (error) {
      console.error('[ViewerPrefetch] 사전 준비 실패:', error)
      setProgress('준비 실패')
      // 에러가 발생해도 페이지 이동은 진행 (뷰어에서 재시도)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { prefetch, isLoading, progress }
}
