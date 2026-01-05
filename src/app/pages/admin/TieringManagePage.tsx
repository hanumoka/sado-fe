/**
 * TieringManagePage.tsx
 *
 * Storage Tier 관리 페이지
 *
 * 기능:
 * - Tier별 파일 목록 조회 (Hot/Warm/Cold 탭)
 * - Tiering 정책 표시 (읽기 전용)
 * - 서버 페이징 지원
 */

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  fetchTieringFiles,
  fetchTieringPolicies,
} from '@/lib/services/adminService'
import TieringPolicyCard from '@/components/admin/TieringPolicyCard'
import TierFileList from '@/components/admin/TierFileList'
import { ErrorMessage, LoadingSpinner } from '@/components/common'

type TierTab = 'HOT' | 'WARM' | 'COLD'

/**
 * Tier 관리 메인 페이지
 */
export default function TieringManagePage() {
  const [activeTier, setActiveTier] = useState<TierTab>('HOT')
  const [page, setPage] = useState(0)
  const size = 20

  // Tier 정책 조회
  const {
    data: policies,
    isLoading: isLoadingPolicies,
    error: policiesError,
  } = useQuery({
    queryKey: ['admin', 'tiering', 'policies'],
    queryFn: fetchTieringPolicies,
    staleTime: 60000, // 1분 캐싱
    retry: false,
  })

  // Tier별 파일 목록 조회 (placeholderData로 페이징 UX 향상 - React Query v5)
  const {
    data: tierFiles,
    isLoading: isLoadingFiles,
    error: filesError,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ['admin', 'tiering', 'files', activeTier, page, size],
    queryFn: () => fetchTieringFiles(activeTier, page, size),
    placeholderData: keepPreviousData,
    staleTime: 30000, // 30초 캐싱
    retry: false,
  })

  // Tier 탭 변경 핸들러
  const handleTierChange = (tier: TierTab) => {
    setActiveTier(tier)
    setPage(0) // 탭 변경 시 첫 페이지로
  }

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  // 에러 처리
  const error = policiesError || filesError
  const refetch = () => {
    refetchFiles()
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tier 관리</h1>
        <p className="text-sm text-gray-600 mt-1">
          Storage Tier별 파일 목록 및 자동 전환 정책 관리
        </p>
      </div>

      {/* Tier 정책 카드 */}
      {isLoadingPolicies ? (
        <div className="bg-white rounded-lg shadow p-6">
          <LoadingSpinner />
        </div>
      ) : policiesError ? (
        <div className="bg-white rounded-lg shadow p-6">
          <ErrorMessage error={policiesError} />
        </div>
      ) : policies ? (
        <TieringPolicyCard policies={policies} />
      ) : null}

      {/* Tier 탭 */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {(['HOT', 'WARM', 'COLD'] as TierTab[]).map((tier) => {
              const isActive = activeTier === tier

              // 정적 클래스 조합으로 변경 (Tailwind JIT 호환)
              const getButtonClasses = () => {
                const baseClasses = 'py-4 px-1 border-b-2 font-medium text-sm'

                if (isActive) {
                  const activeClasses = {
                    HOT: 'border-red-500 text-red-600',
                    WARM: 'border-yellow-500 text-yellow-600',
                    COLD: 'border-blue-500 text-blue-600',
                  }
                  return `${baseClasses} ${activeClasses[tier]}`
                }

                const inactiveClasses = {
                  HOT: 'border-transparent text-gray-500 hover:border-red-300 hover:text-red-700',
                  WARM: 'border-transparent text-gray-500 hover:border-yellow-300 hover:text-yellow-700',
                  COLD: 'border-transparent text-gray-500 hover:border-blue-300 hover:text-blue-700',
                }
                return `${baseClasses} ${inactiveClasses[tier]}`
              }

              return (
                <button
                  key={tier}
                  onClick={() => handleTierChange(tier)}
                  className={getButtonClasses()}
                >
                  {tier} Tier
                  {tierFiles && activeTier === tier && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                      {tierFiles.totalElements.toLocaleString()}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tier별 파일 목록 */}
        <div className="p-6">
          {isLoadingFiles ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <ErrorMessage error={error} onRetry={refetch} />
            </div>
          ) : tierFiles ? (
            <TierFileList
              tier={activeTier}
              data={tierFiles}
              page={page}
              onPageChange={handlePageChange}
            />
          ) : null}
        </div>
      </div>

      {/* 미구현 기능 안내 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-800 mb-2">
          추가 기능 개발 예정
        </h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 수동 Tier 전환 (파일 선택 → Tier 변경) - Backend API 개발 필요</li>
          <li>• Tier 정책 수정 (UI에서 정책 변경) - Backend API 개발 필요</li>
          <li>• Tier 전환 히스토리 조회 - Backend API 개발 필요</li>
        </ul>
      </div>
    </div>
  )
}
