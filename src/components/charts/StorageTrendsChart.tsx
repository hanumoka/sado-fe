/**
 * StorageTrendsChart.tsx
 *
 * 스토리지 사용량 시계열 차트
 * - 시간에 따른 Total/HOT/WARM/COLD 스토리지 크기 추세 표시
 * - 범위 선택 (7일/30일/90일)
 */

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { fetchStorageMetricsTrends } from '@/lib/services/adminService'
import type { StorageMetricsTrend } from '@/types'

/**
 * Bytes를 읽기 쉬운 단위로 변환
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * ISO DateTime을 "MM/DD HH:mm" 형식으로 변환
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

type RangeOption = '7d' | '30d' | '90d'

const RANGE_LABELS: Record<RangeOption, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
}

export function StorageTrendsChart() {
  const [selectedRange, setSelectedRange] = useState<RangeOption>('7d')

  // React Query로 트렌드 데이터 조회
  const { data: trends = [], isLoading, isError } = useQuery({
    queryKey: ['storage-trends', selectedRange],
    queryFn: () => fetchStorageMetricsTrends(selectedRange),
    refetchInterval: 60000, // 1분마다 자동 갱신
    staleTime: 60000,
  })

  // Recharts용 데이터 변환 (bytes → GB 단위로)
  const chartData = trends.map((trend: StorageMetricsTrend) => ({
    timestamp: formatTimestamp(trend.timestamp),
    totalGB: trend.totalSize / (1024 ** 3),
    hotGB: trend.hotSize / (1024 ** 3),
    warmGB: trend.warmSize / (1024 ** 3),
    coldGB: trend.coldSize / (1024 ** 3),
  }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">차트 로딩 중...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">차트 데이터를 불러오는 데 실패했습니다.</div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* 헤더: 제목 + 범위 선택 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          스토리지 사용량 추세
        </h3>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as RangeOption[]).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1 text-sm font-medium rounded ${
                selectedRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 영역 */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: 'Storage (GB)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)} GB`}
            labelStyle={{ color: '#333' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalGB"
            stroke="#6366f1"
            strokeWidth={2}
            name="Total"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="hotGB"
            stroke="#ef4444"
            strokeWidth={2}
            name="HOT"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="warmGB"
            stroke="#f59e0b"
            strokeWidth={2}
            name="WARM"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="coldGB"
            stroke="#3b82f6"
            strokeWidth={2}
            name="COLD"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 데이터 포인트 개수 표시 */}
      <div className="mt-4 text-sm text-gray-500 text-right">
        {trends.length}개 데이터 포인트
      </div>
    </div>
  )
}
