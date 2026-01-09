/**
 * BatchSizeTestPanel - 배치 사이즈 테스트 UI 컴포넌트
 *
 * DICOMweb 멀티프레임 API의 최적 배치 사이즈를 찾기 위한 테스트 패널
 * - 배치 사이즈 동적 변경
 * - 리로드 기능으로 반복 테스트
 * - 성능 측정 결과 표시
 */
import { RefreshCw } from 'lucide-react'
import {
  useWadoRsBulkDataMultiViewerStore,
  type PreloadPerformance,
} from '../stores/wadoRsBulkDataMultiViewerStore'

interface BatchSizeTestPanelProps {
  onReload?: () => void
}

export function BatchSizeTestPanel({ onReload }: BatchSizeTestPanelProps) {
  const batchSize = useWadoRsBulkDataMultiViewerStore((s) => s.batchSize)
  const setBatchSize = useWadoRsBulkDataMultiViewerStore((s) => s.setBatchSize)
  const preloadPerformance = useWadoRsBulkDataMultiViewerStore((s) => s.preloadPerformance)
  const isReloading = useWadoRsBulkDataMultiViewerStore((s) => s.isReloading)
  const reloadAllSlots = useWadoRsBulkDataMultiViewerStore((s) => s.reloadAllSlots)

  const handleReload = async () => {
    if (onReload) {
      onReload()
    }
    await reloadAllSlots()
  }

  const handleBatchSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setBatchSize(value)
    }
  }

  const handleIncrement = () => {
    setBatchSize(batchSize + 1)
  }

  const handleDecrement = () => {
    setBatchSize(batchSize - 1)
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-700 rounded">
      {/* 배치 사이즈 입력 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-300">Batch Size:</span>
        <div className="flex items-center">
          <button
            onClick={handleDecrement}
            disabled={batchSize <= 1 || isReloading}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-l border border-gray-500 text-sm text-white transition-colors"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={50}
            value={batchSize}
            onChange={handleBatchSizeChange}
            disabled={isReloading}
            className="w-12 px-2 py-1 bg-gray-600 text-white text-center border-y border-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-gray-800 disabled:text-gray-500"
          />
          <button
            onClick={handleIncrement}
            disabled={batchSize >= 50 || isReloading}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-r border border-gray-500 text-sm text-white transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* 리로드 버튼 */}
      <button
        onClick={handleReload}
        disabled={isReloading}
        className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm text-white transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />
        {isReloading ? 'Loading...' : 'Reload'}
      </button>

      {/* 성능 결과 */}
      {preloadPerformance && !isReloading && (
        <PerformanceDisplay performance={preloadPerformance} />
      )}

      {/* 로딩 중 표시 */}
      {isReloading && (
        <span className="text-sm text-yellow-400 animate-pulse">Measuring...</span>
      )}
    </div>
  )
}

/**
 * 성능 측정 결과 표시 컴포넌트
 */
function PerformanceDisplay({ performance }: { performance: PreloadPerformance }) {
  const { loadTimeMs, requestCount, framesLoaded, avgTimePerBatch } = performance

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* 총 시간 */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400">Time:</span>
        <span className="text-green-400 font-mono">{(loadTimeMs / 1000).toFixed(2)}s</span>
      </div>

      <span className="text-gray-600">|</span>

      {/* 요청 수 */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400">Requests:</span>
        <span className="text-cyan-400 font-mono">{requestCount}</span>
      </div>

      <span className="text-gray-600">|</span>

      {/* 프레임 수 */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400">Frames:</span>
        <span className="text-white font-mono">{framesLoaded}</span>
      </div>

      <span className="text-gray-600">|</span>

      {/* 배치당 평균 시간 */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400">Avg/batch:</span>
        <span className="text-purple-400 font-mono">{avgTimePerBatch.toFixed(0)}ms</span>
      </div>
    </div>
  )
}
