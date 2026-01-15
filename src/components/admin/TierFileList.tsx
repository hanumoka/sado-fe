/**
 * TierFileList.tsx
 *
 * Tier별 파일 목록 컴포넌트
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { fetchTieringFiles } from '@/lib/services/adminService'
import { formatBytes } from '@/lib/utils'
import type { FileAssetSummary } from '@/types'

type Tier = 'HOT' | 'WARM' | 'COLD'

interface TierFileListProps {
  initialTier?: Tier
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TIER_STYLES: Record<Tier, string> = {
  HOT: 'bg-red-100 text-red-800 border-red-200',
  WARM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COLD: 'bg-blue-100 text-blue-800 border-blue-200',
}

export default function TierFileList({ initialTier = 'HOT' }: TierFileListProps) {
  const [selectedTier, setSelectedTier] = useState<Tier>(initialTier)
  const [page, setPage] = useState(0)
  const pageSize = 10

  const { data, isLoading, error } = useQuery({
    queryKey: ['tieringFiles', selectedTier, page, pageSize],
    queryFn: () => fetchTieringFiles(selectedTier, page, pageSize),
  })

  const handleTierChange = (tier: Tier) => {
    setSelectedTier(tier)
    setPage(0)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Tier별 파일 목록</h3>
        <div className="p-2 bg-gray-50 rounded-lg">
          <FileText className="h-5 w-5 text-gray-600" />
        </div>
      </div>

      {/* Tier 선택 탭 */}
      <div className="flex gap-2 mb-4">
        {(['HOT', 'WARM', 'COLD'] as Tier[]).map(tier => (
          <button
            key={tier}
            onClick={() => handleTierChange(tier)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTier === tier
                ? TIER_STYLES[tier]
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tier}
          </button>
        ))}
      </div>

      {/* 파일 목록 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : data && data.content.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">경로</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">카테고리</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">크기</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">최근 접근</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((file: FileAssetSummary) => (
                  <tr
                    key={file.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-2 text-gray-900 truncate max-w-xs" title={file.storagePath}>
                      {file.storagePath}
                    </td>
                    <td className="py-2 px-2 text-gray-600">{file.fileCategory}</td>
                    <td className="py-2 px-2 text-gray-600 text-right">{formatBytes(file.fileSize)}</td>
                    <td className="py-2 px-2 text-gray-500 text-right">{formatDate(file.lastAccessedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              전체 {data.totalElements}개 중 {page * pageSize + 1}-
              {Math.min((page + 1) * pageSize, data.totalElements)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={data.first}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={data.last}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          {selectedTier} Tier에 파일이 없습니다.
        </div>
      )}
    </div>
  )
}
