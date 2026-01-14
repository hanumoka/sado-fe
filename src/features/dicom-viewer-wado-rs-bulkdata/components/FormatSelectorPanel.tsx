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
import { useWadoRsBulkDataMultiViewerStore } from '../stores/wadoRsBulkDataMultiViewerStore'
import type { BulkDataFormat } from '../types/wadoRsBulkDataTypes'
import { BULK_DATA_FORMAT_CONFIG } from '../types/wadoRsBulkDataTypes'

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

export function FormatSelectorPanel() {
  const globalFormat = useWadoRsBulkDataMultiViewerStore((state) => state.globalFormat)
  const setGlobalFormat = useWadoRsBulkDataMultiViewerStore((state) => state.setGlobalFormat)
  const globalResolution = useWadoRsBulkDataMultiViewerStore((state) => state.globalResolution)
  const setGlobalResolution = useWadoRsBulkDataMultiViewerStore((state) => state.setGlobalResolution)

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

      {/* W/L 지원 여부 표시 */}
      {!BULK_DATA_FORMAT_CONFIG[globalFormat].supportsWindowLevel && (
        <span className="text-xs text-yellow-500">(W/L 조절 불가)</span>
      )}
    </div>
  )
}
