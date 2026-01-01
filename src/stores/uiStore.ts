import { create } from 'zustand'

/**
 * uiStore.ts
 *
 * UI 상태 관리 (Zustand)
 *
 * 주요 기능:
 * 1. 사이드바 열림/닫힘 상태 (데스크톱)
 * 2. 모바일 사이드바 드로어 상태
 * 3. 모달, 알림 등 UI 관련 상태 (향후 추가)
 */

interface UIStore {
  // 데스크톱 사이드바 (접힘/펼침)
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // 모바일 사이드바 드로어
  mobileSidebarOpen: boolean
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  // 데스크톱 사이드바
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // 모바일 사이드바 드로어
  mobileSidebarOpen: false,
  toggleMobileSidebar: () =>
    set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}))
