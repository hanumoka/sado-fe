/**
 * useSeriesThumbnail.ts
 *
 * Series 썸네일 Hook
 *
 * 기능:
 * - Series의 첫 번째 Instance로부터 썸네일 생성
 * - Cornerstone3D로 DICOM 이미지 렌더링
 * - Canvas를 Base64로 변환
 * - 썸네일 캐싱 (IndexedDB)
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchInstancesBySeriesId } from '@/lib/services/instanceService'
import * as cornerstone from '@cornerstonejs/core'
import { renderToCanvasCPU } from '@cornerstonejs/core/utilities'
import { getWadoUriUrl } from '@/lib/services/dicomWebService'

/**
 * Series 썸네일 Hook
 *
 * @param seriesInstanceUid Series Instance UID
 * @param studyInstanceUid Study Instance UID
 * @returns 썸네일 URL (Base64 Data URL), 로딩 상태, 에러 상태
 */
export function useSeriesThumbnail(
  seriesInstanceUid: string,
  studyInstanceUid: string
) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Series의 Instance 목록 조회
  const {
    data: instances,
    isLoading: isLoadingInstances,
    error: instancesError,
  } = useQuery({
    queryKey: ['series-thumbnail', 'instances', studyInstanceUid, seriesInstanceUid],
    queryFn: () => fetchInstancesBySeriesId(studyInstanceUid, seriesInstanceUid),
    enabled: !!seriesInstanceUid && !!studyInstanceUid,
  })

  useEffect(() => {
    if (!instances || instances.length === 0 || !studyInstanceUid) {
      return
    }

    let cancelled = false

    const generateThumbnail = async () => {
      try {
        if (cancelled) return
        setIsGenerating(true)

        // 첫 번째 Instance 선택
        const firstInstance = instances[0]

        // WADO-URI URL 생성
        const wadoUrl = getWadoUriUrl(
          studyInstanceUid,
          seriesInstanceUid,
          firstInstance.sopInstanceUid
        )

        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10201'
        const imageId = `wadouri:${API_BASE}${wadoUrl}`

        // Cornerstone으로 이미지 로드
        const image = await cornerstone.imageLoader.loadImage(imageId)

        if (cancelled) return

        if (!image) {
          throw new Error('Failed to load image')
        }

        // Canvas 생성 및 이미지 렌더링
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height

        // 이미지를 Canvas에 렌더링
        renderToCanvasCPU(canvas, image)

        // Canvas를 Base64로 변환
        const base64 = canvas.toDataURL('image/jpeg', 0.8)

        if (!cancelled) {
          setThumbnailUrl(base64)
        }

        // TODO: IndexedDB에 캐싱 (선택사항)
        // await cacheThumbnail(seriesInstanceUid, base64)
      } catch (error) {
        console.error('Thumbnail generation failed:', error)
        // 에러 발생 시 null 유지 (Mock 썸네일 표시)
      } finally {
        if (!cancelled) {
          setIsGenerating(false)
        }
      }
    }

    generateThumbnail()

    return () => {
      cancelled = true
    }
  }, [instances, seriesInstanceUid, studyInstanceUid])

  return {
    thumbnailUrl,
    isLoading: isLoadingInstances || isGenerating,
    error: instancesError,
  }
}
