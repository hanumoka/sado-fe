/**
 * ComingSoonPage.tsx
 *
 * 개발 예정 기능 플레이스홀더 페이지
 */

import { Construction } from 'lucide-react'

interface ComingSoonPageProps {
  title?: string
  description?: string
}

export default function ComingSoonPage({
  title = '개발 예정',
  description = '이 기능은 현재 개발 중입니다.',
}: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-6 bg-yellow-50 rounded-full mb-6">
        <Construction className="h-16 w-16 text-yellow-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 max-w-md">{description}</p>
    </div>
  )
}
