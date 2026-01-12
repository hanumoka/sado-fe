/**
 * ViewerGrid - 공유 뷰어 그리드 컴포넌트
 *
 * 모든 DICOM 뷰어에서 공통으로 사용하는 그리드 레이아웃 UI
 * - 1x1, 2x2, 3x3, 4x4 레이아웃 지원
 * - 슬롯 선택 상태 표시
 * - Render prop으로 슬롯 컴포넌트 주입
 */
import { useMemo } from 'react'
import type { GridLayout, ViewerGridProps } from '../types/viewerTypes'
import { LAYOUT_OPTIONS, VIEWER_THEMES } from '../types/viewerTypes'

/**
 * 레이아웃에 따른 그리드 클래스 반환
 */
function getGridClass(layout: GridLayout): string {
  switch (layout) {
    case '1x1':
      return 'grid-cols-1 grid-rows-1'
    case '2x2':
      return 'grid-cols-2 grid-rows-2'
    case '3x3':
      return 'grid-cols-3 grid-rows-3'
    case '4x4':
      return 'grid-cols-4 grid-rows-4'
    default:
      return 'grid-cols-1 grid-rows-1'
  }
}

export function ViewerGrid({
  layout,
  isInitialized,
  selectedSlot,
  onSlotClick,
  accentColor,
  renderSlot,
}: ViewerGridProps) {
  const theme = VIEWER_THEMES[accentColor]
  const gridClass = getGridClass(layout)
  const maxSlots = LAYOUT_OPTIONS.find((o) => o.value === layout)?.slots || 1

  // 슬롯 배열 생성
  const slots = useMemo(() => {
    return Array.from({ length: maxSlots }, (_, i) => i)
  }, [maxSlots])

  return (
    <div className={`grid ${gridClass} gap-2 h-full`}>
      {slots.map((slotId) => (
        <div
          key={slotId}
          onClick={() => onSlotClick(slotId)}
          className={`relative cursor-pointer transition-all rounded-lg overflow-hidden ${
            selectedSlot === slotId
              ? `ring-2 ${theme.borderClass.replace('border-', 'ring-')}`
              : 'ring-1 ring-gray-700 hover:ring-gray-600'
          }`}
        >
          {isInitialized ? (
            renderSlot(slotId)
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="animate-pulse h-8 w-8 mx-auto mb-2 rounded-full bg-gray-700" />
                <p className="text-xs">Initializing...</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
