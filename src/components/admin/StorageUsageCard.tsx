/**
 * StorageUsageCard.tsx
 *
 * 스토리지 사용량 카드 컴포넌트
 *
 * 기능:
 * - 전체 스토리지 사용량 표시
 * - Tier별 사용량 시각화 (HOT/WARM/COLD)
 * - 바이트를 사람이 읽기 쉬운 형식으로 변환
 */

import { HardDrive } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import type { StorageSummary } from '@/types'

interface StorageUsageCardProps {
  summary: StorageSummary
}

export default function StorageUsageCard({ summary }: StorageUsageCardProps) {
  const { totalSize, hotSize, warmSize, coldSize } = summary

  // 각 Tier의 비율 계산
  const hotPercent = totalSize > 0 ? (hotSize / totalSize) * 100 : 0
  const warmPercent = totalSize > 0 ? (warmSize / totalSize) * 100 : 0
  const coldPercent = totalSize > 0 ? (coldSize / totalSize) * 100 : 0

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="bg-purple-100 rounded-lg p-3">
            <HardDrive className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">
              스토리지 사용량
            </h3>
            <p className="text-sm text-gray-600">
              총 {formatBytes(totalSize)}
            </p>
          </div>
        </div>
      </div>

      {/* 진행바 */}
      <div className="mb-4">
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-red-500"
            style={{ width: `${hotPercent}%` }}
            title={`HOT: ${formatBytes(hotSize)}`}
          />
          <div
            className="h-full bg-yellow-500"
            style={{ width: `${warmPercent}%` }}
            title={`WARM: ${formatBytes(warmSize)}`}
          />
          <div
            className="h-full bg-blue-500"
            style={{ width: `${coldPercent}%` }}
            title={`COLD: ${formatBytes(coldSize)}`}
          />
        </div>
      </div>

      {/* Tier별 상세 정보 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
            <span className="text-sm font-medium text-gray-700">HOT</span>
          </div>
          <p className="text-sm text-gray-600">{formatBytes(hotSize)}</p>
          <p className="text-xs text-gray-500">{hotPercent.toFixed(1)}%</p>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2" />
            <span className="text-sm font-medium text-gray-700">WARM</span>
          </div>
          <p className="text-sm text-gray-600">{formatBytes(warmSize)}</p>
          <p className="text-xs text-gray-500">{warmPercent.toFixed(1)}%</p>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
            <span className="text-sm font-medium text-gray-700">COLD</span>
          </div>
          <p className="text-sm text-gray-600">{formatBytes(coldSize)}</p>
          <p className="text-xs text-gray-500">{coldPercent.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}
