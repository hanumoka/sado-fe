/**
 * ViewerOverlay.tsx
 *
 * DICOM 뷰어 오버레이 컴포넌트
 *
 * 기능:
 * - 환자 정보 표시 (좌상단)
 * - 이미지 정보 표시 (우상단)
 * - 도구/상태 정보 표시
 */

import type {
  ViewerTool,
  WindowLevelPreset,
  ViewerSeries,
} from '../types/viewer'
import type { Instance } from '@/types'

interface ViewerOverlayProps {
  series?: ViewerSeries | null
  instance?: Instance | null
  currentIndex: number
  totalInstances: number
  activeTool: ViewerTool
  windowLevelPreset?: WindowLevelPreset
}

export default function ViewerOverlay({
  series,
  instance,
  currentIndex,
  totalInstances,
  activeTool,
  windowLevelPreset,
}: ViewerOverlayProps) {
  return (
    <>
      {/* 좌상단: 환자/시리즈 정보 */}
      <div className="absolute top-4 left-4 text-white space-y-1">
        <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-2 space-y-1">
          {series && (
            <>
              <p className="text-xs text-gray-400">Series</p>
              <p className="text-sm font-medium">
                {series.seriesDescription || 'N/A'}
              </p>
              <p className="text-xs text-gray-400 font-mono">
                {series.modality} - #{series.seriesNumber}
              </p>
            </>
          )}
        </div>

        {/* 도구 정보 */}
        <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-2">
          <p className="text-xs text-gray-400">도구</p>
          <p className="text-sm font-medium text-blue-400">{activeTool}</p>
        </div>
      </div>

      {/* 우상단: Window/Level 정보 */}
      <div className="absolute top-4 right-4 text-white">
        <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-2">
          {windowLevelPreset ? (
            <>
              <p className="text-xs text-gray-400">{windowLevelPreset.name}</p>
              <p className="text-sm font-mono">
                W: {windowLevelPreset.windowWidth}
              </p>
              <p className="text-sm font-mono">
                C: {windowLevelPreset.windowCenter}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400">Window/Level: Default</p>
          )}
        </div>
      </div>

      {/* 좌하단: Instance 정보 */}
      {instance && (
        <div className="absolute bottom-4 left-4 text-white">
          <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-2 space-y-1">
            <p className="text-xs text-gray-400">Instance</p>
            <p className="text-sm font-medium">#{instance.instanceNumber}</p>
            <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
              {instance.sopInstanceUid}
            </p>
          </div>
        </div>
      )}

      {/* 우하단: 네비게이션 정보 */}
      {totalInstances > 0 && (
        <div className="absolute bottom-4 right-4 text-white">
          <div className="bg-black/60 backdrop-blur-sm rounded px-4 py-2 flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{currentIndex + 1}</p>
              <p className="text-xs text-gray-400">/ {totalInstances}</p>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>← → 이미지 탐색</p>
              <p>+ - 확대/축소</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
