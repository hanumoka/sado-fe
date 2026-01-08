import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ArrowUp, ArrowDown, Film } from 'lucide-react'
import type { Series } from '../types/series'
import { Pagination } from '@/components/common'
import { getModalityBadgeColor } from '@/constants/modality'

/**
 * SeriesList.tsx
 *
 * Series 목록 테이블 컴포넌트
 *
 * 기능:
 * - Series 데이터를 테이블로 표시
 * - 클릭 시 Study 상세 페이지로 이동
 * - 컬럼별 정렬
 * - 페이지네이션
 */

interface SeriesListProps {
  seriesList: Series[]
  pageSize?: number
}

type SortKey =
  | 'id'
  | 'uuid'
  | 'studyId'
  | 'seriesInstanceUid'
  | 'patientName'
  | 'studyDescription'
  | 'modality'
  | 'seriesDescription'
  | 'bodyPartExamined'
  | 'seriesNumber'
  | 'instancesCount'
  | 'tenantId'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
  key: SortKey
  order: SortOrder
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'tenantId', label: 'Tenant', className: 'w-16' },
  { key: 'id', label: 'ID (PK)', className: 'w-20' },
  { key: 'studyId', label: 'Study ID', className: 'w-20' },
  { key: 'uuid', label: 'UUID', className: 'w-28' },
  { key: 'seriesInstanceUid', label: 'Series UID', className: 'w-36' },
  { key: 'patientName', label: '환자 이름' },
  { key: 'studyDescription', label: 'Study 설명' },
  { key: 'modality', label: 'Modality', className: 'w-24' },
  { key: 'seriesDescription', label: 'Series 설명' },
  { key: 'bodyPartExamined', label: '검사 부위', className: 'w-28' },
  { key: 'seriesNumber', label: 'No.', className: 'w-16' },
  { key: 'instancesCount', label: 'Images', className: 'w-20' },
]

export default function SeriesList({
  seriesList,
  pageSize = 10,
}: SeriesListProps) {
  const navigate = useNavigate()
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

  const sortedSeriesList = useMemo(() => {
    const sorted = [...seriesList].sort((a, b) => {
      const { key, order } = sortConfig
      let comparison = 0

      switch (key) {
        case 'id':
          comparison = Number(a[key]) - Number(b[key])
          break
        case 'studyId':
          comparison = (a[key] ?? '').localeCompare(b[key] ?? '')
          break
        case 'tenantId':
          comparison = (a[key] ?? 0) - (b[key] ?? 0)
          break
        case 'uuid':
        case 'seriesInstanceUid':
          comparison = (a[key] ?? '').localeCompare(b[key] ?? '')
          break
        case 'patientName':
        case 'studyDescription':
        case 'modality':
        case 'seriesDescription':
        case 'bodyPartExamined':
          comparison = (a[key] ?? '').localeCompare(b[key] ?? '')
          break
        case 'seriesNumber':
        case 'instancesCount':
          comparison = (a[key] ?? 0) - (b[key] ?? 0)
          break
      }

      return order === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [seriesList, sortConfig])

  const totalPages = Math.ceil(sortedSeriesList.length / pageSize)
  const paginatedSeriesList = sortedSeriesList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleRowClick = (studyId: string) => {
    navigate(`/studies/${studyId}`)
  }

  if (seriesList.length === 0) {
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
            {paginatedSeriesList.map((series, index) => (
              <tr
                key={series.id}
                onClick={() => handleRowClick(series.studyId)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {(currentPage - 1) * pageSize + index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    {series.tenantId ?? '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {series.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {series.studyId}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                  {series.uuid ?? '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                  {series.seriesInstanceUid}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-gray-400" />
                    {series.patientName ?? '-'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {series.studyDescription ?? '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModalityBadgeColor(series.modality)}`}
                  >
                    {series.modality || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {series.seriesDescription || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {series.bodyPartExamined ?? '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {series.seriesNumber ?? '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {series.instancesCount}
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
        totalItems={seriesList.length}
        pageSize={pageSize}
      />
    </div>
  )
}
