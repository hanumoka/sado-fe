/**
 * CornerstoneSlotControls - 개별 슬롯 재생 컨트롤
 *
 * Play/Pause, 프레임 이동, 프리로드, 슬롯 클리어
 *
 * mini-pacs-poc 참고
 */
import { useCornerstoneMultiViewerStore } from '../stores'

interface CornerstoneSlotControlsProps {
  slotId: number
  isPlaying: boolean
  currentFrame: number
  totalFrames: number
  isPreloaded: boolean
}

export function CornerstoneSlotControls({
  slotId,
  isPlaying,
  currentFrame,
  totalFrames,
  isPreloaded,
}: CornerstoneSlotControlsProps) {
  const {
    playSlot,
    pauseSlot,
    setSlotFrame,
    goToFirstFrameSlot,
    goToLastFrameSlot,
    nextFrameSlot,
    prevFrameSlot,
    clearSlot,
    preloadSlotFrames,
  } = useCornerstoneMultiViewerStore()

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseSlot(slotId)
    } else {
      playSlot(slotId)
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlotFrame(slotId, parseInt(e.target.value, 10))
  }

  const handlePreload = () => {
    preloadSlotFrames(slotId)
  }

  const handleClear = () => {
    clearSlot(slotId)
  }

  return (
    <div className="bg-gray-800 p-2 border-t border-gray-700">
      {/* 프레임 슬라이더 */}
      <div className="mb-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalFrames - 1)}
          value={currentFrame}
          onChange={handleSliderChange}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex items-center justify-between gap-1">
        {/* 재생 컨트롤 */}
        <div className="flex items-center gap-1">
          {/* 처음으로 */}
          <button
            onClick={() => goToFirstFrameSlot(slotId)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="First Frame"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* 이전 프레임 */}
          <button
            onClick={() => prevFrameSlot(slotId)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Previous Frame"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className={`p-1.5 rounded transition-colors ${
              isPlaying
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* 다음 프레임 */}
          <button
            onClick={() => nextFrameSlot(slotId)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Next Frame"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          {/* 마지막으로 */}
          <button
            onClick={() => goToLastFrameSlot(slotId)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Last Frame"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* 추가 기능 */}
        <div className="flex items-center gap-1">
          {/* 프리로드 */}
          {!isPreloaded && totalFrames > 1 && (
            <button
              onClick={handlePreload}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Preload Frames"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            </button>
          )}

          {/* 슬롯 클리어 */}
          <button
            onClick={handleClear}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
            title="Clear Slot"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
