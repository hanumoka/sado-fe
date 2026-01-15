/**
 * UploadResult.tsx
 *
 * 업로드 결과 요약 컴포넌트
 *
 * 기능:
 * - 업로드 결과 통계 표시
 * - 성공/실패 카운트
 * - 소요 시간 및 크기 정보
 */

import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/utils'
import type { UploadSummary } from '../types/upload'

interface UploadResultProps {
  summary: UploadSummary
  onRetryFailed?: () => void
  onClear?: () => void
  hasFailedFiles?: boolean
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}초`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}분 ${remainingSeconds}초`
}

export default function UploadResult({
  summary,
  onRetryFailed,
  onClear,
  hasFailedFiles = false,
}: UploadResultProps) {
  const isAllSuccess = summary.errorCount === 0
  const isAllFailed = summary.successCount === 0

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">업로드 결과</h3>
        <div className="flex items-center gap-2">
          {isAllSuccess ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              완료
            </span>
          ) : isAllFailed ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              <XCircle className="h-4 w-4" />
              실패
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              일부 실패
            </span>
          )}
        </div>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 전체 파일 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-sm">전체</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {summary.totalFiles}
          </p>
        </div>

        {/* 성공 */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">성공</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {summary.successCount}
          </p>
        </div>

        {/* 실패 */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">실패</span>
          </div>
          <p className="text-2xl font-bold text-red-700">
            {summary.errorCount}
          </p>
        </div>

        {/* 소요 시간 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">소요 시간</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {formatDuration(summary.duration)}
          </p>
        </div>
      </div>

      {/* 추가 정보 */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <div>
          전체 크기:{' '}
          <span className="font-medium">{formatBytes(summary.totalSize)}</span>
        </div>
        {summary.startTime && (
          <div>
            시작:{' '}
            <span className="font-medium">
              {summary.startTime.toLocaleTimeString()}
            </span>
          </div>
        )}
        {summary.endTime && (
          <div>
            종료:{' '}
            <span className="font-medium">
              {summary.endTime.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        {hasFailedFiles && onRetryFailed && (
          <Button variant="outline" onClick={onRetryFailed}>
            <RefreshCw className="h-4 w-4 mr-2" />
            실패한 파일 재시도
          </Button>
        )}
        {onClear && (
          <Button variant="outline" onClick={onClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            초기화
          </Button>
        )}
      </div>
    </div>
  )
}
