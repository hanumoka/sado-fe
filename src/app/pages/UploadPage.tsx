import { Link } from 'react-router-dom'
import { Upload as UploadIcon, ArrowRight } from 'lucide-react'
import UploadDropzone from '@/features/upload/components/UploadDropzone'
import UploadProgress from '@/features/upload/components/UploadProgress'
import UploadResult from '@/features/upload/components/UploadResult'
import { useUploadDicom } from '@/features/upload/hooks/useUploadDicom'
import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'

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

  const handleFilesSelected = (files: File[]) => {
    uploadDicomFiles(files)
  }

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

      {/* 업로드 영역 (업로드 중이 아닐 때만 표시) */}
      {!isUploading && !isComplete && (
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
