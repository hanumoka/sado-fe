import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { Upload as UploadIcon, ArrowRight, Building2 } from 'lucide-react'
import UploadDropzone from '@/features/upload/components/UploadDropzone'
import UploadProgress from '@/features/upload/components/UploadProgress'
import UploadResult from '@/features/upload/components/UploadResult'
import FilePreview from '@/features/upload/components/FilePreview'
import { useUploadDicom } from '@/features/upload/hooks/useUploadDicom'
import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PreviewFile } from '@/features/upload/types/upload'

/**
 * UploadPage.tsx
 *
 * DICOM 파일 업로드 페이지
 *
 * 기능:
 * 1. UploadDropzone (드래그 앤 드롭, 폴더 지원)
 * 2. UploadProgress (진행 상태 표시)
 * 3. UploadResult (결과 요약)
 * 4. 병렬 업로드 (동시 3개)
 * 5. 실패한 파일 재시도
 * 6. 멀티테넌시 지원 (Tenant ID 입력)
 */
export default function UploadPage() {
  const {
    uploadFiles,
    isUploading,
    summary,
    uploadDicomFiles,
    clearUploadFiles,
    retryFailed,
  } = useUploadDicom()

  // 프리뷰 모드 상태
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([])
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  // 멀티테넌시: Tenant ID 상태
  const [tenantId, setTenantId] = useState<string>('1')

  // 파일 선택 시 프리뷰 모드로 전환
  const handleFilesSelected = useCallback((files: File[]) => {
    const preview: PreviewFile[] = files.map((file) => ({
      id: uuidv4(),
      file,
      name: file.name,
      size: file.size,
      relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      selected: true,
    }))
    setPreviewFiles(preview)
    setIsPreviewMode(true)
  }, [])

  // 개별 파일 선택/해제 토글
  const handleToggleFile = useCallback((fileId: string) => {
    setPreviewFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, selected: !f.selected } : f))
    )
  }, [])

  // 전체 선택
  const handleSelectAll = useCallback(() => {
    setPreviewFiles((prev) => prev.map((f) => ({ ...f, selected: true })))
  }, [])

  // 전체 해제
  const handleDeselectAll = useCallback(() => {
    setPreviewFiles((prev) => prev.map((f) => ({ ...f, selected: false })))
  }, [])

  // 프리뷰 확인 → 업로드 시작
  const handlePreviewConfirm = useCallback((selectedFiles: File[]) => {
    setIsPreviewMode(false)
    setPreviewFiles([])
    // tenantId가 유효한 숫자인 경우에만 전달
    const parsedTenantId = tenantId.trim() ? parseInt(tenantId, 10) : undefined
    uploadDicomFiles(selectedFiles, {
      tenantId: !isNaN(parsedTenantId!) ? parsedTenantId : undefined,
    })
  }, [uploadDicomFiles, tenantId])

  // 프리뷰 취소
  const handlePreviewCancel = useCallback(() => {
    setIsPreviewMode(false)
    setPreviewFiles([])
  }, [])

  const hasFiles = uploadFiles.length > 0
  const hasFailedFiles = uploadFiles.some((f) => f.status === 'error')
  const isComplete = hasFiles && !isUploading && summary !== null

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <PageHeader
        icon={UploadIcon}
        title="DICOM 업로드"
        description="DICOM 파일을 선택하여 PACS에 업로드하세요. 폴더 전체를 업로드할 수도 있습니다."
      />

      {/* 안내 사항 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          업로드 안내
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>DICOM 파일(.dcm, .dicom, 확장자 없음)을 업로드할 수 있습니다</li>
          <li>파일을 드래그 앤 드롭하거나 클릭하여 선택하세요</li>
          <li>폴더를 선택하면 폴더 내 모든 DICOM 파일이 업로드됩니다</li>
          <li className="font-semibold">
            한 번에 최대 100개, 총 2GB까지 업로드 가능 (개별 파일 최대 500MB)
          </li>
          <li>최대 3개 파일이 동시에 업로드됩니다</li>
        </ul>
      </div>

      {/* 멀티테넌시: Tenant ID 설정 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            테넌트 설정 (멀티테넌시)
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="tenantId" className="text-sm text-gray-600">
              Tenant ID
            </Label>
            <Input
              id="tenantId"
              type="number"
              min="1"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="1"
              className="mt-1"
              disabled={isUploading}
            />
          </div>
          <p className="text-xs text-gray-500 mt-5">
            데이터가 저장될 테넌트(병원/기관)를 지정합니다. 기본값: 1
          </p>
        </div>
      </div>

      {/* 파일 프리뷰 (폴더 선택 후) */}
      {isPreviewMode && (
        <FilePreview
          files={previewFiles}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
          onToggleFile={handleToggleFile}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />
      )}

      {/* 업로드 영역 (프리뷰 모드, 업로드 중, 완료가 아닐 때만 표시) */}
      {!isPreviewMode && !isUploading && !isComplete && (
        <UploadDropzone
          onFilesSelected={handleFilesSelected}
          disabled={isUploading}
        />
      )}

      {/* 업로드 진행 상태 */}
      {hasFiles && <UploadProgress files={uploadFiles} />}

      {/* 업로드 결과 요약 */}
      {isComplete && summary && (
        <UploadResult
          summary={summary}
          onRetryFailed={hasFailedFiles ? retryFailed : undefined}
          onClear={clearUploadFiles}
          hasFailedFiles={hasFailedFiles}
        />
      )}

      {/* 성공 시 다음 단계 안내 */}
      {isComplete && summary && summary.successCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            업로드가 완료되었습니다!
          </h3>
          <p className="text-sm text-green-800 mb-4">
            {summary.successCount}개의 DICOM 파일이 성공적으로 업로드되었습니다.
            환자 목록에서 업로드된 데이터를 확인할 수 있습니다.
          </p>
          <Link to="/patients">
            <Button>
              환자 목록 보기
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
