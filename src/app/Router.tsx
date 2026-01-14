import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import PatientListPage from '@/app/pages/PatientListPage'
import StudyListPage from '@/app/pages/StudyListPage'
import StudyDetailPage from '@/app/pages/StudyDetailPage'
import SeriesListPage from '@/app/pages/SeriesListPage'
import InstanceListPage from '@/app/pages/InstanceListPage'
import UploadPage from '@/app/pages/UploadPage'
import DicomViewerPage from '@/app/pages/DicomViewerPage'
import WadoRsViewerPage from '@/app/pages/WadoRsViewerPage'
import WadoUriViewerPage from '@/app/pages/WadoUriViewerPage'
import MultiSlotViewerPage from '@/app/pages/MultiSlotViewerPage'
import MjpegViewerPage from '@/app/pages/MjpegViewerPage'
import NotFoundPage from '@/app/pages/NotFoundPage'
// Admin Pages
import StorageManagePage from '@/app/pages/admin/StorageManagePage'

/**
 * Router.tsx
 *
 * React Router v7 기반 라우팅 설정
 *
 * 주요 기능:
 * 1. Nested Routes 패턴 (Layout 내부에 자식 라우트 렌더링)
 * 2. 404 페이지 처리
 *
 * Note: 인증/인가 기능은 POC 단계에서 제외됨
 */
export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout 내부에 Nested Routes */}
        <Route path="/" element={<Layout />}>
          {/* 메인 페이지: Study 목록 */}
          <Route index element={<StudyListPage />} />

          {/* Core PACS 기능 */}
          <Route path="patients" element={<PatientListPage />} />
          <Route path="studies" element={<StudyListPage />} />
          <Route path="studies/:studyId" element={<StudyDetailPage />} />
          <Route path="series" element={<SeriesListPage />} />
          <Route path="instances" element={<InstanceListPage />} />
          <Route path="upload" element={<UploadPage />} />

          {/* 파일시스템 관리 */}
          <Route path="admin/storage" element={<StorageManagePage />} />
        </Route>

        {/* DICOM Viewer POC: WADO-RS Rendered (Full Screen - Layout 밖) */}
        <Route path="/viewer/wado-rs-rendered/:studyInstanceUid/:seriesInstanceUid" element={<DicomViewerPage />} />

        {/* DICOM Viewer POC: WADO-RS BulkData (Full Screen - Layout 밖) */}
        <Route path="/viewer/wado-rs/:studyInstanceUid/:seriesInstanceUid" element={<WadoRsViewerPage />} />

        {/* DICOM Viewer POC: WADO-URI (Full Screen - Layout 밖) */}
        <Route path="/viewer/wado-uri/:studyInstanceUid/:seriesInstanceUid" element={<WadoUriViewerPage />} />

        {/* Multi-Slot DICOM Viewer (Full Screen - Layout 밖) */}
        <Route path="/multi-viewer" element={<MultiSlotViewerPage />} />

        {/* MJPEG Streaming Viewer POC (Full Screen - Layout 밖) */}
        <Route path="/viewer/mjpeg" element={<MjpegViewerPage />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
