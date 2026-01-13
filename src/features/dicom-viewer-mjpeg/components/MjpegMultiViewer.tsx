/**
 * MjpegMultiViewer Component
 *
 * MJPEG 슬롯들을 그리드 형태로 배치하는 컨테이너 컴포넌트
 */

import { useMjpegMultiViewerStore, useActiveSlots } from '../stores/mjpegMultiViewerStore'
import { MjpegSlot } from './MjpegSlot'
import { LAYOUT_GRID_CLASSES } from '../types'

/**
 * MJPEG Multi-Viewer 컨테이너
 *
 * 특징:
 * - 1x1, 2x2, 3x3, 4x4 그리드 레이아웃 지원
 * - 레이아웃에 따라 활성화된 슬롯만 표시
 */
export function MjpegMultiViewer() {
  const { layout } = useMjpegMultiViewerStore()
  const activeSlots = useActiveSlots()

  const gridClass = LAYOUT_GRID_CLASSES[layout]

  return (
    <div className={`grid ${gridClass} gap-1 w-full h-full p-1 bg-gray-900`}>
      {activeSlots.map((slot) => (
        <MjpegSlot key={slot.slotId} slot={slot} />
      ))}
    </div>
  )
}
