/**
 * StorageUsageCard.tsx
 *
 * 스토리지 사용량 표시 카드
 */

import { HardDrive } from 'lucide-react'
import type { StorageSummary } from '@/types'

interface StorageUsageCardProps {
  data: StorageSummary
  isLoading?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function StorageUsageCard({ data, isLoading }: StorageUsageCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    )
  }

  const totalSize = data.totalSize || 1 // Prevent division by zero
  const hotPercent = (data.hotSize / totalSize) * 100
  const warmPercent = (data.warmSize / totalSize) * 100
  const coldPercent = (data.coldSize / totalSize) * 100

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">스토리지 사용량</h3>
        <div className="p-2 bg-blue-50 rounded-lg">
          <HardDrive className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <p className="text-3xl font-bold text-gray-900 mb-4">
        {formatBytes(data.totalSize)}
      </p>

      {/* Progress Bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${hotPercent}%` }}
          title={`HOT: ${formatBytes(data.hotSize)}`}
        />
        <div
          className="bg-yellow-500 transition-all"
          style={{ width: `${warmPercent}%` }}
          title={`WARM: ${formatBytes(data.warmSize)}`}
        />
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${coldPercent}%` }}
          title={`COLD: ${formatBytes(data.coldSize)}`}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
          <span className="text-gray-600">HOT: {formatBytes(data.hotSize)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
          <span className="text-gray-600">WARM: {formatBytes(data.warmSize)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span className="text-gray-600">COLD: {formatBytes(data.coldSize)}</span>
        </div>
      </div>
    </div>
  )
}
