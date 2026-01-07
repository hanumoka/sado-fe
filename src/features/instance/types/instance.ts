/**
 * instance.ts
 *
 * Instance Feature 타입 정의
 */

// 엔티티 타입은 @/types에서 re-export
export type { Instance } from '@/types'

// 검색 파라미터 및 페이지 응답은 서비스에서 re-export
export type { InstanceSearchParams, InstancePageResponse } from '@/lib/services'
