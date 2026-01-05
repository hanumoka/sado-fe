/**
 * adminService.ts
 *
 * Admin Dashboard 관련 API 서비스
 *
 * 목적:
 * - Admin Dashboard 통계 데이터 조회
 * - Backend Admin API 연동
 */

import { api } from '@/lib/api'
import type {
  DashboardSummary,
  StorageSummary,
  TierDistribution,
  FileAssetSummary,
  TieringPolicies,
  CategoryStorageMetrics,
  StorageMetricsTrend,
  SeaweedFSCapacity,
  PageResponse,
} from '@/types'

/**
 * Dashboard 전체 통계 조회
 *
 * @returns Promise<DashboardSummary>
 */
async function fetchDashboardSummaryImpl(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>('/api/admin/dashboard/summary')
  return response
}

/**
 * 스토리지 메트릭 조회
 *
 * @returns Promise<StorageSummary>
 */
async function fetchStorageMetricsImpl(): Promise<StorageSummary> {
  const response = await api.get<StorageSummary>('/api/admin/metrics/storage')
  return response
}

/**
 * Tier 분포 조회
 *
 * @returns Promise<TierDistribution>
 */
async function fetchTierDistributionImpl(): Promise<TierDistribution> {
  const response = await api.get<TierDistribution>('/api/admin/metrics/tier-distribution')
  return response
}

/**
 * Tier별 파일 목록 페이징 조회
 *
 * @param tier - Storage Tier (HOT, WARM, COLD)
 * @param page - 페이지 번호 (0부터 시작, 기본값: 0)
 * @param size - 페이지 크기 (기본값: 20)
 * @returns Promise<PageResponse<FileAssetSummary>>
 */
async function fetchTieringFilesImpl(
  tier: 'HOT' | 'WARM' | 'COLD',
  page: number = 0,
  size: number = 20
): Promise<PageResponse<FileAssetSummary>> {
  const params = new URLSearchParams({
    tier,
    page: page.toString(),
    size: size.toString(),
  })

  const response = await api.get<PageResponse<FileAssetSummary>>(
    `/api/admin/tiering/files?${params.toString()}`
  )
  return response
}

/**
 * Storage Tiering 정책 조회
 *
 * @returns Promise<TieringPolicies>
 */
async function fetchTieringPoliciesImpl(): Promise<TieringPolicies> {
  const response = await api.get<TieringPolicies>('/api/admin/tiering/policies')
  return response
}

/**
 * 카테고리별 스토리지 사용량 메트릭 조회
 *
 * @returns Promise<CategoryStorageMetrics[]>
 */
async function fetchStorageByCategoryImpl(): Promise<CategoryStorageMetrics[]> {
  const response = await api.get<CategoryStorageMetrics[]>(
    '/api/admin/metrics/storage-by-category'
  )
  return response
}

/**
 * 스토리지 메트릭 트렌드 조회 (시계열 데이터)
 *
 * @param range 조회 범위 ('7d' | '30d' | '90d')
 * @returns Promise<StorageMetricsTrend[]>
 */
async function fetchStorageMetricsTrendsImpl(
  range: '7d' | '30d' | '90d' = '7d'
): Promise<StorageMetricsTrend[]> {
  const response = await api.get<StorageMetricsTrend[]>(
    `/api/admin/metrics/trends?range=${range}`
  )
  return response || []
}

/**
 * SeaweedFS 물리적 스토리지 용량 조회
 *
 * @returns Promise<SeaweedFSCapacity>
 */
async function fetchSeaweedFSCapacityImpl(): Promise<SeaweedFSCapacity> {
  const response = await api.get<SeaweedFSCapacity>(
    '/api/admin/seaweedfs/capacity'
  )
  return response
}

// Export
export const fetchDashboardSummary = fetchDashboardSummaryImpl
export const fetchStorageMetrics = fetchStorageMetricsImpl
export const fetchTierDistribution = fetchTierDistributionImpl
export const fetchTieringFiles = fetchTieringFilesImpl
export const fetchTieringPolicies = fetchTieringPoliciesImpl
export const fetchStorageByCategory = fetchStorageByCategoryImpl
export const fetchStorageMetricsTrends = fetchStorageMetricsTrendsImpl
export const fetchSeaweedFSCapacity = fetchSeaweedFSCapacityImpl
