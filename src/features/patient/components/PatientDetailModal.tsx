/**
 * PatientDetailModal.tsx
 *
 * 환자 상세 정보 모달 컴포넌트
 *
 * 기능:
 * - 환자 상세 정보 표시
 * - Study 목록으로 이동 버튼
 * - ESC 키로 닫기
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, User, Calendar, Building2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Patient, Gender } from '../types/patient'

// Gender 표시 라벨
const GENDER_LABELS: Record<Gender, string> = {
  M: '남성',
  F: '여성',
  O: '기타',
  U: '알 수 없음',
}

// Gender 색상 스타일
const GENDER_COLORS: Record<Gender, string> = {
  M: 'bg-blue-100 text-blue-800',
  F: 'bg-pink-100 text-pink-800',
  O: 'bg-purple-100 text-purple-800',
  U: 'bg-gray-100 text-gray-800',
}

interface PatientDetailModalProps {
  patient: Patient
  onClose: () => void
}

export default function PatientDetailModal({
  patient,
  onClose,
}: PatientDetailModalProps) {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleViewStudies = () => {
    navigate(`/studies?patientId=${patient.dicomPatientId}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-detail-modal-title"
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2
            id="patient-detail-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            환자 상세 정보
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="모달 닫기"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4 space-y-4">
          {/* 환자 ID */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Patient ID</p>
              <p className="font-medium text-gray-900">
                {patient.dicomPatientId}
              </p>
            </div>
          </div>

          {/* 이름 및 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">이름</p>
              <p className="font-medium text-gray-900">{patient.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">나이</p>
              <p className="font-medium text-gray-900">{patient.age}세</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">성별</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  GENDER_COLORS[patient.gender] || GENDER_COLORS.U
                }`}
              >
                {GENDER_LABELS[patient.gender] || GENDER_LABELS.U}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">내부 ID</p>
              <p className="font-medium text-gray-900 font-mono text-sm">
                {patient.id}
              </p>
            </div>
          </div>

          {/* 발급 기관 */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              <Building2 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">발급 기관</p>
              <p className="font-medium text-gray-900">{patient.issuer}</p>
            </div>
          </div>

          {/* Study 정보 */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Study 정보</p>
              <p className="font-medium text-gray-900">
                {patient.studiesCount !== undefined ? `총 ${patient.studiesCount}개의 Study` : 'N/A'}
              </p>
            </div>
          </div>

          {/* 최근 Study 날짜 */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">최근 Study</p>
              <p className="font-medium text-gray-900">
                {patient.lastStudyDate || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleViewStudies}>
            <FileText className="h-4 w-4 mr-2" />
            Study 목록 보기
          </Button>
        </div>
      </div>
    </div>
  )
}
