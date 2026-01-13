/**
 * FormatSelectorPanel - WADO-RS BulkData 포맷 선택 패널
 *
 * BulkData 포맷을 선택하여 네트워크 트래픽을 최적화합니다.
 * - auto: 압축 데이터 우선, 없으면 RAW 폴백
 * - raw: 디코딩된 픽셀 데이터 (512KB/프레임)
 * - original: 원본 인코딩 데이터 (JPEG2000, JPEG 등, 50-150KB/프레임)
 *
 * ViewerFooter의 extraControls로 사용됩니다.
 */
import { useWadoRsBulkDataMultiViewerStore } from '../stores/wadoRsBulkDataMultiViewerStore'
import type { BulkDataFormat } from '../types/wadoRsBulkDataTypes'

const FORMAT_OPTIONS: { value: BulkDataFormat; label: string; description: string }[] = [
  { value: 'original', label: 'Original', description: '원본 인코딩' },
  { value: 'raw', label: 'Decoded', description: '디코딩된 픽셀' },
]

export function FormatSelectorPanel() {
  const globalFormat = useWadoRsBulkDataMultiViewerStore((state) => state.globalFormat)
  const setGlobalFormat = useWadoRsBulkDataMultiViewerStore((state) => state.setGlobalFormat)

  return (
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
  )
}
