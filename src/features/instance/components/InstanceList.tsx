import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Image } from 'lucide-react'
import type { Instance } from '../types/instance'
import { Pagination } from '@/components/common'

/**
 * InstanceList.tsx
 *
 * Instance 목록 테이블 컴포넌트
 *
 * 기능:
 * - Instance 데이터를 테이블로 표시
 * - 컬럼별 정렬
 * - 페이지네이션
 * - Storage Tier 배지 표시
 */

interface InstanceListProps {
  instanceList: Instance[]
  pageSize?: number
}

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

/**
 * Storage Tier 배지 색상
 */
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

/**
 * 파일 크기 포맷팅
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 날짜 포맷팅
 */
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

export default function InstanceList({
  instanceList,
  pageSize = 10,
}: InstanceListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'id',
    order: 'desc',
  })

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }))
    setCurrentPage(1)
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

  const sortedInstanceList = useMemo(() => {
    const sorted = [...instanceList].sort((a, b) => {
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
  }, [instanceList, sortConfig])

  const totalPages = Math.ceil(sortedInstanceList.length / pageSize)
  const paginatedInstanceList = sortedInstanceList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  if (instanceList.length === 0) {
    return null
  }

  return (
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
            {paginatedInstanceList.map((instance, index) => (
              <tr
                key={instance.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {(currentPage - 1) * pageSize + index + 1}
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={instanceList.length}
        pageSize={pageSize}
      />
    </div>
  )
}
