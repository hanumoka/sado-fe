import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * authStore.ts
 *
 * 인증 관련 전역 상태 관리 (Zustand + persist 미들웨어)
 *
 * 주요 기능:
 * 1. 로그인 상태 (user, token) localStorage 자동 저장
 * 2. 페이지 새로고침 시에도 로그인 상태 유지
 * 3. logout 시 localStorage 자동 삭제
 *
 * POC 설정: 기본 ADMIN 사용자로 초기화 (인증/인가 기능 제외)
 */

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // POC용 기본 ADMIN 사용자 (인증/인가 기능 제외)
      user: {
        id: 'admin-001',
        username: 'admin',
        name: 'Admin User (POC)',
        role: 'ADMIN',
      },
      token: 'mock-jwt-token-for-poc',
      login: (token, user) => {
        set({ token, user });
      },
      logout: () => {
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-storage', // localStorage 키
    }
  )
);
