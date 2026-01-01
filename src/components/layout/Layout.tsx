import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useUIStore } from '@/stores/uiStore';

/**
 * Layout.tsx
 *
 * 전체 레이아웃 구조
 *
 * 구조:
 * - Header (상단 고정)
 * - Sidebar (좌측, 토글 가능)
 * - MainContent (Outlet으로 자식 라우트 렌더링)
 */
export default function Layout() {
  const { sidebarOpen } = useUIStore();

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
            ${sidebarOpen ? 'ml-64' : 'ml-16'}
            mt-16
            p-6
          `}
        >
          {/* 자식 라우트가 여기에 렌더링됨 */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
