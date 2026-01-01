/**
 * StudyMetadata.tsx
 *
 * Study 메타데이터 표시 컴포넌트
 *
 * 기능:
 * - Study 상세 정보를 카드 형태로 표시
 * - 구조화된 레이아웃
 */

import { Calendar, Clock, User, FileText, Layers, Image } from 'lucide-react'
import type { Study } from '@/types'
import { getModalityBadgeColor } from '@/constants/modality'

interface StudyMetadataProps {
  study: Study
}

interface MetadataItemProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}

function MetadataItem({ icon, label, value }: MetadataItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <div className="font-medium text-gray-900">{value}</div>
      </div>
    </div>
  )
}

export default function StudyMetadata({ study }: StudyMetadataProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Study 정보</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 환자 정보 */}
        <MetadataItem
          icon={<User className="h-5 w-5 text-gray-600" />}
          label="환자 이름"
          value={study.patientName}
        />

        {/* 검사 날짜 */}
        <MetadataItem
          icon={<Calendar className="h-5 w-5 text-gray-600" />}
          label="검사 날짜"
          value={study.studyDate}
        />

        {/* 검사 시간 */}
        <MetadataItem
          icon={<Clock className="h-5 w-5 text-gray-600" />}
          label="검사 시간"
          value={study.studyTime}
        />

        {/* Modality */}
        <MetadataItem
          icon={<FileText className="h-5 w-5 text-gray-600" />}
          label="Modality"
          value={
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModalityBadgeColor(study.modality)}`}
            >
              {study.modality}
            </span>
          }
        />

        {/* Series 수 */}
        <MetadataItem
          icon={<Layers className="h-5 w-5 text-gray-600" />}
          label="Series 수"
          value={`${study.seriesCount}개`}
        />

        {/* Instance 수 */}
        <MetadataItem
          icon={<Image className="h-5 w-5 text-gray-600" />}
          label="이미지 수"
          value={`${study.instancesCount}개`}
        />
      </div>

      {/* Study 설명 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Study 설명</p>
            <p className="font-medium text-gray-900">
              {study.studyDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Study Instance UID */}
      <div className="mt-4">
        <p className="text-sm text-gray-500 mb-1">Study Instance UID</p>
        <p className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded">
          {study.studyInstanceUid}
        </p>
      </div>
    </div>
  )
}
