/**
 * AdminDashboardPage.tsx
 *
 * Admin Dashboard 메인 페이지
 * - 전체 통계 요약
 * - Storage Tier 분포
 * - 스토리지 사용량
 */

import { useQuery } from '@tanstack/react-query'
import { Users, FileText, Film, Image } from 'lucide-react'
import {
  fetchDashboardSummary,
  fetchTierDistribution,
  fetchStorageMetrics,
} from '@/lib/services/adminService'
import StatCard from '@/components/admin/StatCard'
import StorageUsageCard from '@/components/admin/StorageUsageCard'
import TierDistributionChart from '@/components/charts/TierDistributionChart'

export default function AdminDashboardPage() {
  // Dashboard 요약 조회
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60000, // 1분마다 갱신
  })

  // Tier 분포 조회
  const { data: tierDistribution, isLoading: tierLoading } = useQuery({
    queryKey: ['tierDistribution'],
    queryFn: fetchTierDistribution,
    refetchInterval: 60000,
  })

  // 스토리지 메트릭 조회
  const { data: storageMetrics, isLoading: storageLoading } = useQuery({
    queryKey: ['storageMetrics'],
    queryFn: fetchStorageMetrics,
    refetchInterval: 60000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-gray-600 mt-1">시스템 현황 및 스토리지 상태를 확인합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="환자 수"
          value={summaryLoading ? '-' : summary?.totalPatients.toLocaleString() || '0'}
          icon={Users}
        />
        <StatCard
          title="Study 수"
          value={summaryLoading ? '-' : summary?.totalStudies.toLocaleString() || '0'}
          icon={FileText}
        />
        <StatCard
          title="Series 수"
          value={summaryLoading ? '-' : summary?.totalSeries.toLocaleString() || '0'}
          icon={Film}
        />
        <StatCard
          title="Instance 수"
          value={summaryLoading ? '-' : summary?.totalInstances.toLocaleString() || '0'}
          icon={Image}
        />
      </div>

      {/* 스토리지 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StorageUsageCard
          data={storageMetrics || { totalSize: 0, hotSize: 0, warmSize: 0, coldSize: 0 }}
          isLoading={storageLoading}
        />
        <TierDistributionChart
          data={tierDistribution || { hot: 0, warm: 0, cold: 0 }}
          isLoading={tierLoading}
        />
      </div>
    </div>
  )
}
