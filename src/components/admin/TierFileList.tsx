/**
 * TierFileList.tsx
 *
 * Tier별 파일 목록 컴포넌트
 *
 * 기능:
 * - Tier별 파일 목록 테이블 표시
 * - 서버 페이징 지원
 * - 파일 정보 표시 (파일명, 크기, 생성일, 마지막 접근일)
 */

import { FileText, HardDrive, Calendar, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { formatBytes } from '@/lib/utils'
import type { FileAssetSummary, PageResponse } from '@/types'

interface TierFileListProps {
  tier: 'HOT' | 'WARM' | 'COLD'
  data: PageResponse<FileAssetSummary>
  page: number
  onPageChange: (page: number) => void
}

// Tier 색상 매핑
const TIER_COLORS = {
  HOT: 'bg-red-100 text-red-800',
  WARM: 'bg-yellow-100 text-yellow-800',
  COLD: 'bg-blue-100 text-blue-800',
}

// 카테고리 이름 매핑
const CATEGORY_NAMES: Record<string, string> = {
  DICOM: 'DICOM',
  AI_RESULT: 'AI 결과',
  CLINICAL_DOC: '임상문서',
  SYSTEM: '시스템',
  EXPORT: '내보내기',
}

export default function TierFileList({
  tier,
  data,
  page,
  onPageChange,
}: TierFileListProps) {
  const { content, totalElements, totalPages, size } = data

  // 페이징 버튼 생성
  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxPages = 5 // 표시할 최대 페이지 버튼 수

    let startPage = Math.max(0, page - Math.floor(maxPages / 2))
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1)

    // 끝에서 시작할 경우 조정
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(0, endPage - maxPages + 1)
    }

    // 이전 버튼
    pages.push(
      <button
        key="prev"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        이전
      </button>
    )

    // 페이지 버튼
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
            i === page
              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {i + 1}
        </button>
      )
    }

    // 다음 버튼
    pages.push(
      <button
        key="next"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages - 1}
        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        다음
      </button>
    )

    return <div className="inline-flex -space-x-px">{pages}</div>
  }

  return (
    <div>
      {/* 테이블 */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                파일 경로
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                크기
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                생성일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                마지막 접근
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {content.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900 font-mono truncate max-w-md">
                      {file.storagePath}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {CATEGORY_NAMES[file.fileCategory] || file.fileCategory}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      TIER_COLORS[file.storageTier as keyof typeof TIER_COLORS] ||
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <HardDrive className="h-3 w-3 mr-1" />
                    {file.storageTier}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {formatBytes(file.fileSize)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(file.createdAt), 'yyyy-MM-dd HH:mm')}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-600">
                    <Eye className="h-3 w-3 mr-1" />
                    {format(new Date(file.lastAccessedAt), 'yyyy-MM-dd HH:mm')}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 빈 상태 */}
        {content.length === 0 && (
          <div className="text-center py-12">
            <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{tier} Tier에 파일이 없습니다</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 & 정보 */}
      {content.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-2 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages - 1}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                전체 <span className="font-medium">{totalElements}</span>개 중{' '}
                <span className="font-medium">{page * size + 1}</span> -{' '}
                <span className="font-medium">
                  {Math.min((page + 1) * size, totalElements)}
                </span>
                번째 표시
              </p>
            </div>
            <div>{renderPagination()}</div>
          </div>
        </div>
      )}
    </div>
  )
}
