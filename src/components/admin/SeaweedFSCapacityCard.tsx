/**
 * SeaweedFSCapacityCard.tsx
 *
 * SeaweedFS 물리적 스토리지 용량 표시 카드
 */

import { Server } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import type { SeaweedFSCapacity } from '@/types'

interface SeaweedFSCapacityCardProps {
  data: SeaweedFSCapacity
  isLoading?: boolean
}

export default function SeaweedFSCapacityCard({ data, isLoading }: SeaweedFSCapacityCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    )
  }

  const usedPercent = data.percentUsed || 0
  const freePercent = 100 - usedPercent

  // 색상 결정: 80% 이상이면 경고
  const progressColor = usedPercent >= 80 ? 'bg-red-500' : 'bg-green-500'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">SeaweedFS 용량</h3>
        <div className="p-2 bg-green-50 rounded-lg">
          <Server className="h-5 w-5 text-green-600" />
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">전체 용량</span>
          <span className="font-medium text-gray-900">{formatBytes(data.totalCapacity)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">사용량</span>
          <span className="font-medium text-gray-900">{formatBytes(data.usedSpace)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">여유 공간</span>
          <span className="font-medium text-gray-900">{formatBytes(data.freeSpace)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} transition-all`}
          style={{ width: `${usedPercent}%` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-sm text-gray-500">
        <span>사용: {usedPercent.toFixed(1)}%</span>
        <span>여유: {freePercent.toFixed(1)}%</span>
      </div>
    </div>
  )
}
