import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { useUIStore } from '@/stores/uiStore'

/**
 * Layout.tsx
 *
 * 전체 레이아웃 구조
 *
 * 구조:
 * - Header (상단 고정)
 * - Sidebar (좌측, 데스크톱에서만 표시)
 * - MainContent (Outlet으로 자식 라우트 렌더링)
 *
 * 반응형:
 * - 모바일 (md 미만): 사이드바 숨김, 전체 너비 사용
 * - 데스크톱 (md 이상): 사이드바 표시, 여백 적용
 */
export default function Layout() {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <Header />

      {/* Sidebar + MainContent */}
      <div className="flex">
        <Sidebar />

        {/* MainContent */}
        <main
          className={`
            flex-1
            transition-all
            duration-300
            mt-16
            p-4
            md:p-6
            ml-0
            ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'}
          `}
        >
          {/* 자식 라우트가 여기에 렌더링됨 */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
