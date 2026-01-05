/**
 * TierDistributionChart.tsx
 *
 * Storage Tier 분포 차트 컴포넌트
 *
 * 기능:
 * - Recharts 파이 차트로 Tier 분포 시각화
 * - HOT/WARM/COLD Tier별 색상 구분
 * - 바이트를 사람이 읽기 쉬운 형식으로 표시
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatBytes } from '@/lib/utils'
import type { TierDistribution } from '@/types'

interface TierDistributionChartProps {
  distribution: TierDistribution
}

// Recharts Pie Label Props 타입 정의
interface PieLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  index?: number
}

// Tier별 색상 정의
const TIER_COLORS = {
  HOT: '#ef4444', // red-500
  WARM: '#f59e0b', // yellow-500
  COLD: '#3b82f6', // blue-500
}

export default function TierDistributionChart({
  distribution,
}: TierDistributionChartProps) {
  // Recharts 데이터 형식으로 변환
  const data = [
    { name: 'HOT', value: distribution.hot, color: TIER_COLORS.HOT },
    { name: 'WARM', value: distribution.warm, color: TIER_COLORS.WARM },
    { name: 'COLD', value: distribution.cold, color: TIER_COLORS.COLD },
  ]

  // 커스텀 라벨 렌더링
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: PieLabelProps) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // 10% 미만은 라벨 표시 안함
    if (percent < 0.1) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Tooltip 커스텀 포맷터
  const tooltipFormatter = (value: number | undefined) => {
    if (value === undefined) return '0'
    return formatBytes(value)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Storage Tier 분포
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* 상세 정보 */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
        {data.map((tier) => (
          <div key={tier.name} className="text-center">
            <div className="flex items-center justify-center mb-1">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: tier.color }}
              />
              <span className="text-sm font-medium text-gray-700">
                {tier.name}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {formatBytes(tier.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
