/**
 * SeaweedFSManagePage.tsx
 *
 * SeaweedFS 파일시스템 관리 페이지 (정보성)
 *
 * 기능:
 * - SeaweedFS 구성 정보 표시
 * - 계획된 기능 안내
 */

import { Database, Server, Cloud, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react'

/**
 * SeaweedFS 관리 페이지 (정보성 대시보드)
 */
export default function SeaweedFSManagePage() {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          SeaweedFS 파일시스템 관리
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          분산 파일시스템 구성 정보 및 관리 기능 (Backend API 개발 예정)
        </p>
      </div>

      {/* 현재 구성 정보 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 rounded-lg p-3">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">
              현재 SeaweedFS 구성
            </h3>
            <p className="text-sm text-gray-600">S3 Compatible Storage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* 스토리지 타입 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Cloud className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-900">
                스토리지 타입
              </h4>
            </div>
            <p className="text-2xl font-bold text-gray-900">S3</p>
            <p className="text-xs text-gray-600 mt-1">
              S3 Compatible Object Storage
            </p>
          </div>

          {/* 통합 방식 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Server className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-900">통합 방식</h4>
            </div>
            <p className="text-2xl font-bold text-gray-900">Direct</p>
            <p className="text-xs text-gray-600 mt-1">
              Backend에서 직접 S3 API 사용
            </p>
          </div>

          {/* 사용 용도 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-900">사용 용도</h4>
            </div>
            <p className="text-2xl font-bold text-gray-900">DICOM</p>
            <p className="text-xs text-gray-600 mt-1">DICOM 파일 저장 전용</p>
          </div>
        </div>

        {/* 환경 정보 안내 */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>참고:</strong> SeaweedFS 접속 정보는 Backend 설정 파일 (<code>application.yml</code>)에서 관리됩니다.
          </p>
        </div>
      </div>

      {/* 계획된 기능 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="bg-amber-100 rounded-lg p-3">
            <Calendar className="h-6 w-6 text-amber-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">
              개발 예정 기능
            </h3>
            <p className="text-sm text-gray-600">Week 11-13 목표</p>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">
                Volume 상태 모니터링
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Volume 사용량, Replication 상태, 노드 Health Check
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">
                Filer 디렉토리 브라우저
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                파일 및 디렉토리 구조 탐색, 검색, 다운로드
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">
                Volume 관리
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Volume 추가/삭제, Replication 설정, 용량 조정
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">
                클러스터 모니터링
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Master/Volume/Filer 노드 상태, 클러스터 전체 Health Check
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Backend API 개발 필요 안내 */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-orange-800 mb-2">
              Backend API 개발 필요
            </h3>
            <p className="text-sm text-orange-700 mb-3">
              아래 Backend API 개발이 완료되면 본격적인 관리 기능을 제공할 예정입니다:
            </p>
            <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
              <li>
                <code className="bg-orange-100 px-1 py-0.5 rounded">
                  GET /api/admin/seaweedfs/volumes
                </code>{' '}
                - Volume 목록 조회
              </li>
              <li>
                <code className="bg-orange-100 px-1 py-0.5 rounded">
                  GET /api/admin/seaweedfs/filer/ls
                </code>{' '}
                - Filer 디렉토리 조회
              </li>
              <li>
                <code className="bg-orange-100 px-1 py-0.5 rounded">
                  GET /api/admin/seaweedfs/cluster
                </code>{' '}
                - 클러스터 상태
              </li>
              <li>
                <code className="bg-orange-100 px-1 py-0.5 rounded">
                  POST /api/admin/seaweedfs/volumes
                </code>{' '}
                - Volume 생성
              </li>
              <li>
                <code className="bg-orange-100 px-1 py-0.5 rounded">
                  DELETE /api/admin/seaweedfs/volumes/:id
                </code>{' '}
                - Volume 삭제
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
