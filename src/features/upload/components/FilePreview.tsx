import { useMemo } from 'react'
import { CheckSquare, Square, File, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PreviewFile, PreviewSummary } from '../types/upload'

/**
 * FilePreview.tsx
 *
 * 폴더 선택 후 업로드될 DICOM 파일 목록 미리보기
 *
 * 기능:
 * - 감지된 DICOM 파일 목록 표시 (스크롤 가능)
 * - 개별 파일 선택/해제 (체크박스)
 * - 전체 선택/해제 버튼
 * - 파일 수, 크기 요약 정보
 * - 확인/취소 버튼
 */

interface FilePreviewProps {
  files: PreviewFile[]
  onConfirm: (selectedFiles: File[]) => void
  onCancel: () => void
  onToggleFile: (fileId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

export default function FilePreview({
  files,
  onConfirm,
  onCancel,
  onToggleFile,
  onSelectAll,
  onDeselectAll,
}: FilePreviewProps) {
  // 요약 정보 계산
  const summary: PreviewSummary = useMemo(() => {
    const selectedFiles = files.filter((f) => f.selected)
    return {
      totalFiles: files.length,
      selectedFiles: selectedFiles.length,
      totalSize: files.reduce((acc, f) => acc + f.size, 0),
      selectedSize: selectedFiles.reduce((acc, f) => acc + f.size, 0),
    }
  }, [files])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const handleConfirm = () => {
    const selectedFiles = files.filter((f) => f.selected).map((f) => f.file)
    onConfirm(selectedFiles)
  }

  const allSelected = files.every((f) => f.selected)
  const noneSelected = files.every((f) => !f.selected)

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* 헤더 */}
      <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              DICOM 파일 감지됨
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {summary.selectedFiles}/{summary.totalFiles}개 선택됨 (
              {formatFileSize(summary.selectedSize)})
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              disabled={allSelected}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              전체 선택
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
              disabled={noneSelected}
            >
              <Square className="h-4 w-4 mr-1" />
              전체 해제
            </Button>
          </div>
        </div>
      </div>

      {/* 파일 목록 */}
      <div className="max-h-80 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className={`flex items-center px-4 py-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
              file.selected ? 'bg-blue-50' : ''
            }`}
            onClick={() => onToggleFile(file.id)}
          >
            {/* 체크박스 */}
            <div className="flex-shrink-0 mr-3">
              {file.selected ? (
                <CheckSquare className="h-5 w-5 text-blue-600" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
            </div>

            {/* 파일 아이콘 */}
            <File className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />

            {/* 파일 정보 */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm truncate ${file.selected ? 'text-gray-900' : 'text-gray-500'}`}
                title={file.relativePath}
              >
                {file.relativePath}
              </p>
            </div>

            {/* 파일 크기 */}
            <div className="flex-shrink-0 ml-4">
              <p className="text-sm text-gray-500">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 푸터 (버튼) */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 {formatFileSize(summary.totalSize)}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={summary.selectedFiles === 0}>
              <Upload className="h-4 w-4 mr-1" />
              {summary.selectedFiles}개 파일 업로드
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
