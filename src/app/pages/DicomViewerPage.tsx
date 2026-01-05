import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import ViewerToolbar from '@/features/dicom-viewer/components/ViewerToolbar'
import DicomViewer from '@/features/dicom-viewer/components/DicomViewer'
import { useInstances } from '@/features/dicom-viewer/hooks/useInstances'
import { getErrorMessage } from '@/lib/errorMessages'
import type {
  ViewerTool,
  WindowLevelPreset,
} from '@/features/dicom-viewer/types/viewer'

/**
 * DicomViewerPage.tsx
 *
 * DICOM 뷰어 페이지
 *
 * 통합:
 * 1. ViewerToolbar (도구 모음)
 * 2. DicomViewer (이미지 렌더링)
 * 3. useInstances Hook (데이터 조회)
 * 4. URL 파라미터로 Study/Series 선택
 */
export default function DicomViewerPage() {
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()
  const navigate = useNavigate()

  const [activeTool, setActiveTool] = useState<ViewerTool>('WindowLevel')
  const [windowLevelPreset, setWindowLevelPreset] =
    useState<WindowLevelPreset>()

  // TanStack Query Hook
  const { data, isLoading, error } = useInstances(
    studyInstanceUid || '',
    seriesInstanceUid || ''
  )

  const handleToolChange = (tool: ViewerTool) => {
    if (tool === 'Reset') {
      // 초기화: Window/Level 리셋
      setWindowLevelPreset(undefined)
      setActiveTool('WindowLevel')
    } else {
      setActiveTool(tool)
    }
  }

  const handlePresetChange = (preset: WindowLevelPreset) => {
    setWindowLevelPreset(preset)
    setActiveTool('WindowLevel')
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* 헤더 */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">돌아가기</span>
          </button>

          {data?.series && (
            <div>
              <h1 className="text-lg font-bold">
                {data.series.modality} - {data.series.seriesDescription}
              </h1>
              <p className="text-sm text-gray-400">
                Series #{data.series.seriesNumber} •{' '}
                {data.series.instancesCount} Images
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 도구 모음 */}
      <ViewerToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onPresetChange={handlePresetChange}
      />

      {/* 뷰어 영역 */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <p className="text-lg">DICOM 이미지를 불러오는 중...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <p className="text-red-500 text-lg mb-2">오류 발생</p>
              <p className="text-gray-400">{getErrorMessage(error)}</p>
            </div>
          </div>
        )}

        {data && !isLoading && !error && (
          <DicomViewer
            instances={data.instances}
            series={data.series}
            activeTool={activeTool}
            windowLevelPreset={windowLevelPreset}
          />
        )}
      </div>

      {/* 정보 패널 */}
      {data && (
        <div className="bg-gray-900 text-white p-4 border-t border-gray-800">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Series Instance UID</p>
              <p className="font-mono text-xs truncate">
                {data.series.seriesInstanceUid}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Modality</p>
              <p className="font-medium">{data.series.modality}</p>
            </div>
            <div>
              <p className="text-gray-400">Series Number</p>
              <p className="font-medium">{data.series.seriesNumber}</p>
            </div>
            <div>
              <p className="text-gray-400">Images</p>
              <p className="font-medium">{data.instances.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
