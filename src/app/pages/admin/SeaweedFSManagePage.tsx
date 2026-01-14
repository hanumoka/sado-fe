/**
 * SeaweedFSManagePage.tsx
 *
 * SeaweedFS 관리 페이지
 * - 클러스터 상태
 * - Volume 목록
 * - Filer 탐색기
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
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
} from 'lucide-react'
import {
  fetchClusterStatus,
  fetchVolumes,
  fetchFilerDirectory,
  deleteFilerFile,
  getFilerDownloadUrl,
} from '@/lib/services/adminService'
import type { ClusterStatus, VolumeInfo, FilerEntry } from '@/types/seaweedfs'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

type Tab = 'cluster' | 'volumes' | 'filer'

export default function SeaweedFSManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>('cluster')
  const [currentPath, setCurrentPath] = useState('/')
  const queryClient = useQueryClient()

  // 클러스터 상태 조회
  const { data: clusterStatus, isLoading: clusterLoading, refetch: refetchCluster } = useQuery({
    queryKey: ['clusterStatus'],
    queryFn: fetchClusterStatus,
    refetchInterval: 30000, // 30초마다 갱신
  })

  // Volume 목록 조회
  const { data: volumes, isLoading: volumesLoading, refetch: refetchVolumes } = useQuery({
    queryKey: ['volumes'],
    queryFn: fetchVolumes,
    enabled: activeTab === 'volumes',
  })

  // Filer 디렉토리 조회
  const { data: filerEntries, isLoading: filerLoading, refetch: refetchFiler } = useQuery({
    queryKey: ['filerDirectory', currentPath],
    queryFn: () => fetchFilerDirectory(currentPath),
    enabled: activeTab === 'filer',
  })

  // 파일 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: deleteFilerFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filerDirectory'] })
    },
  })

  const handleNavigate = (entry: FilerEntry) => {
    if (entry.isDirectory) {
      setCurrentPath(entry.fullPath)
    }
  }

  const handleGoUp = () => {
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
      case 'DEGRADED':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'DOWN':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getHealthText = (health: ClusterStatus['health']) => {
    switch (health) {
      case 'HEALTHY':
        return '정상'
      case 'DEGRADED':
        return '부분 장애'
      case 'DOWN':
        return '장애'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SeaweedFS 관리</h1>
        <p className="text-gray-600 mt-1">SeaweedFS 클러스터 상태 및 파일을 관리합니다.</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {([
            { id: 'cluster', label: '클러스터 상태', icon: Server },
            { id: 'volumes', label: 'Volume 목록', icon: HardDrive },
            { id: 'filer', label: '파일 탐색기', icon: FolderOpen },
          ] as const).map(tab => (
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

      {/* 클러스터 상태 탭 */}
      {activeTab === 'cluster' && (
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
              <div className="h-32 bg-gray-100 rounded-lg"></div>
            </div>
          ) : clusterStatus ? (
            <>
              {/* 상태 요약 */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  {getHealthIcon(clusterStatus.health)}
                  <h3 className="text-lg font-semibold text-gray-900">
                    클러스터 상태: {getHealthText(clusterStatus.health)}
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">전체 Volume</p>
                    <p className="text-xl font-bold text-gray-900">{clusterStatus.totalVolumes}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">전체 파일</p>
                    <p className="text-xl font-bold text-gray-900">{clusterStatus.totalFiles.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">사용 용량</p>
                    <p className="text-xl font-bold text-gray-900">{formatBytes(clusterStatus.totalUsedSize)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">전체 용량</p>
                    <p className="text-xl font-bold text-gray-900">{formatBytes(clusterStatus.totalCapacity)}</p>
                  </div>
                </div>
              </div>

              {/* 노드 목록 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Master 노드 */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Master 노드</h4>
                  <div className="space-y-2">
                    {clusterStatus.masters.map((master, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{master.address}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          master.isLeader ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {master.isLeader ? 'Leader' : 'Follower'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Volume Server 노드 */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Volume Server</h4>
                  <div className="space-y-2">
                    {clusterStatus.volumeServers.map((vs, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{vs.address}</span>
                          <span className="text-xs text-gray-500">{vs.volumeCount} volumes</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatBytes(vs.usedDiskSize)} / {formatBytes(vs.usedDiskSize + vs.freeDiskSize)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filer 노드 */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Filer</h4>
                  <div className="space-y-2">
                    {clusterStatus.filers.map((filer, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{filer.address}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          filer.status === 'UP' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {filer.status}
                        </span>
                      </div>
                    ))}
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

      {/* Volume 목록 탭 */}
      {activeTab === 'volumes' && (
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
            <div className="text-center text-gray-500 py-12">
              Volume이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 파일 탐색기 탭 */}
      {activeTab === 'filer' && (
        <div>
          {/* 경로 네비게이션 */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={handleGoUp}
              disabled={currentPath === '/'}
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

          {/* 파일 목록 */}
          {filerLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : filerEntries && filerEntries.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {filerEntries.map((entry: FilerEntry) => (
                <div
                  key={entry.fullPath}
                  className="flex items-center justify-between p-3 hover:bg-gray-50"
                >
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
            <div className="text-center text-gray-500 py-12">
              이 디렉토리는 비어 있습니다.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
