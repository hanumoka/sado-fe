/**
 * FormatSelectorPanel - WADO-RS BulkData 설정 패널
 *
 * 뷰어 설정을 변경하는 패널입니다.
 * - Sync Mode: 슬롯 동기화 모드 (Independent / Global Sync)
 * - Render: 렌더링 모드 (CPU / GPU)
 *
 * ViewerFooter의 extraControls로 사용됩니다.
 */
import { useCallback } from 'react'
import { useWadoRsBulkDataMultiViewerStore } from '../stores/wadoRsBulkDataMultiViewerStore'
import type { WadoRsBulkDataRenderingMode } from '../types/wadoRsBulkDataTypes'
import type { SyncMode } from '@/lib/utils/BaseCineAnimationManager'

const SYNC_MODE_OPTIONS: { value: SyncMode; label: string; description: string }[] = [
  {
    value: 'global-sync',
    label: 'Global Sync',
    description: '모든 슬롯이 동시에 재생/일시정지 (버퍼링 시 모든 슬롯 대기)',
  },
  {
    value: 'independent',
    label: 'Independent',
    description: '각 슬롯이 독립적으로 재생 (버퍼링 없이 개별 속도)',
  },
]

export function FormatSelectorPanel() {
  const renderingMode = useWadoRsBulkDataMultiViewerStore((state) => state.renderingMode)
  const isRenderingModeChanging = useWadoRsBulkDataMultiViewerStore((state) => state.isRenderingModeChanging)
  const gpuSupported = useWadoRsBulkDataMultiViewerStore((state) => state.gpuSupported)
  const setRenderingMode = useWadoRsBulkDataMultiViewerStore((state) => state.setRenderingMode)

  // Sync Mode (store에서 관리, sessionStorage에 저장됨)
  const syncMode = useWadoRsBulkDataMultiViewerStore((state) => state.syncMode)
  const setSyncMode = useWadoRsBulkDataMultiViewerStore((state) => state.setSyncMode)

  // 렌더링 모드 변경 핸들러
  const handleRenderingModeChange = useCallback((mode: WadoRsBulkDataRenderingMode) => {
    if (mode === renderingMode || isRenderingModeChanging) return
    setRenderingMode(mode)
  }, [renderingMode, isRenderingModeChanging, setRenderingMode])

  return (
    <div className="flex items-center gap-4">
      {/* Sync Mode 선택 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Sync:</span>
        <select
          value={syncMode}
          onChange={(e) => setSyncMode(e.target.value as SyncMode)}
          className="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          title={SYNC_MODE_OPTIONS.find((opt) => opt.value === syncMode)?.description}
        >
          {SYNC_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 구분선 */}
      <div className="h-4 w-px bg-gray-600" />

      {/* Rendering Mode 선택 (CPU/GPU) */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Render:</span>
        <div className="flex gap-1">
          <button
            onClick={() => handleRenderingModeChange('cpu')}
            disabled={isRenderingModeChanging}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              renderingMode === 'cpu'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isRenderingModeChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="CPU 렌더링 (안정적, 높은 CPU 사용)"
          >
            CPU
          </button>
          <button
            onClick={() => handleRenderingModeChange('gpu')}
            disabled={isRenderingModeChanging || !gpuSupported}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              renderingMode === 'gpu'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${isRenderingModeChanging || !gpuSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={gpuSupported ? 'GPU 렌더링 (빠름, RGBA 첫 사이클 깨짐 가능)' : 'GPU 렌더링 미지원 (WebGL2 필요)'}
          >
            GPU{!gpuSupported && ' (N/A)'}
          </button>
        </div>
        {isRenderingModeChanging && (
          <span className="text-xs text-yellow-400 animate-pulse">전환 중...</span>
        )}
      </div>

    </div>
  )
}
