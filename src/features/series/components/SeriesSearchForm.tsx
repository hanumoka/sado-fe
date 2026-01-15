import { useState } from 'react'
import { Search, X } from 'lucide-react'
import type { SeriesSearchParams } from '../types/series'

/**
 * SeriesSearchForm.tsx
 *
 * Series 검색 폼 컴포넌트
 *
 * 목적:
 * - Modality 필터 (CT, MR, XR, US, ALL)
 * - Enter 키 지원
 */

interface SeriesSearchFormProps {
  onSearch: (params: SeriesSearchParams) => void
}

export default function SeriesSearchForm({ onSearch }: SeriesSearchFormProps) {
  const [modality, setModality] = useState<string>('ALL')

  const handleSearch = () => {
    onSearch({
      modality: modality === 'ALL' ? undefined : modality,
    })
  }

  const handleReset = () => {
    setModality('ALL')
    onSearch({})
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Modality 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modality
          </label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체</option>
            <option value="CT">CT</option>
            <option value="MR">MR</option>
            <option value="XR">XR</option>
            <option value="US">US</option>
            <option value="CR">CR</option>
            <option value="DX">DX</option>
          </select>
        </div>

        {/* 빈 공간 (그리드 정렬용) */}
        <div className="hidden md:block" />
        <div className="hidden md:block" />

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
