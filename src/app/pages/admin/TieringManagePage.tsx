/**
 * TieringManagePage.tsx
 *
 * Storage Tiering 관리 페이지
 * - Tiering 정책 확인
 * - Tier별 파일 목록
 */

import { useQuery } from '@tanstack/react-query'
import { fetchTieringPolicies } from '@/lib/services/adminService'
import TieringPolicyCard from '@/components/admin/TieringPolicyCard'
import TierFileList from '@/components/admin/TierFileList'

export default function TieringManagePage() {
  // Tiering 정책 조회
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ['tieringPolicies'],
    queryFn: fetchTieringPolicies,
    refetchInterval: 60000,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tiering 관리</h1>
        <p className="text-gray-600 mt-1">Storage Tiering 정책 및 파일 현황을 관리합니다.</p>
      </div>

      {/* 정책 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TieringPolicyCard
          data={policies || {
            hotToWarmDays: 30,
            warmToColdDays: 90,
            schedulerEnabled: false,
            hotToWarmSchedule: '',
            warmToColdSchedule: '',
          }}
          isLoading={policiesLoading}
        />
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">개발 예정</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              수동 Tier 전환 기능
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Tiering 정책 수정 기능
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Tier 전환 이력 조회
            </li>
          </ul>
        </div>
      </div>

      {/* Tier별 파일 목록 */}
      <TierFileList />
    </div>
  )
}
