/**
 * AdminDashboardPage.tsx
 *
 * Admin Dashboard 메인 페이지
 *
 * 기능:
 * - DICOM 엔티티 통계 (환자/Study/Series/Instance)
 * - 스토리지 사용량 시각화
 * - Storage Tier 분포 차트
 */

import { useQuery } from '@tanstack/react-query'
import { Users, FileText, Layers, Image } from 'lucide-react'
import { fetchDashboardSummary, fetchSeaweedFSCapacity } from '@/lib/services/adminService'
import StatCard from '@/components/admin/StatCard'
import StorageUsageCard from '@/components/admin/StorageUsageCard'
import SeaweedFSCapacityCard from '@/components/admin/SeaweedFSCapacityCard'
import TierDistributionChart from '@/components/charts/TierDistributionChart'
import { ErrorMessage, LoadingSpinner } from '@/components/common'

/**
 * Admin Dashboard 메인 페이지
 */
export default function AdminDashboardPage() {
  // Dashboard 통계 조회 (30초마다 자동 갱신)
  const {
    data: summary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 30000, // 30초 자동 갱신
    staleTime: 30000, // refetchInterval과 일치 - 불필요한 요청 방지
    retry: false, // 재시도 안 함 - 에러 즉시 표시
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
  const isLoading = isLoadingSummary || isLoadingSeaweedFS
  // 전체 에러 상태
  const error = summaryError || seaweedfsError
  // 전체 재조회
  const refetch = () => {
    refetchSummary()
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
  if (error || !summary) {
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          시스템 전체 상태 및 스토리지 사용량 모니터링
        </p>
      </div>

      {/* DICOM 엔티티 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          title="총 환자 수"
          value={summary.totalPatients}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          icon={FileText}
          title="총 Study 수"
          value={summary.totalStudies}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
        />
        <StatCard
          icon={Layers}
          title="총 Series 수"
          value={summary.totalSeries}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
        />
        <StatCard
          icon={Image}
          title="총 Instance 수"
          value={summary.totalInstances}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
        />
      </div>

      {/* 스토리지 사용량 */}
      <StorageUsageCard summary={summary.storageSummary} />

      {/* SeaweedFS 물리적 스토리지 용량 */}
      {seaweedfsCapacity && (
        <SeaweedFSCapacityCard capacity={seaweedfsCapacity} />
      )}

      {/* Tier 분포 차트 */}
      <TierDistributionChart distribution={summary.tierDistribution} />
    </div>
  )
}
