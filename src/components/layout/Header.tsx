import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'

/**
 * Header.tsx
 *
 * 상단 네비게이션 바
 *
 * 주요 기능:
 * 1. 햄버거 메뉴 (데스크톱: Sidebar 토글, 모바일: 드로어 열기)
 * 2. 로고
 *
 * Note: 인증/인가 기능은 POC 단계에서 제외됨
 */
export default function Header() {
  const { toggleSidebar, toggleMobileSidebar } = useUIStore()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* 좌측: 햄버거 메뉴 + 로고 */}
        <div className="flex items-center gap-4">
          {/* 데스크톱 햄버거 메뉴 (md 이상) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden md:flex"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* 모바일 햄버거 메뉴 (md 미만) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileSidebar}
            className="md:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* 로고 */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MP</span>
            </div>
            <span className="text-xl font-bold text-gray-900">MiniPACS</span>
          </div>
        </div>

        {/* 우측: POC 표시 */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            POC Mode
          </span>
        </div>
      </div>
    </header>
  )
}
