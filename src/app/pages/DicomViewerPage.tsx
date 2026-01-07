import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { CornerstoneMultiViewer } from '@/features/dicom-viewer/components'
import { useCornerstoneMultiViewerStore } from '@/features/dicom-viewer/stores'
import { useInstances } from '@/features/dicom-viewer/hooks/useInstances'
import { getErrorMessage } from '@/lib/errorMessages'
import type { InstanceSummary } from '@/features/dicom-viewer/types/multiSlotViewer'

/**
 * DicomViewerPage.tsx
 *
 * Cornerstone.js 기반 멀티 슬롯 DICOM 뷰어 페이지
 *
 * 통합:
 * 1. CornerstoneMultiViewer (멀티 슬롯 뷰어)
 * 2. useInstances Hook (데이터 조회)
 * 3. URL 파라미터로 Study/Series 선택
 * 4. 자동으로 첫 번째 인스턴스를 슬롯 0에 로드
 */
export default function DicomViewerPage() {
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()
  const navigate = useNavigate()

  // TanStack Query Hook
  const { data, isLoading, error } = useInstances(
    studyInstanceUid || '',
    seriesInstanceUid || ''
  )

  const { assignInstanceToSlot, clearAllSlots } = useCornerstoneMultiViewerStore()

  // Series 로드 시 자동으로 첫 번째 인스턴스를 슬롯 0에 할당
  useEffect(() => {
    if (!data?.instances || data.instances.length === 0) return

    // 첫 번째 인스턴스 정보
    const firstInstance = data.instances[0]

    // InstanceSummary 형식으로 변환
    const instanceSummary: InstanceSummary = {
      sopInstanceUid: firstInstance.sopInstanceUid,
      studyInstanceUid: firstInstance.studyInstanceUid ?? data.series.studyInstanceUid,
      seriesInstanceUid: firstInstance.seriesInstanceUid ?? data.series.seriesInstanceUid,
      numberOfFrames: firstInstance.numberOfFrames ?? 1,
      patientName: data.series.patientName ?? '',
      modality: data.series.modality ?? 'UN',
    }

    // 슬롯 0에 할당
    assignInstanceToSlot(0, instanceSummary)

    // Cleanup: 페이지 언마운트 시 슬롯 초기화
    return () => {
      clearAllSlots()
    }
  }, [data, assignInstanceToSlot, clearAllSlots])

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* 헤더 */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">돌아가기</span>
          </button>

          {data?.series && (
            <div>
              <h1 className="text-lg font-bold">
                {data.series.modality ?? 'UN'} - {data.series.seriesDescription ?? 'N/A'}
              </h1>
              <p className="text-sm text-gray-400">
                Series #{data.series.seriesNumber ?? 0} • {data.series.instancesCount ?? 0} Images
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-400">
          <span className="text-blue-400">Multi-Slot Viewer</span> • Cornerstone 4.15.1
        </div>
      </div>

      {/* 뷰어 영역 */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-lg">DICOM 이미지를 불러오는 중...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center text-white">
              <p className="text-red-500 text-lg mb-2">오류 발생</p>
              <p className="text-gray-400">{getErrorMessage(error)}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && <CornerstoneMultiViewer />}
      </div>

      {/* 정보 패널 */}
      {data && (
        <div className="bg-gray-800 text-white p-4 border-t border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Series Instance UID</p>
              <p className="font-mono text-xs truncate">{data.series.seriesInstanceUid ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400">Modality</p>
              <p className="font-medium">{data.series.modality ?? 'UN'}</p>
            </div>
            <div>
              <p className="text-gray-400">Series Number</p>
              <p className="font-medium">{data.series.seriesNumber ?? 0}</p>
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
