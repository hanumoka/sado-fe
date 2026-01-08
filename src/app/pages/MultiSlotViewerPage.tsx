/**
 * MultiSlotViewerPage.tsx
 *
 * Cornerstone.js 기반 멀티 슬롯 DICOM 뷰어 페이지
 *
 * 기능:
 * - 1x1, 2x2, 3x3 그리드 레이아웃
 * - WADO-RS Rendered API 지원
 * - Cine 재생 및 성능 추적
 * - 드래그 앤 드롭 인스턴스 할당
 * - 인스턴스 목록 사이드바 (전체/재생가능 필터)
 */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CornerstoneMultiViewer } from '@/features/dicom-viewer/components'
import { InstanceSidebar } from '@/features/dicom-viewer/components/InstanceSidebar'

export default function MultiSlotViewerPage() {
  const navigate = useNavigate()

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

          <div>
            <h1 className="text-lg font-bold">Multi-Slot DICOM Viewer</h1>
            <p className="text-sm text-gray-400">Cornerstone.js 멀티 슬롯 뷰어</p>
          </div>
        </div>

        <div className="text-sm text-gray-400">
          <span className="text-blue-400">WADO-RS</span> • Cornerstone 4.15.1
        </div>
      </div>

      {/* 메인 컨텐츠 (사이드바 + 뷰어) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 인스턴스 사이드바 */}
        <InstanceSidebar className="w-64 flex-shrink-0 border-r border-gray-700" />

        {/* 멀티 슬롯 뷰어 */}
        <div className="flex-1 overflow-hidden">
          <CornerstoneMultiViewer />
        </div>
      </div>
    </div>
  )
}
