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
  TenantStorageMetrics,
  StorageMetricsTrend,
  SeaweedFSCapacity,
  PageResponse,
  TierTransitionHistory,
  MonitoringTasksResponse,
} from '@/types'
import type { FilerEntry, ClusterStatus, VolumeInfo, CreateVolumeRequest, VolumePageResponse, VolumePageParams, CollectionStats } from '@/types/seaweedfs'

/**
 * Dashboard 전체 통계 조회
 *
 * @returns Promise<DashboardSummary>
 */
async function fetchDashboardSummaryImpl(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>('/api/admin/dashboard/summary')
  if (!response) throw new Error('No response from server')
  return response
}

/**
 * 스토리지 메트릭 조회
 *
 * @returns Promise<StorageSummary>
 */
async function fetchStorageMetricsImpl(): Promise<StorageSummary> {
  const response = await api.get<StorageSummary>('/api/admin/metrics/storage')
  if (!response) throw new Error('No response from server')
  return response
}

/**
 * Tier 분포 조회
 *
 * @returns Promise<TierDistribution>
 */
async function fetchTierDistributionImpl(): Promise<TierDistribution> {
  const response = await api.get<TierDistribution>('/api/admin/metrics/tier-distribution')
  if (!response) throw new Error('No response from server')
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
  if (!response) throw new Error('No response from server')
  return response
}

/**
 * Storage Tiering 정책 조회
 *
 * @returns Promise<TieringPolicies>
 */
async function fetchTieringPoliciesImpl(): Promise<TieringPolicies> {
  const response = await api.get<TieringPolicies>('/api/admin/tiering/policies')
  if (!response) throw new Error('No response from server')
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
  return response ?? []
}

/**
 * 테넌트별 스토리지 사용량 메트릭 조회
 * 원본 파일(DICOM)과 사전렌더링 파일(SYSTEM)을 테넌트별로 구분하여 조회
 *
 * @returns Promise<TenantStorageMetrics[]>
 */
async function fetchStorageByTenantImpl(): Promise<TenantStorageMetrics[]> {
  const response = await api.get<TenantStorageMetrics[]>(
    '/api/admin/metrics/storage-by-tenant'
  )
  return response ?? []
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
  if (!response) throw new Error('No response from server')
  return response
}

/**
 * SeaweedFS Filer 디렉토리 조회
 *
 * @param path - 조회할 경로 (기본값: '/')
 * @returns Promise<FilerEntry[]>
 */
async function fetchFilerDirectoryImpl(path: string = '/'): Promise<FilerEntry[]> {
  const params = new URLSearchParams({ path })
  const response = await api.get<FilerEntry[]>(
    `/api/admin/seaweedfs/filer/ls?${params.toString()}`
  )
  return response ?? []
}

// ============================================================
// SeaweedFS Cluster & Volume 관리 API
// ============================================================

/**
 * SeaweedFS 클러스터 상태 조회
 *
 * @returns Promise<ClusterStatus>
 */
async function fetchClusterStatusImpl(): Promise<ClusterStatus> {
  const response = await api.get<ClusterStatus>('/api/admin/seaweedfs/cluster')
  if (!response) throw new Error('No response from server')
  return response
}

/**
 * SeaweedFS Volume 목록 조회
 *
 * @returns Promise<VolumeInfo[]>
 */
async function fetchVolumesImpl(): Promise<VolumeInfo[]> {
  const response = await api.get<VolumeInfo[]>('/api/admin/seaweedfs/volumes')
  return response ?? []
}

/**
 * SeaweedFS Volume 목록 조회 (페이징 + 필터링)
 *
 * @param params - 페이징/필터 파라미터
 * @returns Promise<VolumePageResponse>
 */
async function fetchVolumesPagedImpl(params: VolumePageParams = {}): Promise<VolumePageResponse> {
  const searchParams = new URLSearchParams()

  if (params.page !== undefined) searchParams.set('page', params.page.toString())
  if (params.size !== undefined) searchParams.set('size', params.size.toString())
  if (params.collection) searchParams.set('collection', params.collection)
  if (params.status) searchParams.set('status', params.status)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.order) searchParams.set('order', params.order)

  const queryString = searchParams.toString()
  const url = queryString
    ? `/api/admin/seaweedfs/volumes/page?${queryString}`
    : '/api/admin/seaweedfs/volumes/page'

  const response = await api.get<VolumePageResponse>(url)
  if (!response) throw new Error('No response from server')
  return response
}

/**
 * SeaweedFS Collection별 통계 조회
 *
 * @returns Promise<CollectionStats[]>
 */
async function fetchCollectionStatsImpl(): Promise<CollectionStats[]> {
  const response = await api.get<CollectionStats[]>('/api/admin/seaweedfs/collections/stats')
  return response ?? []
}

/**
 * SeaweedFS Volume 생성
 *
 * @param request - Volume 생성 요청
 */
async function createVolumeImpl(request: CreateVolumeRequest): Promise<void> {
  await api.post('/api/admin/seaweedfs/volumes', request)
}

/**
 * SeaweedFS Volume 삭제
 *
 * @param volumeId - Volume ID
 */
async function deleteVolumeImpl(volumeId: number): Promise<void> {
  await api.delete(`/api/admin/seaweedfs/volumes/${volumeId}`)
}

/**
 * SeaweedFS Filer 파일 삭제
 *
 * @param path - 삭제할 파일 경로
 */
async function deleteFilerFileImpl(path: string): Promise<void> {
  const params = new URLSearchParams({ path })
  await api.delete(`/api/admin/seaweedfs/filer/file?${params.toString()}`)
}

/**
 * SeaweedFS Filer 파일 다운로드 URL 조회
 *
 * @param path - 파일 경로
 * @returns 다운로드 URL
 */
async function getFilerDownloadUrlImpl(path: string): Promise<string> {
  const params = new URLSearchParams({ path })
  const response = await api.get<string>(
    `/api/admin/seaweedfs/filer/download-url?${params.toString()}`
  )
  if (!response) throw new Error('No response from server')
  return response
}

/**
 * Tier 전환 이력 조회
 *
 * @param days - 조회 기간 (기본값: 30일)
 * @param page - 페이지 번호 (기본값: 0)
 * @param size - 페이지 크기 (기본값: 20)
 * @returns Promise<PageResponse<TierTransitionHistory>>
 */
async function fetchTierTransitionHistoryImpl(
  days: number = 30,
  page: number = 0,
  size: number = 20
): Promise<PageResponse<TierTransitionHistory>> {
  const params = new URLSearchParams({
    days: days.toString(),
    page: page.toString(),
    size: size.toString(),
  })

  const response = await api.get<PageResponse<TierTransitionHistory>>(
    `/api/admin/metrics/tier-history?${params.toString()}`
  )
  if (!response) throw new Error('No response from server')
  return response
}

/**
 * 모니터링 작업 현황 조회 (실시간 폴링용)
 *
 * @param limit 최근 업로드 조회 개수 (기본값: 10)
 * @returns Promise<MonitoringTasksResponse>
 */
async function fetchMonitoringTasksImpl(
  limit: number = 10
): Promise<MonitoringTasksResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  })

  const response = await api.get<MonitoringTasksResponse>(
    `/api/admin/monitoring/tasks?${params.toString()}`
  )
  if (!response) throw new Error('No response from server')
  return response
}

// Export
export const fetchDashboardSummary = fetchDashboardSummaryImpl
export const fetchStorageMetrics = fetchStorageMetricsImpl
export const fetchTierDistribution = fetchTierDistributionImpl
export const fetchTieringFiles = fetchTieringFilesImpl
export const fetchTieringPolicies = fetchTieringPoliciesImpl
export const fetchStorageByCategory = fetchStorageByCategoryImpl
export const fetchStorageByTenant = fetchStorageByTenantImpl
export const fetchStorageMetricsTrends = fetchStorageMetricsTrendsImpl
export const fetchSeaweedFSCapacity = fetchSeaweedFSCapacityImpl
export const fetchFilerDirectory = fetchFilerDirectoryImpl
export const fetchClusterStatus = fetchClusterStatusImpl
export const fetchVolumes = fetchVolumesImpl
export const fetchVolumesPaged = fetchVolumesPagedImpl
export const fetchCollectionStats = fetchCollectionStatsImpl
export const createVolume = createVolumeImpl
export const deleteVolume = deleteVolumeImpl
export const deleteFilerFile = deleteFilerFileImpl
export const getFilerDownloadUrl = getFilerDownloadUrlImpl
export const fetchTierTransitionHistory = fetchTierTransitionHistoryImpl
export const fetchMonitoringTasks = fetchMonitoringTasksImpl
