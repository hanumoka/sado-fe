import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ArrowUp, ArrowDown, FileText } from 'lucide-react'
import type { Study } from '../types/study'
import Pagination from './Pagination'
import { getModalityBadgeColor } from '@/constants/modality'

/**
 * StudyList.tsx
 *
 * Study 목록 테이블 컴포넌트
 *
 * 기능:
 * - Study 데이터를 테이블로 표시
 * - 클릭 시 Study 상세 페이지로 이동
 * - 컬럼별 정렬
 * - 페이지네이션
 */

interface StudyListProps {
  studies: Study[]
  pageSize?: number
}

type SortKey =
  | 'patientName'
  | 'studyDate'
  | 'modality'
  | 'studyDescription'
  | 'seriesCount'
  | 'instancesCount'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
  key: SortKey
  order: SortOrder
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'patientName', label: '환자 이름' },
  { key: 'studyDate', label: '검사 날짜', className: 'w-28' },
  { key: 'modality', label: 'Modality', className: 'w-24' },
  { key: 'studyDescription', label: 'Study 설명' },
  { key: 'seriesCount', label: 'Series', className: 'w-20' },
  { key: 'instancesCount', label: 'Images', className: 'w-20' },
]

export default function StudyList({ studies, pageSize = 10 }: StudyListProps) {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'studyDate',
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

  const sortedStudies = useMemo(() => {
    const sorted = [...studies].sort((a, b) => {
      const { key, order } = sortConfig
      let comparison = 0

      switch (key) {
        case 'patientName':
        case 'modality':
        case 'studyDescription':
          comparison = a[key].localeCompare(b[key])
          break
        case 'seriesCount':
        case 'instancesCount':
          comparison = a[key] - b[key]
          break
        case 'studyDate':
          comparison = new Date(a[key]).getTime() - new Date(b[key]).getTime()
          break
      }

      return order === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [studies, sortConfig])

  const totalPages = Math.ceil(sortedStudies.length / pageSize)
  const paginatedStudies = sortedStudies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleRowClick = (studyId: string) => {
    navigate(`/studies/${studyId}`)
  }

  if (studies.length === 0) {
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
            {paginatedStudies.map((study, index) => (
              <tr
                key={study.id}
                onClick={() => handleRowClick(study.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {(currentPage - 1) * pageSize + index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    {study.patientName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div>{study.studyDate}</div>
                    <div className="text-xs text-gray-500">
                      {study.studyTime}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModalityBadgeColor(study.modality)}`}
                  >
                    {study.modality}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {study.studyDescription}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {study.seriesCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  {study.instancesCount}
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
        totalItems={studies.length}
        pageSize={pageSize}
      />
    </div>
  )
}
