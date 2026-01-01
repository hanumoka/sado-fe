/**
 * Skeleton.tsx
 *
 * 로딩 상태 표시용 Skeleton UI 컴포넌트
 *
 * 컴포넌트:
 * - Skeleton: 기본 스켈레톤 블록
 * - TableSkeleton: 테이블 로딩 (PatientList, StudyList용)
 * - GridSkeleton: 그리드 로딩 (SeriesThumbnailGrid용)
 * - CardSkeleton: 카드 로딩
 */

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * 기본 스켈레톤 블록
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded bg-gray-200 dark:bg-gray-700', className)}
    />
  )
}

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

/**
 * 테이블 스켈레톤 (PatientList, StudyList용)
 */
export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 테이블 헤더 */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>

      {/* 테이블 바디 */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    'h-4',
                    colIndex === 0 ? 'w-24' : 'flex-1',
                    colIndex === columns - 1 ? 'w-20' : ''
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface GridSkeletonProps {
  items?: number
  columns?: 2 | 3 | 4
}

/**
 * 그리드 스켈레톤 (SeriesThumbnailGrid용)
 */
export function GridSkeleton({ items = 4, columns = 4 }: GridSkeletonProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns])}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          {/* 썸네일 영역 */}
          <Skeleton className="w-full aspect-square" />

          {/* 정보 영역 */}
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface CardSkeletonProps {
  hasImage?: boolean
}

/**
 * 카드 스켈레톤
 */
export function CardSkeleton({ hasImage = false }: CardSkeletonProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {hasImage && <Skeleton className="w-full h-40" />}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  )
}

interface StatCardSkeletonProps {
  count?: number
}

/**
 * 대시보드 통계 카드 스켈레톤
 */
export function StatCardSkeleton({ count = 4 }: StatCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
