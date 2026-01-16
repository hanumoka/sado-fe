/**
 * HybridMultiViewer Component
 *
 * 하이브리드 뷰어 그리드 레이아웃 컨테이너
 * 레이아웃별 슬롯 배치 (1x1, 2x2, 3x2, 3x3)
 */

import { useCallback } from 'react'
import { useHybridMultiViewerStore, useActiveHybridSlots } from '../stores/hybridMultiViewerStore'
import { HybridSlot } from './HybridSlot'
import { HYBRID_LAYOUT_GRID_CLASSES, type HybridInstanceSummary } from '../types'

interface HybridMultiViewerProps {
  /** 슬롯에 인스턴스 드롭 시 콜백 */
  onInstanceDrop?: (slotId: number, instance: HybridInstanceSummary) => void
}

/**
 * 하이브리드 뷰어 그리드 컨테이너
 */
export function HybridMultiViewer({ onInstanceDrop }: HybridMultiViewerProps) {
  const layout = useHybridMultiViewerStore((state) => state.layout)
  const activeSlots = useActiveHybridSlots()

  const gridClasses = HYBRID_LAYOUT_GRID_CLASSES[layout]

  const handleSlotDrop = useCallback(
    (slotId: number, instance: HybridInstanceSummary) => {
      onInstanceDrop?.(slotId, instance)
    },
    [onInstanceDrop]
  )

  return (
    <div className={`grid ${gridClasses} gap-2 w-full h-full p-2`}>
      {activeSlots.map((slot) => (
        <HybridSlot
          key={slot.slotId}
          slotId={slot.slotId}
          onDrop={handleSlotDrop}
        />
      ))}
    </div>
  )
}
