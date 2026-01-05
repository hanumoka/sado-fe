/**
 * SeaweedFSCapacityCard.tsx
 *
 * SeaweedFS 물리적 스토리지 용량 정보 표시 카드
 *
 * 기능:
 * - SeaweedFS 디스크 전체 용량, 사용량, 여유 공간 표시
 * - 사용률에 따른 색상 변경 (75% 이상 노란색, 90% 이상 빨간색)
 * - Progress Bar로 시각화
 * - WSL2 가상 디스크 동적 할당 안내
 */

import { HelpCircle } from 'lucide-react'
import type { SeaweedFSCapacity } from '@/types'
import { formatBytes } from '@/lib/utils'

interface SeaweedFSCapacityCardProps {
  capacity: SeaweedFSCapacity
}

/**
 * SeaweedFS 물리적 스토리지 용량 카드
 */
export default function SeaweedFSCapacityCard({ capacity }: SeaweedFSCapacityCardProps) {
  const { totalCapacity, usedSpace, freeSpace, percentUsed } = capacity

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          SeaweedFS 스토리지 풀 용량
        </h3>
        <span className="text-xs text-gray-500">가상 디스크 (동적 할당)</span>
      </div>

      {/* 전체 용량 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">가상 디스크 최대 크기</span>
            <div className="group relative">
              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                Docker Desktop WSL2 가상 디스크의 최대 크기입니다.
                실제 Windows 호스트 디스크는 사용 중인 용량만 차지합니다 (동적 할당).
              </div>
            </div>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {formatBytes(totalCapacity)}
          </span>
        </div>
      </div>

      {/* 사용량 Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">사용 중</span>
          <span className="text-sm font-semibold text-blue-600">
            {formatBytes(usedSpace)} ({percentUsed.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              percentUsed >= 90
                ? 'bg-red-500'
                : percentUsed >= 75
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* 여유 공간 */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">여유 공간</span>
          <span className="text-sm font-semibold text-green-600">
            {formatBytes(freeSpace)} ({(100 - percentUsed).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* 상태 표시 */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">상태</span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${
              percentUsed >= 90
                ? 'bg-red-100 text-red-800'
                : percentUsed >= 75
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {percentUsed >= 90
              ? '용량 부족'
              : percentUsed >= 75
              ? '주의 필요'
              : '정상'}
          </span>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>참고:</strong> 표시된 "가상 디스크 최대 크기"는 Docker Desktop WSL2의 기본 설정값(1TB)입니다.
          실제 Windows 호스트 디스크는 "사용 중" 용량만 차지하며, 필요 시 최대 크기까지 동적으로 증가합니다 (Sparse 파일 방식).
        </p>
      </div>
    </div>
  )
}
