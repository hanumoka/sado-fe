import type { LucideIcon } from 'lucide-react'

/**
 * PageHeader Props
 */
interface PageHeaderProps {
  /** 아이콘 (lucide-react) */
  icon?: LucideIcon
  /** 페이지 제목 */
  title: string
  /** 페이지 설명 (선택적) */
  description?: string
  /** 우측 액션 영역 (버튼 등) */
  actions?: React.ReactNode
  /** 추가 클래스명 */
  className?: string
}

/**
 * PageHeader
 *
 * 페이지 상단 헤더 컴포넌트
 *
 * @example
 * // 기본 사용
 * <PageHeader title="환자 목록" />
 *
 * // 아이콘과 설명 포함
 * <PageHeader
 *   icon={Users}
 *   title="환자 목록"
 *   description="환자를 검색하고 Study를 조회하세요"
 * />
 *
 * // 액션 버튼 포함
 * <PageHeader
 *   icon={Upload}
 *   title="DICOM 업로드"
 *   actions={<Button>새 업로드</Button>}
 * />
 */
export default function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
