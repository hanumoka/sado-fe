/**
 * StorageMonitoringPage.tsx
 *
 * 스토리지 모니터링 페이지
 *
 * 기능:
 * - 전체 스토리지 사용량 표시 (Hot/Warm/Cold)
 * - Tier 분포 파이 차트
 * - 카테고리별 스토리지 통계 (Bar Chart + Table)
 * - 30초 자동 갱신
 */

import { useQuery } from '@tanstack/react-query'
import {
  fetchStorageMetrics,
  fetchTierDistribution,
  fetchStorageByCategory,
  fetchSeaweedFSCapacity,
} from '@/lib/services/adminService'
import StorageUsageCard from '@/components/admin/StorageUsageCard'
import TierDistributionChart from '@/components/charts/TierDistributionChart'
import { StorageTrendsChart } from '@/components/charts/StorageTrendsChart'
import StorageByCategoryCard from '@/components/admin/StorageByCategoryCard'
import SeaweedFSCapacityCard from '@/components/admin/SeaweedFSCapacityCard'
import { ErrorMessage, LoadingSpinner } from '@/components/common'

/**
 * 스토리지 모니터링 메인 페이지
 */
export default function StorageMonitoringPage() {
  // 전체 스토리지 사용량 조회 (30초 자동 갱신)
  const {
    data: storageMetrics,
    isLoading: isLoadingStorage,
    error: storageError,
    refetch: refetchStorage,
  } = useQuery({
    queryKey: ['admin', 'metrics', 'storage'],
    queryFn: fetchStorageMetrics,
    refetchInterval: 30000,
    staleTime: 30000, // refetchInterval과 일치
    retry: false,
  })

  // Tier 분포 조회 (30초 자동 갱신)
  const {
    data: tierDistribution,
    isLoading: isLoadingTier,
    error: tierError,
    refetch: refetchTier,
  } = useQuery({
    queryKey: ['admin', 'metrics', 'tier-distribution'],
    queryFn: fetchTierDistribution,
    refetchInterval: 30000,
    staleTime: 30000, // refetchInterval과 일치
    retry: false,
  })

  // 카테고리별 스토리지 조회 (30초 자동 갱신)
  const {
    data: categoryMetrics,
    isLoading: isLoadingCategory,
    error: categoryError,
    refetch: refetchCategory,
  } = useQuery({
    queryKey: ['admin', 'metrics', 'storage-by-category'],
    queryFn: fetchStorageByCategory,
    refetchInterval: 30000,
    staleTime: 30000, // refetchInterval과 일치
    retry: false,
  })

  // SeaweedFS 물리적 용량 조회 (30초 자동 갱신)
  const {
    data: seaweedfsCapacity,
    isLoading: isLoadingSeaweedFS,
    error: seaweedfsError,
    refetch: refetchSeaweedFS,
  } = useQuery({
    queryKey: ['admin', 'seaweedfs', 'capacity'],
    queryFn: fetchSeaweedFSCapacity,
    refetchInterval: 30000,
    staleTime: 30000,
    retry: false,
  })

  // 전체 로딩 상태
  const isLoading = isLoadingStorage || isLoadingTier || isLoadingCategory || isLoadingSeaweedFS

  // 에러 처리
  const error = storageError || tierError || categoryError || seaweedfsError
  const refetch = () => {
    refetchStorage()
    refetchTier()
    refetchCategory()
    refetchSeaweedFS()
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ErrorMessage error={error} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          스토리지 모니터링
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          스토리지 사용량 및 Tier 분포 실시간 모니터링 (30초 자동 갱신)
        </p>
      </div>

      {/* SeaweedFS 물리적 용량 카드 (최상단) */}
      {seaweedfsCapacity && (
        <SeaweedFSCapacityCard capacity={seaweedfsCapacity} />
      )}

      {/* 스토리지 사용량 카드 (FileAsset 기반) */}
      {storageMetrics && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            저장된 파일 메타데이터 (Tier별)
          </h2>
          <StorageUsageCard
            summary={{
              totalSize: storageMetrics.totalSize,
              hotSize: storageMetrics.hotSize,
              warmSize: storageMetrics.warmSize,
              coldSize: storageMetrics.coldSize,
            }}
          />
        </div>
      )}

      {/* Tier 분포 차트 (재사용) */}
      {tierDistribution && (
        <TierDistributionChart distribution={tierDistribution} />
      )}

      {/* 스토리지 사용량 추세 차트 (시계열 데이터) */}
      <StorageTrendsChart />

      {/* 카테고리별 스토리지 통계 (신규) */}
      {categoryMetrics && categoryMetrics.length > 0 && (
        <StorageByCategoryCard categories={categoryMetrics} />
      )}

      {/* 미구현 기능 안내 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-800 mb-2">
          추가 기능 개발 예정
        </h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Tier 전환 히스토리 (Backend API 개발 필요)</li>
          <li>• 스토리지 증가 예측 (Backend API 개발 필요)</li>
        </ul>
      </div>
    </div>
  )
}
