import { useState } from 'react'
import { Search, X } from 'lucide-react'
import type { StudySearchParams } from '../types/study'

/**
 * StudySearchForm.tsx
 *
 * Study 검색 폼 컴포넌트
 *
 * 목적:
 * - 환자 이름 검색
 * - 검사 날짜 필터
 * - Modality 필터 (CT, MR, XR, US, ALL)
 * - Enter 키 지원
 */

interface StudySearchFormProps {
  onSearch: (params: StudySearchParams) => void
}

export default function StudySearchForm({ onSearch }: StudySearchFormProps) {
  const [patientName, setPatientName] = useState('')
  const [studyDate, setStudyDate] = useState('')
  const [modality, setModality] = useState<string>('ALL')

  const handleSearch = () => {
    onSearch({
      patientName: patientName || undefined,
      studyDate: studyDate || undefined,
      modality: modality === 'ALL' ? undefined : modality,
    })
  }

  const handleReset = () => {
    setPatientName('')
    setStudyDate('')
    setModality('ALL')
    onSearch({})
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 환자 이름 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            환자 이름
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="예: John Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 검사 날짜 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            검사 날짜
          </label>
          <input
            type="date"
            value={studyDate}
            onChange={(e) => setStudyDate(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Modality 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modality
          </label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체</option>
            <option value="CT">CT</option>
            <option value="MR">MR</option>
            <option value="XR">XR</option>
            <option value="US">US</option>
          </select>
        </div>

        {/* 검색/초기화 버튼 */}
        <div className="flex items-end gap-2">
          <button
            onClick={handleSearch}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            검색
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
