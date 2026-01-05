/**
 * StorageByCategoryCard.tsx
 *
 * 카테고리별 스토리지 사용량 카드 컴포넌트
 *
 * 기능:
 * - 카테고리별 스토리지 사용량 시각화
 * - Bar Chart 및 Table로 표시
 * - 정렬 기능
 */

import { useMemo, useState } from 'react'
import { BarChart3, Database } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatBytes } from '@/lib/utils'
import type { CategoryStorageMetrics } from '@/types'

interface StorageByCategoryCardProps {
  categories: CategoryStorageMetrics[]
}

// 카테고리 한글 이름 매핑
const CATEGORY_NAMES: Record<string, string> = {
  DICOM: 'DICOM 이미지',
  AI_RESULT: 'AI 분석 결과',
  CLINICAL_DOC: '임상 문서',
  SYSTEM: '시스템 파일',
  EXPORT: '내보내기 파일',
}

// 카테고리 색상 매핑
const CATEGORY_COLORS: Record<string, string> = {
  DICOM: '#3b82f6', // blue-500
  AI_RESULT: '#8b5cf6', // violet-500
  CLINICAL_DOC: '#10b981', // green-500
  SYSTEM: '#6b7280', // gray-500
  EXPORT: '#f59e0b', // amber-500
}

export default function StorageByCategoryCard({
  categories,
}: StorageByCategoryCardProps) {
  const [sortBy, setSortBy] = useState<'category' | 'size' | 'count'>('size')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 차트 데이터 준비
  const chartData = useMemo(() => {
    return categories.map((cat) => ({
      name: CATEGORY_NAMES[cat.category] || cat.category,
      크기: cat.totalSize,
      파일수: cat.fileCount,
      color: CATEGORY_COLORS[cat.category] || '#94a3b8',
    }))
  }, [categories])

  // 정렬된 데이터
  const sortedCategories = useMemo(() => {
    const sorted = [...categories]
    sorted.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'size') {
        comparison = a.totalSize - b.totalSize
      } else if (sortBy === 'count') {
        comparison = a.fileCount - b.fileCount
      } else {
        comparison = a.category.localeCompare(b.category)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [categories, sortBy, sortOrder])

  // 정렬 핸들러
  const handleSort = (column: 'category' | 'size' | 'count') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // 총 파일 수 및 총 크기 계산
  const totalFiles = categories.reduce((sum, cat) => sum + cat.fileCount, 0)
  const totalSize = categories.reduce((sum, cat) => sum + cat.totalSize, 0)

  // 평균 크기 계산
  const getAverageSize = (cat: CategoryStorageMetrics) => {
    return cat.fileCount > 0 ? cat.totalSize / cat.fileCount : 0
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-indigo-100 rounded-lg p-3">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">
              카테고리별 스토리지
            </h3>
            <p className="text-sm text-gray-600">
              총 {totalFiles.toLocaleString()}개 파일, {formatBytes(totalSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => formatBytes(value)} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === '크기') return formatBytes(value)
                return value.toLocaleString()
              }}
            />
            <Legend />
            <Bar dataKey="크기" fill="#3b82f6" />
            <Bar dataKey="파일수" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center">
                  카테고리
                  {sortBy === 'category' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('count')}
              >
                <div className="flex items-center justify-end">
                  파일 개수
                  {sortBy === 'count' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('size')}
              >
                <div className="flex items-center justify-end">
                  총 크기
                  {sortBy === 'size' && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                평균 크기
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                비율
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCategories.map((cat) => {
              const percent = totalSize > 0 ? (cat.totalSize / totalSize) * 100 : 0
              const avgSize = getAverageSize(cat)

              return (
                <tr key={cat.category} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor: CATEGORY_COLORS[cat.category] || '#94a3b8',
                        }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {CATEGORY_NAMES[cat.category] || cat.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    {cat.fileCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatBytes(cat.totalSize)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    {formatBytes(avgSize)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    {percent.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 빈 상태 */}
      {categories.length === 0 && (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">카테고리별 데이터가 없습니다</p>
        </div>
      )}
    </div>
  )
}
