import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

/**
 * EmptyState Props
 */
interface EmptyStateProps {
  /** 아이콘 (lucide-react) */
  icon?: LucideIcon
  /** 제목 */
  title?: string
  /** 설명 */
  description?: string
  /** 액션 버튼 (선택적) */
  action?: React.ReactNode
  /** 추가 클래스명 */
  className?: string
}

/**
 * EmptyState
 *
 * 데이터가 없을 때 표시하는 빈 상태 컴포넌트
 *
 * @example
 * // 기본 사용
 * <EmptyState title="검색 결과가 없습니다" />
 *
 * // 아이콘과 설명 포함
 * <EmptyState
 *   icon={Users}
 *   title="환자가 없습니다"
 *   description="새 환자를 등록하거나 검색 조건을 변경해보세요"
 * />
 *
 * // 액션 버튼 포함
 * <EmptyState
 *   icon={Upload}
 *   title="업로드된 파일이 없습니다"
 *   action={<Button>파일 업로드</Button>}
 * />
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = '데이터가 없습니다',
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-12 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 p-4 rounded-full">
          <Icon className="h-12 w-12 text-gray-400" />
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      {description && (
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
