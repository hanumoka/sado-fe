/**
 * StorageMonitoringPage.tsx
 *
 * 스토리지 모니터링 페이지
 * - SeaweedFS 용량 현황
 * - 스토리지 트렌드
 * - 카테고리별 사용량
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchSeaweedFSCapacity,
  fetchStorageMetricsTrends,
  fetchStorageByTenant,
} from '@/lib/services/adminService'
import SeaweedFSCapacityCard from '@/components/admin/SeaweedFSCapacityCard'
import StorageByCategoryCard from '@/components/admin/StorageByCategoryCard'
import StorageTrendsChart from '@/components/charts/StorageTrendsChart'

type TrendRange = '7d' | '30d' | '90d'

export default function StorageMonitoringPage() {
  const [trendRange, setTrendRange] = useState<TrendRange>('7d')

  // SeaweedFS 용량 조회
  const { data: capacity, isLoading: capacityLoading } = useQuery({
    queryKey: ['seaweedfsCapacity'],
    queryFn: fetchSeaweedFSCapacity,
    refetchInterval: 60000,
  })

  // 스토리지 트렌드 조회
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['storageTrends', trendRange],
    queryFn: () => fetchStorageMetricsTrends(trendRange),
    refetchInterval: 60000,
  })

  // 테넌트별 사용량 조회
  const { data: tenantMetrics, isLoading: tenantLoading } = useQuery({
    queryKey: ['storageByTenant'],
    queryFn: fetchStorageByTenant,
    refetchInterval: 60000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">스토리지 모니터링</h1>
        <p className="text-gray-600 mt-1">스토리지 사용량 및 트렌드를 모니터링합니다.</p>
      </div>

      {/* 상단: SeaweedFS 용량 + 카테고리별 사용량 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeaweedFSCapacityCard
          data={capacity || { totalCapacity: 0, usedSpace: 0, freeSpace: 0, percentUsed: 0 }}
          isLoading={capacityLoading}
        />
        <StorageByCategoryCard
          data={tenantMetrics || []}
          isLoading={tenantLoading}
        />
      </div>

      {/* 트렌드 차트 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">스토리지 트렌드</h2>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as TrendRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTrendRange(range)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  trendRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range === '7d' ? '7일' : range === '30d' ? '30일' : '90일'}
              </button>
            ))}
          </div>
        </div>
        <StorageTrendsChart
          data={trends || []}
          isLoading={trendsLoading}
        />
      </div>
    </div>
  )
}
