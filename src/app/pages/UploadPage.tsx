import { Upload as UploadIcon, RefreshCw } from 'lucide-react';
import UploadDropzone from '@/features/upload/components/UploadDropzone';
import UploadProgress from '@/features/upload/components/UploadProgress';
import { useUploadDicom } from '@/features/upload/hooks/useUploadDicom';

/**
 * UploadPage.tsx
 *
 * DICOM 파일 업로드 페이지
 *
 * 통합:
 * 1. UploadDropzone (드래그 앤 드롭 영역)
 * 2. UploadProgress (진행 상태 표시)
 * 3. useUploadDicom Hook (업로드 로직)
 */
export default function UploadPage() {
  const {
    uploadFiles,
    isUploading,
    uploadDicomFiles,
    clearUploadFiles,
  } = useUploadDicom();

  const handleFilesSelected = (files: File[]) => {
    uploadDicomFiles(files);
  };

  const handleReset = () => {
    clearUploadFiles();
  };

  // 전체 통계
  const totalFiles = uploadFiles.length;
  const successCount = uploadFiles.filter((f) => f.status === 'success').length;
  const errorCount = uploadFiles.filter((f) => f.status === 'error').length;
  const isAllComplete =
    totalFiles > 0 &&
    uploadFiles.every((f) => f.status === 'success' || f.status === 'error');

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UploadIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DICOM 업로드</h1>
            <p className="mt-1 text-sm text-gray-600">
              DICOM 파일을 선택하여 PACS에 업로드하세요
            </p>
          </div>
        </div>

        {/* 초기화 버튼 */}
        {isAllComplete && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            새로 업로드
          </button>
        )}
      </div>

      {/* 안내 사항 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          업로드 안내
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>DICOM 파일(.dcm)만 업로드 가능합니다</li>
          <li>파일을 드래그 앤 드롭하거나 클릭하여 선택하세요</li>
          <li>여러 파일을 동시에 선택할 수 있습니다</li>
          <li>업로드된 파일은 SeaweedFS에 저장됩니다</li>
        </ul>
      </div>

      {/* 업로드 영역 */}
      <UploadDropzone
        onFilesSelected={handleFilesSelected}
        disabled={isUploading}
      />

      {/* 업로드 진행 상태 */}
      {uploadFiles.length > 0 && <UploadProgress files={uploadFiles} />}

      {/* 완료 요약 */}
      {isAllComplete && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            업로드 완료
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
              <p className="text-sm text-gray-600 mt-1">전체 파일</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {successCount}
              </p>
              <p className="text-sm text-green-700 mt-1">성공</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{errorCount}</p>
              <p className="text-sm text-red-700 mt-1">실패</p>
            </div>
          </div>

          {/* 성공 시 다음 단계 안내 */}
          {successCount > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {successCount}개의 DICOM 파일이 성공적으로 업로드되었습니다.
                <br />
                <a
                  href="/patients"
                  className="text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  환자 목록
                </a>
                에서 확인하실 수 있습니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
