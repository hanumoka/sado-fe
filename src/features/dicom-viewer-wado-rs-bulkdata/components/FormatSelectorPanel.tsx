/**
 * FormatSelectorPanel - WADO-RS BulkData 포맷 선택 패널
 *
 * 4가지 데이터 소스를 선택하여 이미지 로딩 방식을 변경합니다.
 * - rendered: Pre-rendered JPEG/PNG (Resolution 선택, W/L 조절 불가)
 * - jpeg-baseline: 원본 해상도 JPEG Baseline (90%, W/L 조절 불가)
 * - original: 원본 인코딩 데이터 (JPEG2000, JPEG 등, 50-150KB/프레임)
 * - raw: 디코딩된 픽셀 데이터 (512KB/프레임, W/L 조절 가능)
 *
 * ViewerFooter의 extraControls로 사용됩니다.
 */
import { useState, useCallback } from 'react'
import { useWadoRsBulkDataMultiViewerStore } from '../stores/wadoRsBulkDataMultiViewerStore'
import type { BulkDataFormat, WadoRsBulkDataRenderingMode } from '../types/wadoRsBulkDataTypes'
import { BULK_DATA_FORMAT_CONFIG } from '../types/wadoRsBulkDataTypes'
import type { SyncMode } from '@/lib/utils/BaseCineAnimationManager'

const FORMAT_OPTIONS: { value: BulkDataFormat; label: string; description: string }[] = [
  { value: 'rendered', label: 'Pre-rendered', description: BULK_DATA_FORMAT_CONFIG.rendered.description },
  { value: 'jpeg-baseline', label: 'JPEG Baseline', description: BULK_DATA_FORMAT_CONFIG['jpeg-baseline'].description },
  { value: 'original', label: 'Original', description: BULK_DATA_FORMAT_CONFIG.original.description },
  { value: 'raw', label: 'Raw', description: BULK_DATA_FORMAT_CONFIG.raw.description },
]

const RESOLUTION_OPTIONS = [
  { value: 512, label: '512px (PNG)' },
  { value: 256, label: '256px (JPEG)' },
  { value: 128, label: '128px (JPEG)' },
  { value: 64, label: '64px (JPEG)' },
  { value: 32, label: '32px (JPEG)' },
]

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
  {
    value: 'master-slave',
    label: 'Master-Slave',
    description: '마스터 슬롯에 맞춰 다른 슬롯 동기화',
  },
]

export function FormatSelectorPanel() {
  const globalFormat = useWadoRsBulkDataMultiViewerStore((state) => state.globalFormat)
  const setGlobalFormat = useWadoRsBulkDataMultiViewerStore((state) => state.setGlobalFormat)
  const globalResolution = useWadoRsBulkDataMultiViewerStore((state) => state.globalResolution)
  const setGlobalResolution = useWadoRsBulkDataMultiViewerStore((state) => state.setGlobalResolution)
  const renderingMode = useWadoRsBulkDataMultiViewerStore((state) => state.renderingMode)
  const isRenderingModeChanging = useWadoRsBulkDataMultiViewerStore((state) => state.isRenderingModeChanging)
  const gpuSupported = useWadoRsBulkDataMultiViewerStore((state) => state.gpuSupported)
  const setRenderingMode = useWadoRsBulkDataMultiViewerStore((state) => state.setRenderingMode)

  // Sync Mode (store에서 관리, sessionStorage에 저장됨)
  const syncMode = useWadoRsBulkDataMultiViewerStore((state) => state.syncMode)
  const setSyncMode = useWadoRsBulkDataMultiViewerStore((state) => state.setSyncMode)

  // GPU 모드 전환 경고 모달 상태
  const [showGpuWarning, setShowGpuWarning] = useState(false)

  // 렌더링 모드 변경 핸들러
  const handleRenderingModeChange = useCallback((mode: WadoRsBulkDataRenderingMode) => {
    if (mode === renderingMode || isRenderingModeChanging) return

    // GPU 모드로 전환 시 경고 모달 표시
    if (mode === 'gpu') {
      setShowGpuWarning(true)
    } else {
      // CPU 모드로 전환은 바로 실행
      setRenderingMode(mode)
    }
  }, [renderingMode, isRenderingModeChanging, setRenderingMode])

  // GPU 전환 확인
  const confirmGpuSwitch = useCallback(async () => {
    setShowGpuWarning(false)
    await setRenderingMode('gpu')
  }, [setRenderingMode])

  return (
    <div className="flex items-center gap-4">
      {/* Format 선택 버튼 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Format:</span>
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setGlobalFormat(opt.value)}
            title={opt.description}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              globalFormat === opt.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Resolution 선택 (rendered일 때만) */}
      {globalFormat === 'rendered' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Resolution:</span>
          <select
            value={globalResolution}
            onChange={(e) => setGlobalResolution(parseInt(e.target.value, 10))}
            className="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {RESOLUTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 구분선 */}
      <div className="h-4 w-px bg-gray-600" />

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

      {/* W/L 지원 여부 표시 */}
      {!BULK_DATA_FORMAT_CONFIG[globalFormat].supportsWindowLevel && (
        <span className="text-xs text-yellow-500">(W/L 조절 불가)</span>
      )}

      {/* GPU 전환 경고 모달 */}
      {showGpuWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 border border-gray-600 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">GPU 렌더링으로 전환</h3>
            <div className="text-gray-300 text-sm space-y-3">
              <p>
                GPU 렌더링 시 RGBA 이미지(WADO-RS Rendered)의 첫 사이클에서 깨짐 현상이 발생할 수 있습니다.
              </p>
              <p>
                이 작업은 현재 진행 중인 재생을 중단하고 뷰포트를 재설정합니다.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowGpuWarning(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmGpuSwitch}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
              >
                GPU로 전환
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
