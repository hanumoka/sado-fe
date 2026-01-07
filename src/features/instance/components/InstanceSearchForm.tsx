import { useState } from 'react'
import { Search, X } from 'lucide-react'
import type { InstanceSearchParams } from '../types/instance'

/**
 * InstanceSearchForm.tsx
 *
 * Instance 검색 폼 컴포넌트
 *
 * 목적:
 * - SOP Instance UID 검색 (부분 일치)
 * - Storage Tier 필터 (HOT, WARM, COLD)
 * - Enter 키 지원
 */

interface InstanceSearchFormProps {
  onSearch: (params: InstanceSearchParams) => void
}

export default function InstanceSearchForm({
  onSearch,
}: InstanceSearchFormProps) {
  const [sopInstanceUid, setSopInstanceUid] = useState('')
  const [storageTier, setStorageTier] = useState<string>('ALL')

  const handleSearch = () => {
    onSearch({
      sopInstanceUid: sopInstanceUid.trim() || undefined,
      storageTier: storageTier === 'ALL' ? undefined : storageTier,
    })
  }

  const handleReset = () => {
    setSopInstanceUid('')
    setStorageTier('ALL')
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
        {/* SOP Instance UID 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SOP Instance UID
          </label>
          <input
            type="text"
            value={sopInstanceUid}
            onChange={(e) => setSopInstanceUid(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="UID 검색 (부분 일치)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Storage Tier 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Storage Tier
          </label>
          <select
            value={storageTier}
            onChange={(e) => setStorageTier(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체</option>
            <option value="HOT">HOT (최근)</option>
            <option value="WARM">WARM (보관)</option>
            <option value="COLD">COLD (아카이브)</option>
          </select>
        </div>

        {/* 빈 공간 (그리드 정렬용) */}
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
