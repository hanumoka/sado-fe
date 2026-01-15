/**
 * TierDistributionChart.tsx
 *
 * Storage Tier 분포를 파이 차트로 표시
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { TierDistribution } from '@/types'
import { formatBytes } from '@/lib/utils'

interface TierDistributionChartProps {
  data: TierDistribution
  isLoading?: boolean
}

const COLORS = {
  hot: '#ef4444',   // red-500
  warm: '#eab308',  // yellow-500
  cold: '#3b82f6',  // blue-500
}

export default function TierDistributionChart({ data, isLoading }: TierDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-48 bg-gray-100 rounded"></div>
      </div>
    )
  }

  const chartData = [
    { name: 'HOT', value: data.hot, color: COLORS.hot },
    { name: 'WARM', value: data.warm, color: COLORS.warm },
    { name: 'COLD', value: data.cold, color: COLORS.cold },
  ].filter(item => item.value > 0)

  const total = data.hot + data.warm + data.cold

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier 분포</h3>

      {total === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          데이터 없음
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatBytes(value as number)}
            />
            <Legend
              formatter={(value) => {
                const item = chartData.find(d => d.name === value)
                return `${value}: ${item ? formatBytes(item.value) : ''}`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
