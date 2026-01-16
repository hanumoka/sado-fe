/**
 * SeriesThumbnailGrid.tsx
 *
 * Series 썸네일 그리드 컴포넌트
 *
 * 기능:
 * - Series를 카드 형태로 표시
 * - 실제 DICOM 이미지 썸네일 표시
 * - 클릭 시 Viewer로 이동
 */

import { useNavigate } from 'react-router-dom'
import { Eye, ImageIcon, Layers, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Series } from '@/types'
import { getModalityCardColor } from '@/constants/modality'
import { useSeriesThumbnail } from '../hooks/useSeriesThumbnail'
import { useViewerPrefetch } from '../hooks/useViewerPrefetch'

interface SeriesThumbnailGridProps {
  seriesList: Series[]
  studyInstanceUid?: string
}

/**
 * Series 카드 컴포넌트 (썸네일 포함)
 */
type ViewerType = 'wado-rs-rendered' | 'wado-rs' | 'wado-uri' | 'mjpeg' | 'mjpeg-wado-rs'

interface SeriesCardProps {
  series: Series
  studyInstanceUid?: string
  onView: (seriesId: string, viewerType: ViewerType) => void
}

/**
 * Series 카드 컴포넌트
 */
function SeriesCard({ series, studyInstanceUid, onView }: SeriesCardProps) {
  const colors = getModalityCardColor(series.modality)

  // Series 썸네일 Hook (실제 DICOM 이미지)
  const { thumbnailUrl, isLoading } = useSeriesThumbnail(
    series.seriesInstanceUid,
    studyInstanceUid || ''
  )

  return (
    <div
      key={series.id}
      aria-label={`${series.modality} Series ${series.seriesNumber}: ${series.seriesDescription || 'No description'}, ${series.instancesCount}개 이미지`}
      className={`${colors.bg} rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
    >
      {/* DICOM 썸네일 */}
      <div className={`relative h-40 ${thumbnailUrl ? 'bg-black' : `bg-gradient-to-br ${colors.gradient}`}`}>
        {/* 썸네일 이미지 */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Series ${series.seriesNumber} thumbnail`}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-16 w-16 text-white/50 animate-spin" />
            ) : (
              <ImageIcon className="h-16 w-16 text-white/50" />
            )}
          </div>
        )}

        {/* Modality 배지 */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-white/90 text-gray-800">
            {series.modality}
          </span>
        </div>

        {/* Series 번호 */}
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-black/50 text-white">
            #{series.seriesNumber}
          </span>
        </div>

        {/* 이미지 수 */}
        <div className="absolute bottom-2 right-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-black/50 text-white">
            <Layers className="h-3 w-3" />
            {series.instancesCount}
          </span>
        </div>

        {/* Hover 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity grid grid-cols-2 gap-1.5 px-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onView(series.id, 'wado-rs-rendered')
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              RS-Rendered
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onView(series.id, 'wado-rs')
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              WADO-RS
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onView(series.id, 'wado-uri')
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              WADO-URI
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-xs bg-green-600 hover:bg-green-500 text-white"
              onClick={(e) => {
                e.stopPropagation()
                onView(series.id, 'mjpeg')
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              MJPEG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="col-span-2 text-xs bg-purple-600 hover:bg-purple-500 text-white"
              onClick={(e) => {
                e.stopPropagation()
                onView(series.id, 'mjpeg-wado-rs')
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              MJPEG+WADO-RS
            </Button>
          </div>
        </div>
      </div>

      {/* Series 정보 */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 truncate">
          {series.seriesDescription || `Series ${series.seriesNumber}`}
        </h3>
        <p className="text-xs text-gray-500 font-mono mt-1 truncate">
          {series.seriesInstanceUid}
        </p>
      </div>
    </div>
  )
}

/**
 * Series 썸네일 그리드 컴포넌트
 */
export default function SeriesThumbnailGrid({
  seriesList,
  studyInstanceUid,
}: SeriesThumbnailGridProps) {
  const navigate = useNavigate()
  const { prefetch, isLoading: isPrefetching, progress } = useViewerPrefetch()

  const handleViewSeries = async (seriesId: string, viewerType: ViewerType) => {
    // MJPEG 뷰어는 별도 페이지로 이동 (자체 사이드바에서 instance 선택)
    if (viewerType === 'mjpeg') {
      navigate('/viewer/mjpeg')
      return
    }

    // seriesId로 해당 Series 찾기
    const series = seriesList.find((s) => s.id === seriesId)
    if (!series || !studyInstanceUid) return

    // Cornerstone 기반 뷰어인 경우 사전 준비 (WADO-RS만)
    if (viewerType === 'wado-rs') {
      await prefetch({
        studyInstanceUid,
        seriesInstanceUid: series.seriesInstanceUid,
      })
    }

    // studyInstanceUid와 seriesInstanceUid를 URL 파라미터로 전달
    navigate(`/viewer/${viewerType}/${studyInstanceUid}/${series.seriesInstanceUid}`)
  }

  if (seriesList.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Layers className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Series가 없습니다</p>
      </div>
    )
  }

  return (
    <>
      {/* Series 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {seriesList.map((series) => (
          <SeriesCard
            key={series.id}
            series={series}
            studyInstanceUid={studyInstanceUid}
            onView={handleViewSeries}
          />
        ))}
      </div>

      {/* 뷰어 준비 로딩 오버레이 */}
      {isPrefetching && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">뷰어 준비 중...</p>
            <p className="text-sm text-gray-400 mt-2">{progress}</p>
          </div>
        </div>
      )}
    </>
  )
}
