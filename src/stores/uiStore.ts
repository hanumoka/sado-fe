import { create } from 'zustand';

/**
 * uiStore.ts
 *
 * UI 상태 관리 (Zustand)
 *
 * 주요 기능:
 * 1. 사이드바 열림/닫힘 상태
 * 2. 모달, 알림 등 UI 관련 상태 (향후 추가)
 */

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
