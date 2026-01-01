import { Settings, Database, HardDrive, Activity } from 'lucide-react'

/**
 * Dashboard.tsx
 *
 * Admin 대시보드 (통합)
 *
 * Admin만 접속 가능한 시스템이므로
 * 일반 대시보드와 Admin 대시보드를 통합하여 구성
 *
 * 주요 기능:
 * - 시스템 전체 통계 (환자, Study, Series, Instance)
 * - 시스템 상태 모니터링
 * - 빠른 링크 (Admin 기능 바로가기)
 */
export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin 대시보드</h1>
        <p className="mt-2 text-sm text-gray-600">
          MiniPACS 시스템 관리 및 모니터링
        </p>
      </div>

      {/* 통계 카드 (Week 3+ 추가 예정) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">총 환자 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">10</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">총 Study 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">5</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">총 Series 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">3</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">총 Instance 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">3</p>
        </div>
      </div>

      {/* 시스템 상태 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-900">시스템 상태</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">PACS 서버</p>
              <p className="text-xs text-gray-600">정상 작동</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">SeaweedFS</p>
              <p className="text-xs text-gray-600">정상 작동</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">데이터베이스</p>
              <p className="text-xs text-gray-600">정상 작동</p>
            </div>
          </div>
        </div>
      </div>

      {/* 관리 기능 빠른 링크 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-900">관리 기능</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/seaweedfs"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">파일시스템 관리</h3>
            </div>
            <p className="text-sm text-gray-600">
              SeaweedFS Volume 및 클러스터 관리
            </p>
            <p className="text-xs text-yellow-600 mt-2">Week 11-13 예정</p>
          </a>

          <a
            href="/admin/storage-monitoring"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <HardDrive className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">스토리지 모니터링</h3>
            </div>
            <p className="text-sm text-gray-600">
              스토리지 사용량 및 Tier 분포 확인
            </p>
            <p className="text-xs text-yellow-600 mt-2">Week 14-15 예정</p>
          </a>

          <a
            href="/admin/tiering"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Tier 관리</h3>
            </div>
            <p className="text-sm text-gray-600">
              Hot/Warm/Cold 스토리지 계층화 설정
            </p>
            <p className="text-xs text-yellow-600 mt-2">Week 15-16 예정</p>
          </a>
        </div>
      </div>

      {/* Phase 1 완성 현황 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Phase 1 (Core PACS) 완성 현황
        </h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>DICOM 업로드 → SeaweedFS 저장</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>Patient/Study 조회 및 검색</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>Study Detail → Series 목록 표시</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>DICOM Viewer 렌더링 (Cornerstone3D + WADO-RS 연동 대기)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>Admin Coming Soon 페이지 (Phase 2 준비)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
