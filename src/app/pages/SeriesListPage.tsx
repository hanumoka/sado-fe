import { useState } from 'react'
import { Film, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/common'
import { useSeries } from '@/features/series/hooks/useSeries'
import SeriesSearchForm from '@/features/series/components/SeriesSearchForm'
import SeriesList from '@/features/series/components/SeriesList'
import type { SeriesSearchParams } from '@/features/series/types/series'

/**
 * SeriesListPage.tsx
 *
 * 시리즈 목록 페이지
 *
 * 기능:
 * - Series 검색 (Modality 필터)
 * - Series 목록 테이블
 * - TanStack Query로 데이터 관리
 */
export default function SeriesListPage() {
  const [searchParams, setSearchParams] = useState<SeriesSearchParams>({})
  const { data: seriesList, isLoading, error } = useSeries(searchParams)

  const handleSearch = (params: SeriesSearchParams) => {
    setSearchParams(params)
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <PageHeader
        icon={Film}
        title="시리즈 목록"
        description="DICOM 시리즈를 검색하고 조회합니다"
      />

      {/* 검색 폼 */}
      <SeriesSearchForm onSearch={handleSearch} />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">시리즈 목록을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-medium">오류가 발생했습니다</h3>
            <p className="text-red-600 text-sm mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {/* 데이터 없음 */}
      {!isLoading && !error && seriesList?.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Film className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            시리즈가 없습니다
          </h2>
          <p className="text-gray-500">
            검색 조건을 변경하거나 DICOM 파일을 업로드해 주세요.
          </p>
        </div>
      )}

      {/* 시리즈 목록 */}
      {!isLoading && !error && seriesList && seriesList.length > 0 && (
        <SeriesList seriesList={seriesList} />
      )}
    </div>
  )
}
