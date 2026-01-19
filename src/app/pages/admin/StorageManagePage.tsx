/**
 * StorageManagePage.tsx
 *
 * 파일시스템 관리 통합 페이지
 * - 탭 기반 UI로 모든 스토리지 관리 기능 제공
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Activity,
  Layers,
  Server,
  HardDrive,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Users,
  FileText,
  Film,
  Image,
  Clock,
  Upload,
  Cpu,
  Loader2,
} from 'lucide-react'
import {
  fetchDashboardSummary,
  fetchTierDistribution,
  fetchStorageMetrics,
  fetchSeaweedFSCapacity,
  fetchStorageMetricsTrends,
  fetchStorageByTenant,
  fetchTieringPolicies,
  fetchClusterStatus,
  fetchVolumes,
  fetchFilerDirectory,
  deleteFilerFile,
  getFilerDownloadUrl,
  fetchMonitoringTasks,
} from '@/lib/services/adminService'
import { formatBytes } from '@/lib/utils'
import type { ClusterStatus, VolumeInfo, FilerEntry, MasterNode, VolumeServerNode, FilerNode } from '@/types/seaweedfs'

// Components
import StatCard from '@/components/admin/StatCard'
import StorageUsageCard from '@/components/admin/StorageUsageCard'
import SeaweedFSCapacityCard from '@/components/admin/SeaweedFSCapacityCard'
import StorageByCategoryCard from '@/components/admin/StorageByCategoryCard'
import TierFileList from '@/components/admin/TierFileList'
import TieringPolicyCard from '@/components/admin/TieringPolicyCard'
import TierDistributionChart from '@/components/charts/TierDistributionChart'
import StorageTrendsChart from '@/components/charts/StorageTrendsChart'

type Tab = 'overview' | 'monitoring' | 'tiering' | 'seaweedfs'
type TrendRange = '7d' | '30d' | '90d'
type SeaweedFSSubTab = 'cluster' | 'volumes' | 'filer'

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getRenderingStatusBadge(status: string) {
  switch (status) {
    case 'COMPLETED':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">완료</span>
    case 'PROCESSING':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />진행 중</span>
    case 'PENDING':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">대기</span>
    case 'FAILED':
      return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">실패</span>
    default:
      return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">불필요</span>
  }
}

export default function StorageManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [trendRange, setTrendRange] = useState<TrendRange>('7d')
  const [seaweedfsSubTab, setSeaweedfsSubTab] = useState<SeaweedFSSubTab>('cluster')
  const [currentPath, setCurrentPath] = useState('/buckets/minipacs')
  const queryClient = useQueryClient()

  // ========== Overview Tab Queries ==========
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60000,
    enabled: activeTab === 'overview',
  })

  const { data: tierDistribution, isLoading: tierLoading } = useQuery({
    queryKey: ['tierDistribution'],
    queryFn: fetchTierDistribution,
    refetchInterval: 60000,
    enabled: activeTab === 'overview',
  })

  const { data: storageMetrics, isLoading: storageLoading } = useQuery({
    queryKey: ['storageMetrics'],
    queryFn: fetchStorageMetrics,
    refetchInterval: 60000,
    enabled: activeTab === 'overview',
  })

  // ========== Overview Tab Additional Queries ==========
  const { data: capacity, isLoading: capacityLoading } = useQuery({
    queryKey: ['seaweedfsCapacity'],
    queryFn: fetchSeaweedFSCapacity,
    refetchInterval: 60000,
    enabled: activeTab === 'overview',
  })

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['storageTrends', trendRange],
    queryFn: () => fetchStorageMetricsTrends(trendRange),
    refetchInterval: 60000,
    enabled: activeTab === 'overview',
  })

  const { data: tenantMetrics, isLoading: tenantLoading } = useQuery({
    queryKey: ['storageByTenant'],
    queryFn: fetchStorageByTenant,
    refetchInterval: 60000,
    enabled: activeTab === 'overview',
  })

  // ========== Monitoring Tab Query ==========
  const { data: monitoringData, isLoading: monitoringLoading } = useQuery({
    queryKey: ['monitoringTasks'],
    queryFn: () => fetchMonitoringTasks(10),
    refetchInterval: 5000, // 5초 간격 폴링
    enabled: activeTab === 'monitoring',
  })

  // ========== Tiering Tab Queries ==========
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ['tieringPolicies'],
    queryFn: fetchTieringPolicies,
    refetchInterval: 60000,
    enabled: activeTab === 'tiering',
  })

  // ========== SeaweedFS Tab Queries ==========
  const { data: clusterStatus, isLoading: clusterLoading, refetch: refetchCluster } = useQuery({
    queryKey: ['clusterStatus'],
    queryFn: fetchClusterStatus,
    refetchInterval: 30000,
    enabled: activeTab === 'seaweedfs',
  })

  const { data: volumes, isLoading: volumesLoading, refetch: refetchVolumes } = useQuery({
    queryKey: ['volumes'],
    queryFn: fetchVolumes,
    enabled: activeTab === 'seaweedfs' && seaweedfsSubTab === 'volumes',
  })

  const { data: filerEntries, isLoading: filerLoading, refetch: refetchFiler } = useQuery({
    queryKey: ['filerDirectory', currentPath],
    queryFn: () => fetchFilerDirectory(currentPath),
    enabled: activeTab === 'seaweedfs' && seaweedfsSubTab === 'filer',
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFilerFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filerDirectory'] })
    },
  })

  // ========== Handlers ==========
  const handleNavigate = (entry: FilerEntry) => {
    if (entry.isDirectory) {
      setCurrentPath(entry.fullPath)
    }
  }

  const handleGoUp = () => {
    // /buckets/minipacs 보다 상위로 가지 않도록 제한
    if (currentPath === '/buckets/minipacs' || currentPath === '/buckets/minipacs/') {
      return
    }
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath('/' + parts.join('/'))
  }

  const handleDownload = async (path: string) => {
    try {
      const url = await getFilerDownloadUrl(path)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleDelete = (path: string) => {
    if (window.confirm(`정말로 삭제하시겠습니까?\n${path}`)) {
      deleteMutation.mutate(path)
    }
  }

  const getHealthIcon = (health: ClusterStatus['health']) => {
    switch (health) {
      case 'HEALTHY':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'DEGRADED':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'CRITICAL':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getHealthText = (health: ClusterStatus['health']) => {
    switch (health) {
      case 'HEALTHY':
        return '정상'
      case 'WARNING':
        return '일부 노드 다운'
      case 'DEGRADED':
        return 'Quorum 위험'
      case 'CRITICAL':
        return '서비스 불가'
    }
  }

  const getHealthDescription = (health: ClusterStatus['health']) => {
    switch (health) {
      case 'HEALTHY':
        return '모든 노드가 정상 작동 중입니다.'
      case 'WARNING':
        return '일부 노드가 다운되었지만 서비스는 정상적으로 이용 가능합니다.'
      case 'DEGRADED':
        return 'Master 과반수가 다운되었거나 Filer가 없습니다. 조치가 필요합니다.'
      case 'CRITICAL':
        return 'Leader가 없거나 모든 Volume Server가 다운되었습니다. 즉시 조치가 필요합니다.'
    }
  }

  const getNodeStatusCount = <T extends { status: 'UP' | 'DOWN' }>(nodes: T[]) => {
    const upCount = nodes.filter(n => n.status === 'UP').length
    return { upCount, total: nodes.length }
  }

  // ========== Tab Content Renderers ==========

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* DICOM 통계 카드 */}
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

      {/* 물리적 스토리지 용량 + 카테고리별 사용량 */}
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

      {/* Tier별 스토리지 현황 */}
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

      {/* 스토리지 트렌드 */}
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
        <StorageTrendsChart data={trends || []} isLoading={trendsLoading} />
      </div>
    </div>
  )

  const renderMonitoringTab = () => {
    const summary = monitoringData?.summary
    const uploadTasks = monitoringData?.uploadTasks || []
    const renderingTasks = monitoringData?.renderingTasks || []

    return (
      <div className="space-y-6">
        {/* 작업 현황 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-gray-600">대기 중</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {monitoringLoading ? '-' : summary?.totalPending || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">진행 중</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {monitoringLoading ? '-' : summary?.totalProcessing || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">완료 (1시간)</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {monitoringLoading ? '-' : summary?.recentCompleted || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-600">실패 (1시간)</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {monitoringLoading ? '-' : summary?.recentFailed || 0}
            </p>
          </div>
        </div>

        {/* 사전렌더링 진행 중 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              사전렌더링 진행 중 ({renderingTasks.length})
            </h3>
            <div className="text-xs text-gray-400">5초마다 자동 갱신</div>
          </div>

          {monitoringLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
              ))}
            </div>
          ) : renderingTasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              진행 중인 렌더링 작업이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {renderingTasks.map(task => (
                <div key={task.instanceId} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 font-medium">
                        T{task.tenantId}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {task.modality || 'Unknown'} - {task.studyDescription || 'No description'}
                      </span>
                      {getRenderingStatusBadge(task.status)}
                    </div>
                    <span className="text-sm text-gray-500">
                      {task.renderedFrames}/{task.totalFrames} 프레임
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${task.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {task.sopInstanceUid.substring(0, 30)}...
                    </span>
                    <span className="text-xs font-medium text-blue-600">
                      {task.progressPercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 업로드 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-500" />
              최근 업로드 ({uploadTasks.length})
            </h3>
            <span className="text-xs text-gray-400">최근 1시간</span>
          </div>

          {monitoringLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : uploadTasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              최근 업로드된 파일이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">시간</th>
                    <th className="pb-2 font-medium">테넌트</th>
                    <th className="pb-2 font-medium">Modality</th>
                    <th className="pb-2 font-medium">Study</th>
                    <th className="pb-2 font-medium text-right">크기</th>
                    <th className="pb-2 font-medium text-center">렌더링 상태</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadTasks.map(task => (
                    <tr key={task.instanceId} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-sm text-gray-600">
                        {formatTime(task.uploadedAt)}
                      </td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700 font-medium">
                          T{task.tenantId}
                        </span>
                      </td>
                      <td className="py-2 text-sm font-medium text-gray-900">
                        {task.modality || '-'}
                      </td>
                      <td className="py-2 text-sm text-gray-600">
                        {task.studyDescription || '-'}
                      </td>
                      <td className="py-2 text-sm text-gray-500 text-right">
                        {formatBytes(task.fileSize)}
                      </td>
                      <td className="py-2 text-center">
                        {getRenderingStatusBadge(task.renderingStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTieringTab = () => (
    <div className="space-y-6">
      {/* 정책 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TieringPolicyCard
          data={policies || {
            hotToWarmDays: 30,
            warmToColdDays: 90,
            schedulerEnabled: false,
            hotToWarmSchedule: '',
            warmToColdSchedule: '',
          }}
          isLoading={policiesLoading}
        />
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">개발 예정</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              수동 Tier 전환 기능
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Tiering 정책 수정 기능
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Tier 전환 이력 조회
            </li>
          </ul>
        </div>
      </div>

      {/* Tier별 파일 목록 */}
      <TierFileList />
    </div>
  )

  const renderSeaweedFSTab = () => (
    <div className="space-y-6">
      {/* 서브 탭 */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {([
          { id: 'cluster' as const, label: '클러스터 상태' },
          { id: 'volumes' as const, label: 'Volume 목록' },
          { id: 'filer' as const, label: '파일 탐색기' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setSeaweedfsSubTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              seaweedfsSubTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 클러스터 상태 */}
      {seaweedfsSubTab === 'cluster' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => refetchCluster()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
          </div>

          {clusterLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-100 rounded-lg"></div>
            </div>
          ) : clusterStatus ? (
            <>
              {/* Health Banner */}
              <div className={`rounded-lg border p-4 ${
                clusterStatus.health === 'HEALTHY' ? 'bg-green-50 border-green-200' :
                clusterStatus.health === 'WARNING' ? 'bg-yellow-50 border-yellow-200' :
                clusterStatus.health === 'DEGRADED' ? 'bg-orange-50 border-orange-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-3">
                  {getHealthIcon(clusterStatus.health)}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      클러스터 상태: {getHealthText(clusterStatus.health)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {getHealthDescription(clusterStatus.health)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 노드 상태 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Master 노드 */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Master 노드</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      getNodeStatusCount(clusterStatus.masters).upCount === getNodeStatusCount(clusterStatus.masters).total
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {getNodeStatusCount(clusterStatus.masters).upCount}/{getNodeStatusCount(clusterStatus.masters).total} UP
                    </span>
                  </div>
                  <div className="space-y-2">
                    {clusterStatus.masters.map((master: MasterNode, idx: number) => (
                      <div key={idx} className={`p-2 rounded border ${
                        master.status === 'UP' ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{master.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{master.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {master.isLeader && master.status === 'UP' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Leader</span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              master.status === 'UP' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {master.status}
                            </span>
                          </div>
                        </div>
                        {master.status === 'DOWN' && master.errorMessage && (
                          <p className="text-xs text-red-600 mt-1 truncate" title={master.errorMessage}>
                            {master.errorMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Volume Server */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Volume Server</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      getNodeStatusCount(clusterStatus.volumeServers).upCount === getNodeStatusCount(clusterStatus.volumeServers).total
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {getNodeStatusCount(clusterStatus.volumeServers).upCount}/{getNodeStatusCount(clusterStatus.volumeServers).total} UP
                    </span>
                  </div>
                  <div className="space-y-2">
                    {clusterStatus.volumeServers.map((vs: VolumeServerNode, idx: number) => (
                      <div key={idx} className={`p-2 rounded border ${
                        vs.status === 'UP' ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{vs.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{vs.volumeCount} volumes</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            vs.status === 'UP' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {vs.status}
                          </span>
                        </div>
                        {vs.status === 'UP' && vs.totalDiskSpace > 0 && (
                          <>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full transition-all ${
                                  (vs.usedDiskSize / vs.totalDiskSpace) > 0.9 ? 'bg-red-500' :
                                  (vs.usedDiskSize / vs.totalDiskSpace) > 0.7 ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min((vs.usedDiskSize / vs.totalDiskSpace) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatBytes(vs.usedDiskSize)} / {formatBytes(vs.totalDiskSpace)}
                            </div>
                          </>
                        )}
                        {vs.status === 'DOWN' && vs.errorMessage && (
                          <p className="text-xs text-red-600 mt-1 truncate" title={vs.errorMessage}>
                            {vs.errorMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filer */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Filer 노드</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      getNodeStatusCount(clusterStatus.filers).upCount === getNodeStatusCount(clusterStatus.filers).total
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {getNodeStatusCount(clusterStatus.filers).upCount}/{getNodeStatusCount(clusterStatus.filers).total} UP
                    </span>
                  </div>
                  <div className="space-y-2">
                    {clusterStatus.filers.map((filer: FilerNode, idx: number) => (
                      <div key={idx} className={`p-2 rounded border ${
                        filer.status === 'UP' ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{filer.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{filer.address}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            filer.status === 'UP' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {filer.status}
                          </span>
                        </div>
                        {filer.status === 'DOWN' && filer.errorMessage && (
                          <p className="text-xs text-red-600 mt-1 truncate" title={filer.errorMessage}>
                            {filer.errorMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cluster Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-900 mb-4">클러스터 요약</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{clusterStatus.totalVolumes}</p>
                    <p className="text-sm text-gray-500">전체 Volume</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{clusterStatus.totalFiles.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">전체 파일</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{formatBytes(clusterStatus.totalUsedSize)}</p>
                    <p className="text-sm text-gray-500">사용 용량</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{formatBytes(clusterStatus.totalCapacity)}</p>
                    <p className="text-sm text-gray-500">전체 용량</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">
              클러스터 정보를 불러올 수 없습니다.
            </div>
          )}
        </div>
      )}

      {/* Volume 목록 */}
      {seaweedfsSubTab === 'volumes' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => refetchVolumes()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
          </div>

          {volumesLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
              ))}
            </div>
          ) : volumes && volumes.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Collection</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">파일 수</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">크기</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">서버</th>
                  </tr>
                </thead>
                <tbody>
                  {volumes.map((volume: VolumeInfo) => (
                    <tr key={volume.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{volume.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{volume.collection || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-right">{volume.fileCount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-right">{formatBytes(volume.size)}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{volume.serverUrl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">Volume이 없습니다.</div>
          )}
        </div>
      )}

      {/* 파일 탐색기 */}
      {seaweedfsSubTab === 'filer' && (
        <div>
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={handleGoUp}
              disabled={currentPath === '/buckets/minipacs' || currentPath === '/buckets/minipacs/'}
              className="p-2 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700 font-mono">{currentPath}</span>
            <button
              onClick={() => refetchFiler()}
              className="ml-auto p-2 hover:bg-gray-200 rounded"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {filerLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : filerEntries && filerEntries.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {filerEntries.map((entry: FilerEntry) => (
                <div key={entry.fullPath} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <button
                    onClick={() => handleNavigate(entry)}
                    className="flex items-center gap-3 flex-1 text-left"
                    disabled={!entry.isDirectory}
                  >
                    {entry.isDirectory ? (
                      <FolderOpen className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <HardDrive className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-900">{entry.name}</span>
                    {entry.isDirectory && <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </button>
                  <div className="flex items-center gap-4">
                    {!entry.isDirectory && (
                      <span className="text-sm text-gray-500">
                        {entry.size !== null ? formatBytes(entry.size) : '-'}
                      </span>
                    )}
                    {!entry.isDirectory && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDownload(entry.fullPath)}
                          className="p-2 hover:bg-gray-100 rounded"
                          title="다운로드"
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.fullPath)}
                          className="p-2 hover:bg-red-50 rounded"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">이 디렉토리는 비어 있습니다.</div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">파일시스템 관리</h1>
        <p className="text-gray-600 mt-1">스토리지 및 파일시스템을 관리합니다.</p>
      </div>

      {/* 메인 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {([
            { id: 'overview' as const, label: '개요', icon: LayoutDashboard },
            { id: 'monitoring' as const, label: '모니터링', icon: Activity },
            { id: 'tiering' as const, label: 'Tiering', icon: Layers },
            { id: 'seaweedfs' as const, label: 'SeaweedFS', icon: Server },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'monitoring' && renderMonitoringTab()}
      {activeTab === 'tiering' && renderTieringTab()}
      {activeTab === 'seaweedfs' && renderSeaweedFSTab()}
    </div>
  )
}
