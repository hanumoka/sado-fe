import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import StudySearchForm from '@/features/study/components/StudySearchForm'
import StudyList from '@/features/study/components/StudyList'
import { useStudies } from '@/features/study/hooks/useStudies'
import type { StudySearchParams } from '@/features/study/types/study'
import {
  PageHeader,
  ErrorMessage,
  EmptyState,
  TableSkeleton,
} from '@/components/common'

/**
 * StudyListPage.tsx
 *
 * Study 목록 페이지
 *
 * 통합:
 * 1. StudySearchForm (검색 폼)
 * 2. StudyList (목록 테이블)
 * 3. useStudies Hook (데이터 조회)
 * 4. URL 쿼리 파라미터 지원 (환자 선택 시 자동 필터링)
 */
export default function StudyListPage() {
  const [urlSearchParams] = useSearchParams()
  const [searchParams, setSearchParams] = useState<StudySearchParams>({})

  // URL 쿼리 파라미터에서 patientId 가져와서 검색 파라미터에 병합
  // 예: /studies?patientId=PAT-001
  const effectiveSearchParams = useMemo(() => {
    const patientId = urlSearchParams.get('patientId')
    if (patientId) {
      return { ...searchParams, patientId }
    }
    return searchParams
  }, [urlSearchParams, searchParams])

  // TanStack Query Hook
  const {
    data: studies,
    isLoading,
    error,
    refetch,
  } = useStudies(effectiveSearchParams)

  const handleSearch = (params: StudySearchParams) => {
    setSearchParams(params)
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <PageHeader
        icon={FileText}
        title="Study 목록"
        description="검사 기록을 검색하고 상세 정보를 확인하세요"
      />

      {/* 검색 폼 */}
      <StudySearchForm onSearch={handleSearch} />

      {/* 로딩 상태 */}
      {isLoading && <TableSkeleton rows={5} columns={6} />}

      {/* 에러 상태 */}
      {error && <ErrorMessage error={error} onRetry={() => refetch()} />}

      {/* 빈 상태 */}
      {!isLoading && !error && studies && studies.length === 0 && (
        <EmptyState
          icon={FileText}
          title="검색 결과가 없습니다"
          description="다른 검색 조건으로 시도해보세요"
        />
      )}

      {/* Study 목록 */}
      {!isLoading && !error && studies && studies.length > 0 && (
        <StudyList studies={studies} />
      )}
    </div>
  )
}
