/**
 * StorageTrendsChart.tsx
 *
 * 스토리지 사용량 트렌드를 라인 차트로 표시
 */

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
import type { StorageMetricsTrend } from '@/types'
import { formatBytes } from '@/lib/utils'

interface StorageTrendsChartProps {
  data: StorageMetricsTrend[]
  isLoading?: boolean
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export default function StorageTrendsChart({ data, isLoading }: StorageTrendsChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-48 bg-gray-100 rounded"></div>
      </div>
    )
  }

  const chartData = data.map(item => ({
    ...item,
    date: formatDate(item.timestamp),
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">스토리지 트렌드</h3>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          데이터 없음
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatBytes}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => formatBytes(value as number)}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="hotSize"
              name="HOT"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="warmSize"
              name="WARM"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="coldSize"
              name="COLD"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
