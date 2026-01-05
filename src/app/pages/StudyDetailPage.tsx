import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText } from 'lucide-react'
import { fetchStudyById, fetchSeriesByStudyId } from '@/lib/services'
import StudyMetadata from '@/features/study/components/StudyMetadata'
import SeriesThumbnailGrid from '@/features/study/components/SeriesThumbnailGrid'
import {
  ErrorMessage,
  CardSkeleton,
  GridSkeleton,
} from '@/components/common'
import { Button } from '@/components/ui/button'

/**
 * StudyDetailPage.tsx
 *
 * Study 상세 페이지
 *
 * 기능:
 * - Study 상세 정보 표시 (StudyMetadata)
 * - Series 썸네일 그리드 (SeriesThumbnailGrid)
 * - 서비스 레이어를 통한 데이터 조회
 */
export default function StudyDetailPage() {
  const { studyId } = useParams<{ studyId: string }>()
  const navigate = useNavigate()

  // Study 정보 조회
  const {
    data: study,
    isLoading: isStudyLoading,
    error: studyError,
    refetch: refetchStudy,
  } = useQuery({
    queryKey: ['study', studyId],
    queryFn: () => fetchStudyById(studyId!),
    enabled: !!studyId,
    staleTime: 1000 * 60 * 5,
  })

  // Series 목록 조회
  const {
    data: seriesList,
    isLoading: isSeriesLoading,
    error: seriesError,
    refetch: refetchSeries,
  } = useQuery({
    queryKey: ['series', studyId],
    queryFn: () => fetchSeriesByStudyId(studyId!),
    enabled: !!studyId,
    staleTime: 1000 * 60 * 5,
  })

  const handleBack = () => {
    navigate(-1)
  }

  const isLoading = isStudyLoading || isSeriesLoading
  const error = studyError || seriesError

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* 헤더 스켈레톤 */}
        <div className="flex items-center gap-3">
          <div className="animate-pulse h-9 w-24 bg-gray-200 rounded-md" />
          <div className="animate-pulse h-8 w-8 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="animate-pulse h-6 w-48 bg-gray-200 rounded" />
            <div className="animate-pulse h-4 w-32 bg-gray-200 rounded" />
          </div>
        </div>

        {/* 메타데이터 스켈레톤 */}
        <CardSkeleton />

        {/* 시리즈 그리드 스켈레톤 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse h-6 w-32 bg-gray-200 rounded mb-4" />
          <GridSkeleton items={4} columns={4} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <ErrorMessage
          error={error}
          onRetry={() => {
            refetchStudy()
            refetchSeries()
          }}
        />
      </div>
    )
  }

  if (!study) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-600">Study를 찾을 수 없습니다</p>
          <Button onClick={handleBack} className="mt-4">
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study 상세</h1>
              <p className="text-sm text-gray-600">
                {study.modality} - {study.studyDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Study 메타데이터 */}
      <StudyMetadata study={study} />

      {/* Series 썸네일 그리드 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Series 목록 ({seriesList?.length || 0})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Series를 클릭하면 DICOM Viewer로 이동합니다
          </p>
        </div>

        <div className="p-6">
          <SeriesThumbnailGrid
            seriesList={seriesList || []}
            studyInstanceUid={study.studyInstanceUid}
          />
        </div>
      </div>
    </div>
  )
}
