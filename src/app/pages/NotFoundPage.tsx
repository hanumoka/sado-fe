import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * NotFoundPage.tsx
 *
 * 404 에러 페이지
 *
 * 기능:
 * - 페이지를 찾을 수 없음 안내
 * - 홈으로 이동 버튼
 * - 이전 페이지로 이동 버튼
 */
export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gray-100 rounded-full">
            <FileQuestion className="h-16 w-16 text-gray-400" />
          </div>
        </div>

        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          요청하신 페이지가 존재하지 않거나, 이동되었거나, 삭제되었습니다. URL을
          확인하시거나 아래 버튼을 클릭하여 이동해주세요.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            이전 페이지
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            홈으로 이동
          </Button>
        </div>
      </div>
    </div>
  )
}
