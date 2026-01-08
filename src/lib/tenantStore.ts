/**
 * tenantStore.ts
 *
 * 전역 테넌트 ID 관리
 *
 * POC 단계에서 간단하게 전역 변수로 tenantId를 관리합니다.
 * 추후 Zustand store 또는 Context로 확장 가능합니다.
 *
 * 사용법:
 * - setTenantId(2): 테넌트 ID 설정
 * - getTenantId(): 현재 테넌트 ID 조회
 * - clearTenantId(): 테넌트 ID 초기화 (기본값 사용)
 */

// 기본 테넌트 ID (서버의 DefaultTenantProvider와 동일)
const DEFAULT_TENANT_ID = 1

// 현재 테넌트 ID (undefined면 기본값 사용)
let currentTenantId: number | undefined = undefined

// 변경 리스너들
type Listener = (tenantId: number | undefined) => void
const listeners: Set<Listener> = new Set()

/**
 * 테넌트 ID 설정
 *
 * @param tenantId 테넌트 ID (숫자)
 */
export function setTenantId(tenantId: number | undefined): void {
  currentTenantId = tenantId
  listeners.forEach((listener) => listener(currentTenantId))
}

/**
 * 현재 테넌트 ID 조회
 *
 * @returns 현재 테넌트 ID (설정되지 않은 경우 undefined)
 */
export function getTenantId(): number | undefined {
  return currentTenantId
}

/**
 * 현재 테넌트 ID 조회 (기본값 포함)
 *
 * @returns 현재 테넌트 ID 또는 기본값(1)
 */
export function getTenantIdOrDefault(): number {
  return currentTenantId ?? DEFAULT_TENANT_ID
}

/**
 * 테넌트 ID 초기화 (기본값 사용)
 */
export function clearTenantId(): void {
  currentTenantId = undefined
  listeners.forEach((listener) => listener(currentTenantId))
}

/**
 * 테넌트 ID 변경 리스너 등록
 *
 * @param listener 콜백 함수
 * @returns unsubscribe 함수
 */
export function subscribeTenantId(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * 기본 테넌트 ID 조회
 */
export function getDefaultTenantId(): number {
  return DEFAULT_TENANT_ID
}
