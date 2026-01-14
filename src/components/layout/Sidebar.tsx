import { NavLink } from 'react-router-dom'
import { Upload, Users, FileText, Film, Image, X, HardDrive } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

/**
 * Sidebar.tsx
 *
 * 좌측 네비게이션 사이드바
 *
 * 주요 기능:
 * 1. React Router NavLink로 현재 활성 메뉴 표시
 * 2. 사이드바 접힘/펼침 상태에 따라 아이콘만 / 아이콘+텍스트 표시
 * 3. 모바일에서는 드로어로 표시 (오버레이 + 슬라이드)
 *
 * Note: 인증/인가 기능은 POC 단계에서 제외됨
 */

interface NavItem {
  name: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { name: 'Study 목록', path: '/', icon: FileText },
  { name: 'DICOM 업로드', path: '/upload', icon: Upload },
  { name: '환자 목록', path: '/patients', icon: Users },
  { name: '시리즈 목록', path: '/series', icon: Film },
  { name: '인스턴스 목록', path: '/instances', icon: Image },
  // DICOM 뷰어는 Study Detail → Series 클릭으로 접근
]

const adminNavItems: NavItem[] = [
  { name: '파일시스템 관리', path: '/admin/storage', icon: HardDrive },
]

/**
 * 네비게이션 콘텐츠 (데스크톱/모바일 공용)
 */
function NavContent({
  items,
  showText,
  onNavClick,
}: {
  items: NavItem[]
  showText: boolean
  onNavClick?: () => void
}) {
  return (
    <nav className="p-2">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavClick}
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
            {showText && (
              <span className="text-sm font-medium">{item.name}</span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function Sidebar() {
  const { sidebarOpen, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  const closeMobileSidebar = () => setMobileSidebarOpen(false)

  return (
    <>
      {/* 데스크톱 사이드바 (md 이상에서만 표시) */}
      <aside
        className={`
          hidden
          md:block
          fixed
          left-0
          top-16
          bottom-0
          bg-white
          border-r
          border-gray-200
          transition-all
          duration-300
          z-40
          overflow-y-auto
          ${sidebarOpen ? 'w-64' : 'w-16'}
        `}
      >
        <NavContent items={navItems} showText={sidebarOpen} />
        {/* 구분선 */}
        <div className="mx-2 my-2 border-t border-gray-200" />
        {/* 관리 메뉴 */}
        {sidebarOpen && (
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-gray-400 uppercase">관리</span>
          </div>
        )}
        <NavContent items={adminNavItems} showText={sidebarOpen} />
      </aside>

      {/* 모바일 오버레이 (md 미만에서만 표시) */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* 모바일 드로어 (md 미만에서만 표시) */}
      <aside
        className={`
          fixed
          left-0
          top-0
          bottom-0
          w-64
          bg-white
          border-r
          border-gray-200
          z-50
          md:hidden
          transition-transform
          duration-300
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 모바일 드로어 헤더 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MP</span>
            </div>
            <span className="text-xl font-bold text-gray-900">MiniPACS</span>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* 네비게이션 */}
        <NavContent
          items={navItems}
          showText={true}
          onNavClick={closeMobileSidebar}
        />
        {/* 구분선 */}
        <div className="mx-2 my-2 border-t border-gray-200" />
        {/* 관리 메뉴 */}
        <div className="px-3 py-2">
          <span className="text-xs font-semibold text-gray-400 uppercase">관리</span>
        </div>
        <NavContent
          items={adminNavItems}
          showText={true}
          onNavClick={closeMobileSidebar}
        />
      </aside>
    </>
  )
}
