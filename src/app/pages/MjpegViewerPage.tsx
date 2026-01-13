/**
 * MjpegViewerPage.tsx
 *
 * MJPEG 뷰어 페이지 (v2 - 클라이언트 사이드 캐싱)
 *
 * 기능:
 * - 클라이언트 사이드 프레임 캐싱 (1회 다운로드 후 로컬 재생)
 * - 1x1, 2x2, 3x3, 4x4 그리드 레이아웃 지원
 * - Canvas + requestAnimationFrame 기반 재생
 * - Pre-rendered cine JPEG 사용
 *
 * 개선점 (v2):
 * - HTTP/1.1 동시 연결 제한 없음 (캐싱 방식)
 * - 16개 슬롯 동시 재생 가능
 * - Load All / Play All 기능
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MjpegMultiViewer } from '@/features/dicom-viewer-mjpeg/components/MjpegMultiViewer'
import { MjpegInstanceSidebar } from '@/features/dicom-viewer-mjpeg/components/MjpegInstanceSidebar'
import { MjpegControls } from '@/features/dicom-viewer-mjpeg/components/MjpegControls'

export default function MjpegViewerPage() {
  const navigate = useNavigate()

  const handleBack = useCallback(() => navigate(-1), [navigate])

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* ========== Header ========== */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">
              MJPEG
            </span>
            <h1 className="text-lg font-semibold text-white">
              Cine Viewer
            </h1>
            <span className="text-xs text-green-400">
              (Client-side Caching + Canvas)
            </span>
          </div>
        </div>
      </header>

      {/* ========== Controls ========== */}
      <MjpegControls />

      {/* ========== Main Content ========== */}
      <main className="flex-1 flex overflow-hidden">
        {/* 왼쪽: Viewer Grid */}
        <div className="flex-1 h-full bg-black">
          <MjpegMultiViewer />
        </div>

        {/* 오른쪽: Instance Sidebar */}
        <MjpegInstanceSidebar className="w-[280px] flex-shrink-0 border-l border-gray-700" />
      </main>
    </div>
  )
}
