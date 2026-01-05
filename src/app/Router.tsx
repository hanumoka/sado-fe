import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import AdminDashboardPage from '@/app/pages/admin/AdminDashboardPage'
import PatientListPage from '@/app/pages/PatientListPage'
import StudyListPage from '@/app/pages/StudyListPage'
import StudyDetailPage from '@/app/pages/StudyDetailPage'
import UploadPage from '@/app/pages/UploadPage'
import DicomViewerPage from '@/app/pages/DicomViewerPage'
import MultiSlotViewerPage from '@/app/pages/MultiSlotViewerPage'
import NotFoundPage from '@/app/pages/NotFoundPage'
import SeaweedFSManagePage from '@/app/pages/admin/SeaweedFSManagePage'
import StorageMonitoringPage from '@/app/pages/admin/StorageMonitoringPage'
import TieringManagePage from '@/app/pages/admin/TieringManagePage'

/**
 * Router.tsx
 *
 * React Router v7 기반 라우팅 설정
 *
 * 주요 기능:
 * 1. Nested Routes 패턴 (Layout 내부에 자식 라우트 렌더링)
 * 2. Admin 전용 시스템 (메인 대시보드가 Admin 대시보드 역할)
 * 3. 404 페이지 처리
 *
 * Note: 인증/인가 기능은 POC 단계에서 제외됨
 */
export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout 내부에 Nested Routes */}
        <Route path="/" element={<Layout />}>
          {/* Admin 대시보드 (Real API 연동) */}
          <Route index element={<AdminDashboardPage />} />

          {/* Phase 1: Core PACS 기능 */}
          <Route path="patients" element={<PatientListPage />} />
          <Route path="studies" element={<StudyListPage />} />
          <Route path="studies/:studyId" element={<StudyDetailPage />} />
          <Route path="upload" element={<UploadPage />} />

          {/* /admin 경로는 메인 대시보드로 리다이렉트 (하위 호환성) */}
          <Route path="admin" element={<Navigate to="/" replace />} />

          {/* Phase 2: 고급 관리 기능 */}
          <Route path="admin/seaweedfs" element={<SeaweedFSManagePage />} />
          <Route path="admin/storage-monitoring" element={<StorageMonitoringPage />} />
          <Route path="admin/tiering" element={<TieringManagePage />} />
        </Route>

        {/* DICOM Viewer (Full Screen - Layout 밖) */}
        <Route path="/viewer/:studyInstanceUid/:seriesInstanceUid" element={<DicomViewerPage />} />

        {/* Multi-Slot DICOM Viewer (Full Screen - Layout 밖) */}
        <Route path="/multi-viewer" element={<MultiSlotViewerPage />} />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
