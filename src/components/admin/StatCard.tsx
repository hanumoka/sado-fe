/**
 * StatCard.tsx
 *
 * 통계 표시 카드 컴포넌트
 *
 * 기능:
 * - 아이콘, 제목, 수치 표시
 * - 다양한 통계 타입 지원 (환자, Study, Series, Instance 등)
 */

import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  title: string
  value: number
  iconColor?: string
  iconBgColor?: string
}

export default function StatCard({
  icon: Icon,
  title,
  value,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`${iconBgColor} rounded-lg p-3`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
