/**
 * ViewerFooter - 공유 뷰어 푸터 컴포넌트
 *
 * 모든 DICOM 뷰어에서 공통으로 사용하는 푸터 UI
 * - 글로벌 재생 컨트롤 (Play All, Pause All, Stop All)
 * - FPS 설정
 * - 추가 컨트롤 슬롯 (extraControls)
 */
import { Play, Pause, Square } from 'lucide-react'
import type { ViewerFooterProps } from '../types/viewerTypes'
import { VIEWER_THEMES } from '../types/viewerTypes'

const FPS_OPTIONS = [15, 30, 60]

export function ViewerFooter({
  globalFps,
  onFpsChange,
  onPlayAll,
  onPauseAll,
  onStopAll,
  accentColor,
  displayName,
  extraControls,
}: ViewerFooterProps) {
  const theme = VIEWER_THEMES[accentColor]

  return (
    <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* 왼쪽: 재생 컨트롤 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 mr-2">Global:</span>
          <button
            onClick={onPlayAll}
            className={`p-2 ${theme.bgClass} hover:opacity-80 rounded-lg transition-colors`}
            title="Play All"
          >
            <Play className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={onPauseAll}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Pause All"
          >
            <Pause className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={onStopAll}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Stop All"
          >
            <Square className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* 중앙: 추가 컨트롤 */}
        {extraControls && (
          <div className="flex items-center gap-4">
            {extraControls}
          </div>
        )}

        {/* 오른쪽: FPS 설정 + 뷰어 타입 표시 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">FPS:</span>
            {FPS_OPTIONS.map((fps) => (
              <button
                key={fps}
                onClick={() => onFpsChange(fps)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  globalFps === fps
                    ? `${theme.bgClass} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {fps}
              </button>
            ))}
          </div>
          <span className={`text-xs ${theme.textClass} font-medium`}>
            {displayName}
          </span>
        </div>
      </div>
    </footer>
  )
}
