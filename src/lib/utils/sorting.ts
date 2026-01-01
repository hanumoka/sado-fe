/**
 * sorting.ts
 *
 * 범용 정렬 유틸리티 함수
 *
 * 테이블 정렬에 사용되는 공통 로직 추출
 */

export type SortOrder = 'asc' | 'desc'

export interface SortConfig<K> {
  key: K
  order: SortOrder
}

/**
 * 값 타입에 따라 자동으로 비교하는 함수
 *
 * @param a - 첫 번째 값
 * @param b - 두 번째 값
 * @returns 비교 결과 (-1, 0, 1)
 */
export function compareValues(a: unknown, b: unknown): number {
  // null/undefined 처리
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1

  // 문자열 비교
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }

  // 숫자 비교
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  // 날짜 문자열 비교 (YYYY-MM-DD 또는 ISO 형식)
  if (typeof a === 'string' && typeof b === 'string') {
    const dateA = Date.parse(a)
    const dateB = Date.parse(b)
    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateA - dateB
    }
  }

  // Date 객체 비교
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime()
  }

  // 기본: 문자열 변환 후 비교
  return String(a).localeCompare(String(b))
}

/**
 * 배열을 주어진 키와 순서로 정렬
 *
 * @param items - 정렬할 배열
 * @param key - 정렬 기준 키
 * @param order - 정렬 순서 ('asc' | 'desc')
 * @returns 정렬된 새 배열
 *
 * @example
 * const sorted = sortItems(patients, 'name', 'asc')
 * const sorted = sortItems(studies, 'studyDate', 'desc')
 */
export function sortItems<T extends Record<string, unknown>, K extends keyof T>(
  items: T[],
  key: K,
  order: SortOrder
): T[] {
  return [...items].sort((a, b) => {
    const comparison = compareValues(a[key], b[key])
    return order === 'asc' ? comparison : -comparison
  })
}

/**
 * SortConfig 객체를 사용하여 배열 정렬
 *
 * @param items - 정렬할 배열
 * @param config - 정렬 설정 { key, order }
 * @returns 정렬된 새 배열
 *
 * @example
 * const sorted = sortByConfig(patients, { key: 'name', order: 'asc' })
 */
export function sortByConfig<
  T extends Record<string, unknown>,
  K extends keyof T,
>(items: T[], config: SortConfig<K>): T[] {
  return sortItems(items, config.key, config.order)
}

/**
 * 정렬 토글 함수
 * 같은 키를 클릭하면 순서 반전, 다른 키면 asc로 시작
 *
 * @param currentConfig - 현재 정렬 설정
 * @param newKey - 새로 클릭한 키
 * @returns 새 정렬 설정
 *
 * @example
 * const handleSort = (key) => {
 *   setSortConfig(toggleSort(sortConfig, key))
 * }
 */
export function toggleSort<K>(
  currentConfig: SortConfig<K>,
  newKey: K
): SortConfig<K> {
  return {
    key: newKey,
    order:
      currentConfig.key === newKey && currentConfig.order === 'asc'
        ? 'desc'
        : 'asc',
  }
}
