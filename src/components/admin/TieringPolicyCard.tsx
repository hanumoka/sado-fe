/**
 * TieringPolicyCard.tsx
 *
 * Storage Tiering 정책 표시 카드
 */

import { Settings, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { TieringPolicies } from '@/types'

interface TieringPolicyCardProps {
  data: TieringPolicies
  isLoading?: boolean
}

export default function TieringPolicyCard({ data, isLoading }: TieringPolicyCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Tiering 정책</h3>
        <div className="p-2 bg-orange-50 rounded-lg">
          <Settings className="h-5 w-5 text-orange-600" />
        </div>
      </div>

      {/* 스케줄러 상태 */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
        {data.schedulerEnabled ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-green-700">자동 Tiering 활성화</span>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-700">자동 Tiering 비활성화</span>
          </>
        )}
      </div>

      {/* 정책 상세 */}
      <div className="space-y-4">
        {/* HOT → WARM */}
        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">HOT</span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">WARM</span>
          </div>
          <div className="text-sm text-gray-600">
            <p>마지막 접근 후 <strong>{data.hotToWarmDays}일</strong> 경과 시 전환</p>
            <div className="flex items-center gap-1 mt-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{data.hotToWarmSchedule}</span>
            </div>
          </div>
        </div>

        {/* WARM → COLD */}
        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">WARM</span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">COLD</span>
          </div>
          <div className="text-sm text-gray-600">
            <p>마지막 접근 후 <strong>{data.warmToColdDays}일</strong> 경과 시 전환</p>
            <div className="flex items-center gap-1 mt-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{data.warmToColdSchedule}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
