/**
 * AdminDashboardPage.tsx
 *
 * Admin Dashboard 메인 페이지
 *
 * POC 단계: Admin 기능은 DICOMweb 표준 API로 제공되지 않으므로 비활성화
 * 핵심 PACS 기능(Patients, Studies, Upload, Viewer)만 사용 가능
 */

import { Link } from 'react-router-dom'
import { Users, FileText, Upload, Eye, AlertCircle } from 'lucide-react'

/**
 * Admin Dashboard 메인 페이지 (POC - 기능 비활성화)
 */
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SADO PACS - POC Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          DICOMweb 표준 API 기반 PACS 시스템
        </p>
      </div>

      {/* POC 공지 */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">POC 단계 안내</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>현재 POC 단계에서는 DICOMweb 표준 API만 사용합니다.</p>
              <p className="mt-1">
                Admin 기능 (Dashboard 통계, Storage 모니터링, Tiering 관리)은 Gateway API가 필요하므로 비활성화되었습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 핵심 PACS 기능 링크 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">사용 가능한 기능</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Patients */}
          <Link
            to="/patients"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">환자 목록</h3>
                <p className="text-sm text-gray-500 mt-1">QIDO-RS 조회</p>
              </div>
            </div>
          </Link>

          {/* Studies */}
          <Link
            to="/studies"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Study 목록</h3>
                <p className="text-sm text-gray-500 mt-1">QIDO-RS 조회</p>
              </div>
            </div>
          </Link>

          {/* Upload */}
          <Link
            to="/upload"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Upload className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">파일 업로드</h3>
                <p className="text-sm text-gray-500 mt-1">STOW-RS 업로드</p>
              </div>
            </div>
          </Link>

          {/* Viewer */}
          <Link
            to="/studies"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Eye className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">DICOM 뷰어</h3>
                <p className="text-sm text-gray-500 mt-1">WADO-RS Rendered</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* DICOMweb API 정보 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">DICOMweb 표준 API 사용</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start">
            <span className="font-medium w-32">QIDO-RS:</span>
            <span>Study, Series, Instance 검색 및 조회</span>
          </div>
          <div className="flex items-start">
            <span className="font-medium w-32">WADO-RS:</span>
            <span>DICOM 이미지 프레임 렌더링 (멀티 슬롯 뷰어)</span>
          </div>
          <div className="flex items-start">
            <span className="font-medium w-32">STOW-RS:</span>
            <span>DICOM 파일 업로드</span>
          </div>
        </div>
      </div>

      {/* 비활성화된 기능 안내 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">비활성화된 기능 (Gateway API 필요)</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Dashboard 통계 (환자/Study/Series/Instance 수)</li>
          <li>스토리지 사용량 모니터링</li>
          <li>Storage Tier 분포 차트</li>
          <li>SeaweedFS 용량 관리</li>
          <li>Tiering 정책 관리</li>
        </ul>
      </div>
    </div>
  )
}
