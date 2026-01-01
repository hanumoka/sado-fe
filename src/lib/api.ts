import { useAuthStore } from '@/stores/authStore';

/**
 * api.ts
 *
 * Fetch API Wrapper
 *
 * 주요 기능:
 * 1. Authorization 헤더 자동 추가 (authStore에서 token 가져오기)
 * 2. 공통 에러 처리
 * 3. GET, POST, PUT, DELETE, uploadFile 메서드 제공
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10200';

export const api = {
  /**
   * GET 요청
   */
  get: async <T = any>(url: string): Promise<T> => {
    const token = useAuthStore.getState().token;

    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * POST 요청
   */
  post: async <T = any>(url: string, data: any): Promise<T> => {
    const token = useAuthStore.getState().token;

    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * PUT 요청
   */
  put: async <T = any>(url: string, data: any): Promise<T> => {
    const token = useAuthStore.getState().token;

    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * DELETE 요청
   */
  delete: async <T = any>(url: string): Promise<T> => {
    const token = useAuthStore.getState().token;

    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * 파일 업로드 (multipart/form-data)
   */
  uploadFile: async <T = any>(url: string, file: File): Promise<T> => {
    const token = useAuthStore.getState().token;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        // Content-Type은 브라우저가 자동으로 설정 (boundary 포함)
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },
};
