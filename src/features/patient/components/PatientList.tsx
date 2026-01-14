import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ArrowUp, ArrowDown, User } from 'lucide-react'
import type { Patient } from '../types/patient'
import { Pagination } from '@/components/common'
import { GENDER_LABELS, GENDER_COLORS } from '../constants/gender'

/**
 * PatientList.tsx
 *
 * 환자 목록 테이블 컴포넌트
 *
 * 기능:
 * - 환자 데이터를 테이블로 표시
 * - 클릭 시 Study List로 이동
 * - 컬럼별 정렬
 * - 페이지네이션
 * - 환자 상세 모달 (더블클릭)
 */

interface PatientListProps {
  patients: Patient[]
  pageSize?: number
  onPatientSelect?: (patient: Patient) => void
}

type SortKey =
  | 'id'
  | 'uuid'
  | 'name'
  | 'age'
  | 'gender'
  | 'issuer'
  | 'studiesCount'
  | 'lastStudyDate'
  | 'tenantId'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
  key: SortKey
  order: SortOrder
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'tenantId', label: 'Tenant', className: 'w-20' },
  { key: 'id', label: 'ID (PK)', className: 'w-20' },
  { key: 'uuid', label: 'UUID', className: 'w-80' },
  { key: 'name', label: '이름' },
  { key: 'age', label: '나이', className: 'w-20' },
  { key: 'gender', label: '성별', className: 'w-20' },
  { key: 'issuer', label: '발급 기관' },
  { key: 'studiesCount', label: 'Study 수', className: 'w-24' },
  { key: 'lastStudyDate', label: '최근 Study', className: 'w-32' },
]

export default function PatientList({
  patients,
  pageSize = 10,
  onPatientSelect,
}: PatientListProps) {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'lastStudyDate',
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

  const sortedPatients = useMemo(() => {
    const sorted = [...patients].sort((a, b) => {
      const { key, order } = sortConfig
      let comparison = 0

      switch (key) {
        case 'id':
        case 'tenantId':
          comparison = Number(a[key]) - Number(b[key])
          break
        case 'uuid':
          comparison = (a[key] ?? '').localeCompare(b[key] ?? '')
          break
        case 'name':
        case 'issuer':
        case 'gender':
          comparison = a[key].localeCompare(b[key])
          break
        case 'age':
          comparison = a[key] - b[key]
          break
        case 'studiesCount':
          comparison = (a[key] ?? 0) - (b[key] ?? 0)
          break
        case 'lastStudyDate':
          comparison = new Date(a[key] ?? 0).getTime() - new Date(b[key] ?? 0).getTime()
          break
      }

      return order === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [patients, sortConfig])

  const totalPages = Math.ceil(sortedPatients.length / pageSize)
  const paginatedPatients = sortedPatients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleRowClick = (patientId: string) => {
    navigate(`/studies?patientId=${patientId}`)
  }

  const handleRowDoubleClick = (patient: Patient) => {
    onPatientSelect?.(patient)
  }

  if (patients.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className="min-w-full divide-y divide-gray-200"
          aria-label="환자 목록"
        >
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Patient ID
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sortConfig.key === column.key
                      ? sortConfig.order === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${column.className || ''}`}
                  onClick={() => handleSort(column.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSort(column.key)
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
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
            {paginatedPatients.map((patient) => (
              <tr
                key={patient.id}
                onClick={() => handleRowClick(patient.dicomPatientId)}
                onDoubleClick={() => handleRowDoubleClick(patient)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {patient.dicomPatientId}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    {patient.tenantId ?? '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                  {patient.uuid ?? '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {patient.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.age}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      GENDER_COLORS[patient.gender] || GENDER_COLORS.U
                    }`}
                  >
                    {GENDER_LABELS[patient.gender] || GENDER_LABELS.U}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.issuer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.studiesCount !== undefined ? `${patient.studiesCount}개` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.lastStudyDate || 'N/A'}
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
        totalItems={patients.length}
        pageSize={pageSize}
      />
    </div>
  )
}
