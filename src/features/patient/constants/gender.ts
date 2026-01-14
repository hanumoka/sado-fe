/**
 * gender.ts
 *
 * 성별(Gender) 관련 상수 정의
 *
 * 사용처:
 * - PatientList.tsx
 * - PatientDetailModal.tsx
 */

import type { Gender } from '../types/patient'

// Gender 표시 라벨
export const GENDER_LABELS: Record<Gender, string> = {
  M: '남성',
  F: '여성',
  O: '기타',
  U: '알 수 없음',
}

// Gender 색상 스타일 (Tailwind CSS)
export const GENDER_COLORS: Record<Gender, string> = {
  M: 'bg-blue-100 text-blue-800',
  F: 'bg-pink-100 text-pink-800',
  O: 'bg-purple-100 text-purple-800',
  U: 'bg-gray-100 text-gray-800',
}
