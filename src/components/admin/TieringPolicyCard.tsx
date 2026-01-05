/**
 * TieringPolicyCard.tsx
 *
 * Tier 정책 카드 컴포넌트
 *
 * 기능:
 * - 자동 Tier 전환 정책 표시 (읽기 전용)
 * - HOT → WARM, WARM → COLD 조건 표시
 * - 스케줄 시간 표시
 */

import { Settings, Clock, Calendar } from 'lucide-react'
import type { TieringPolicies } from '@/types'

interface TieringPolicyCardProps {
  policies: TieringPolicies
}

// Cron 표현식을 사람이 읽기 쉬운 형식으로 변환
function parseCronSchedule(cron: string): string {
  // "0 0 3 * * *" → "매일 오전 3시"
  // "0 0 4 * * *" → "매일 오전 4시"
  const parts = cron.split(' ')
  if (parts.length >= 3) {
    const hour = parseInt(parts[2], 10)
    const period = hour < 12 ? '오전' : '오후'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `매일 ${period} ${displayHour}시`
  }
  return cron
}

export default function TieringPolicyCard({ policies }: TieringPolicyCardProps) {
  const {
    hotToWarmDays,
    warmToColdDays,
    schedulerEnabled,
    hotToWarmSchedule,
    warmToColdSchedule,
  } = policies

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-green-100 rounded-lg p-3">
            <Settings className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">
              자동 Tier 전환 정책
            </h3>
            <p className="text-sm text-gray-600">
              현재 설정된 Tiering 규칙 (읽기 전용)
            </p>
          </div>
        </div>
        <div>
          {schedulerEnabled ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              활성화됨
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              비활성화됨
            </span>
          )}
        </div>
      </div>

      {/* 정책 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HOT → WARM 정책 */}
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="flex items-center mb-3">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-2" />
            <span className="text-sm font-semibold text-gray-900">HOT</span>
            <span className="mx-2 text-gray-500">→</span>
            <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2" />
            <span className="text-sm font-semibold text-gray-900">WARM</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start">
              <Calendar className="h-4 w-4 text-gray-600 mt-0.5 mr-2" />
              <div>
                <p className="text-xs text-gray-600">전환 조건</p>
                <p className="text-sm font-medium text-gray-900">
                  {hotToWarmDays}일 미사용
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="h-4 w-4 text-gray-600 mt-0.5 mr-2" />
              <div>
                <p className="text-xs text-gray-600">스케줄</p>
                <p className="text-sm font-medium text-gray-900">
                  {parseCronSchedule(hotToWarmSchedule)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{hotToWarmSchedule}</p>
              </div>
            </div>
          </div>
        </div>

        {/* WARM → COLD 정책 */}
        <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
          <div className="flex items-center mb-3">
            <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2" />
            <span className="text-sm font-semibold text-gray-900">WARM</span>
            <span className="mx-2 text-gray-500">→</span>
            <div className="w-4 h-4 bg-blue-500 rounded-full mr-2" />
            <span className="text-sm font-semibold text-gray-900">COLD</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start">
              <Calendar className="h-4 w-4 text-gray-600 mt-0.5 mr-2" />
              <div>
                <p className="text-xs text-gray-600">전환 조건</p>
                <p className="text-sm font-medium text-gray-900">
                  {warmToColdDays}일 미사용
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="h-4 w-4 text-gray-600 mt-0.5 mr-2" />
              <div>
                <p className="text-xs text-gray-600">스케줄</p>
                <p className="text-sm font-medium text-gray-900">
                  {parseCronSchedule(warmToColdSchedule)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{warmToColdSchedule}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>참고:</strong> 정책 수정 기능은 Backend API 개발 후 추가 예정입니다. 현재는 <code>application.yml</code> 파일에서 설정 가능합니다.
        </p>
      </div>
    </div>
  )
}
