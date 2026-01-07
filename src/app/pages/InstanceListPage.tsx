import { useState, useMemo } from 'react'
import { Image, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { PageHeader, Pagination } from '@/components/common'
import { useInstanceList } from '@/features/instance/hooks/useInstanceList'
import InstanceSearchForm from '@/features/instance/components/InstanceSearchForm'
import type { InstanceSearchParams } from '@/features/instance/types/instance'

/**
 * InstanceListPage.tsx
 *
 * 인스턴스 목록 페이지 (서버사이드 페이지네이션)
 *
 * 기능:
 * - Instance 검색 (SOP Instance UID, Storage Tier)
 * - Instance 목록 테이블 표시
 * - 클라이언트 사이드 정렬
 * - 서버사이드 페이지네이션
 */

const PAGE_SIZE = 10

type SortKey =
  | 'id'
  | 'sopInstanceUid'
  | 'instanceNumber'
  | 'rows'
  | 'columns'
  | 'fileSize'
  | 'storageTier'
  | 'createdAt'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
  key: SortKey
  order: SortOrder
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'id', label: 'ID', className: 'w-16' },
  { key: 'sopInstanceUid', label: 'SOP Instance UID' },
  { key: 'instanceNumber', label: 'No.', className: 'w-16' },
  { key: 'rows', label: 'Rows', className: 'w-20' },
  { key: 'columns', label: 'Cols', className: 'w-20' },
  { key: 'fileSize', label: 'Size', className: 'w-24' },
  { key: 'storageTier', label: 'Tier', className: 'w-24' },
  { key: 'createdAt', label: '생성일', className: 'w-40' },
]

function getTierBadgeColor(tier?: string): string {
  switch (tier) {
    case 'HOT':
      return 'bg-red-100 text-red-800'
    case 'WARM':
      return 'bg-yellow-100 text-yellow-800'
    case 'COLD':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export default function InstanceListPage() {
  // 검색 필터 (서버로 전송)
  const [searchFilters, setSearchFilters] = useState<{
    sopInstanceUid?: string
    storageTier?: string
  }>({})

  // 페이지 상태 (서버사이드 페이지네이션)
  const [currentPage, setCurrentPage] = useState(1)

  // 정렬 상태 (클라이언트 사이드)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'id',
    order: 'desc',
  })

  // API 호출용 파라미터 (page는 0부터 시작)
  const apiParams: InstanceSearchParams = {
    ...searchFilters,
    page: currentPage - 1,
    size: PAGE_SIZE,
  }

  const { data: pageData, isLoading, error } = useInstanceList(apiParams)

  // 검색 핸들러
  const handleSearch = (params: { sopInstanceUid?: string; storageTier?: string }) => {
    setSearchFilters(params)
    setCurrentPage(1) // 검색 시 첫 페이지로 이동
  }

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // 정렬 핸들러 (클라이언트 사이드)
  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }))
  }

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortConfig.order === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    )
  }

  // 클라이언트 사이드 정렬 (현재 페이지 데이터만)
  const sortedInstances = useMemo(() => {
    if (!pageData?.content) return []

    const sorted = [...pageData.content].sort((a, b) => {
      const { key, order } = sortConfig
      let comparison = 0

      switch (key) {
        case 'id':
        case 'instanceNumber':
        case 'rows':
        case 'columns':
        case 'fileSize':
          comparison = (Number(a[key]) || 0) - (Number(b[key]) || 0)
          break
        case 'sopInstanceUid':
        case 'storageTier':
        case 'createdAt':
          comparison = (a[key] ?? '').localeCompare(b[key] ?? '')
          break
      }

      return order === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [pageData?.content, sortConfig])

  const totalPages = pageData?.totalPages ?? 0
  const totalItems = pageData?.totalElements ?? 0

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <PageHeader
        icon={Image}
        title="인스턴스 목록"
        description="DICOM 인스턴스(이미지)를 검색하고 조회합니다"
      />

      {/* 검색 폼 */}
      <InstanceSearchForm onSearch={handleSearch} />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-500 mt-4">인스턴스 목록을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              데이터를 불러오는 중 오류가 발생했습니다
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : '알 수 없는 오류'}
            </p>
          </div>
        </div>
      )}

      {/* 결과 없음 */}
      {!isLoading && !error && pageData?.empty && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Image className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            인스턴스가 없습니다
          </h2>
          <p className="text-gray-500">
            검색 조건에 맞는 인스턴스가 없습니다. 다른 조건으로 검색해 보세요.
          </p>
        </div>
      )}

      {/* 인스턴스 목록 */}
      {!isLoading && !error && pageData && !pageData.empty && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    #
                  </th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${column.className || ''}`}
                      onClick={() => handleSort(column.key)}
                    >
                      <div className="flex items-center gap-1">
                        <span>{column.label}</span>
                        {getSortIcon(column.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {sortedInstances.map((instance, index) => (
                  <tr
                    key={instance.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {(currentPage - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {instance.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-gray-400" />
                        <span className="font-mono text-xs truncate max-w-xs">
                          {instance.sopInstanceUid}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {instance.instanceNumber ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {instance.rows ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {instance.columns ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(instance.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(instance.storageTier)}`}
                      >
                        {instance.storageTier || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(instance.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 서버사이드 페이지네이션 */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}
    </div>
  )
}
