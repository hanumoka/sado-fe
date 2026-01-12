/**
 * ViewerHeader - 공유 뷰어 헤더 컴포넌트
 *
 * 모든 DICOM 뷰어에서 공통으로 사용하는 헤더 UI
 * - 뒤로가기 버튼
 * - Series 정보 (Modality, Description)
 * - 그리드 레이아웃 선택
 * - 초기화/로딩 상태 표시
 */
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { ViewerHeaderProps } from '../types/viewerTypes'
import { LAYOUT_OPTIONS, VIEWER_THEMES } from '../types/viewerTypes'

export function ViewerHeader({
  modality,
  seriesDescription,
  displayName,
  accentColor,
  isLoading,
  isInitialized,
  layout,
  onLayoutChange,
  onBack,
}: ViewerHeaderProps) {
  const theme = VIEWER_THEMES[accentColor]

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* 왼쪽: 뒤로가기 + Series 정보 */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Back to Series List"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>

          <div className="flex items-center gap-2">
            {modality && (
              <span className={`px-2 py-0.5 ${theme.bgClass} text-white text-xs font-bold rounded`}>
                {modality}
              </span>
            )}
            <h1 className="text-lg font-semibold text-white">
              {seriesDescription || 'Series Viewer'}
            </h1>
            <span className={`text-xs ${theme.textClass}`}>
              ({displayName})
            </span>
          </div>

          {/* 로딩/초기화 상태 */}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
          {!isInitialized && !isLoading && (
            <div className="flex items-center gap-2 text-yellow-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Initializing Viewer...</span>
            </div>
          )}
        </div>

        {/* 오른쪽: 그리드 레이아웃 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 mr-2">Layout:</span>
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onLayoutChange(option.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                layout === option.value
                  ? `${theme.bgClass} text-white`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
