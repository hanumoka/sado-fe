import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Users,
  FileText,
  Eye,
  Settings,
  BarChart3,
  Layers,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Sidebar.tsx
 *
 * 좌측 네비게이션 사이드바
 *
 * 주요 기능:
 * 1. React Router NavLink로 현재 활성 메뉴 표시
 * 2. 사이드바 접힘/펼침 상태에 따라 아이콘만 / 아이콘+텍스트 표시
 * 3. 권한 기반 메뉴 필터링 (Admin 메뉴는 ADMIN 권한만 표시)
 */

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  // Admin 전용 시스템 (메인 대시보드가 Admin 대시보드 역할)
  { name: 'Admin 대시보드', path: '/', icon: LayoutDashboard },
  { name: 'DICOM 업로드', path: '/upload', icon: Upload },
  { name: '환자 목록', path: '/patients', icon: Users },
  { name: 'Study 목록', path: '/studies', icon: FileText },
  // DICOM 뷰어는 Study Detail → Series 클릭으로 접근

  // 고급 관리 기능 (Phase 2)
  {
    name: '파일시스템 관리',
    path: '/admin/seaweedfs',
    icon: Layers,
    adminOnly: true,
  },
  {
    name: '스토리지 모니터링',
    path: '/admin/storage-monitoring',
    icon: BarChart3,
    adminOnly: true,
  },
  {
    name: 'Tier 관리',
    path: '/admin/tiering',
    icon: Layers,
    adminOnly: true,
  },
];

export default function Sidebar() {
  const { sidebarOpen } = useUIStore();
  const { user } = useAuthStore();

  // 권한 기반 필터링
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly) {
      return user?.role === 'ADMIN';
    }
    return true;
  });

  return (
    <aside
      className={`
        fixed
        left-0
        top-16
        bottom-0
        bg-white
        border-r
        border-gray-200
        transition-all
        duration-300
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}
    >
      <nav className="p-2">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `
                  flex
                  items-center
                  gap-3
                  px-3
                  py-3
                  mb-1
                  rounded-lg
                  transition-colors
                  ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
