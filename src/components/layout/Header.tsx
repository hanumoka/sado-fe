import { Menu, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Header.tsx
 *
 * 상단 네비게이션 바
 *
 * 주요 기능:
 * 1. 햄버거 메뉴 (Sidebar 토글)
 * 2. 로고
 * 3. 사용자 정보 표시
 * 4. 로그아웃 버튼
 */
export default function Header() {
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between h-full px-4">
        {/* 좌측: 햄버거 메뉴 + 로고 */}
        <div className="flex items-center gap-4">
          {/* 햄버거 메뉴 */}
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
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

        {/* 우측: 사용자 정보 + 로그아웃 */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* 사용자 정보 */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-gray-700">{user.name}</span>
                <span className="text-gray-400">({user.role})</span>
              </div>

              {/* 로그아웃 버튼 */}
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </>
          ) : (
            <div className="text-sm text-gray-500">로그인 필요</div>
          )}
        </div>
      </div>
    </header>
  );
}
