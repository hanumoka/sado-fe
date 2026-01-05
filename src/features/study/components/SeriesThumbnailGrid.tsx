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

interface SeriesThumbnailGridProps {
  seriesList: Series[]
  studyInstanceUid?: string
}

/**
 * Series 카드 컴포넌트 (썸네일 포함)
 */
interface SeriesCardProps {
  series: Series
  studyInstanceUid?: string
  onView: (seriesId: string) => void
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
      role="button"
      tabIndex={0}
      aria-label={`${series.modality} Series ${series.seriesNumber}: ${series.seriesDescription || 'No description'}, ${series.instancesCount}개 이미지`}
      className={`${colors.bg} rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
      onClick={() => onView(series.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView(series.id)
        }
      }}
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Button
            variant="secondary"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onView(series.id)
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            뷰어 열기
          </Button>
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

  const handleViewSeries = (seriesId: string) => {
    // seriesId로 해당 Series 찾기
    const series = seriesList.find((s) => s.id === seriesId)
    if (!series || !studyInstanceUid) return

    // studyInstanceUid와 seriesInstanceUid를 URL 파라미터로 전달
    navigate(`/viewer/${studyInstanceUid}/${series.seriesInstanceUid}`)
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
  )
}
