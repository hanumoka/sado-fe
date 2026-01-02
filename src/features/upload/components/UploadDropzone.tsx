import { useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadConfig } from '@/lib/config'

/**
 * UploadDropzone.tsx
 *
 * DICOM 파일 드래그 앤 드롭 영역
 *
 * 기능:
 * - 파일/폴더 드래그 앤 드롭
 * - 클릭하여 파일 선택
 * - .dcm, .dicom, 확장자 없는 DICOM 파일 허용
 * - 다중 파일 업로드 지원
 * - 폴더 업로드 지원
 */

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export default function UploadDropzone({
  onFilesSelected,
  disabled = false,
}: UploadDropzoneProps) {
  const folderInputRef = useRef<HTMLInputElement>(null)

  const filterDicomFiles = (files: File[]): File[] => {
    return files.filter((file) => {
      const name = file.name.toLowerCase()

      // 1. 허용 확장자 체크 (.dcm, .dicom)
      const hasAllowedExtension = uploadConfig.allowedExtensions.some((ext) =>
        name.endsWith(ext)
      )
      if (hasAllowedExtension) return true

      // 2. 확장자 없는 파일 (숨김 파일 제외)
      const hasNoExtension =
        !name.includes('.') || (name.lastIndexOf('.') === 0 && name.length > 1)
      if (hasNoExtension && !name.startsWith('.')) return true

      return false
    })
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const dicomFiles = filterDicomFiles(acceptedFiles)
      if (dicomFiles.length > 0) {
        onFilesSelected(dicomFiles)
      }
    },
    [onFilesSelected]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
    useDropzone({
      onDrop,
      accept: {
        'application/dicom': ['.dcm', '.dicom'],
        'application/octet-stream': ['.dcm', '.dicom', ''],
      },
      disabled,
      multiple: true,
      noClick: false,
      noKeyboard: false,
    })

  const handleFolderSelect = () => {
    folderInputRef.current?.click()
  }

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const fileArray = Array.from(files)
      const dicomFiles = filterDicomFiles(fileArray)
      if (dicomFiles.length > 0) {
        onFilesSelected(dicomFiles)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* 폴더 선택 input (hidden) */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is a valid attribute
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderChange}
        className="hidden"
        disabled={disabled}
      />

      {/* 드롭존 */}
      <div
        {...getRootProps()}
        className={`
          border-2
          border-dashed
          rounded-lg
          p-12
          text-center
          transition-colors
          cursor-pointer
          ${
            isDragActive && !isDragReject
              ? 'border-blue-500 bg-blue-50'
              : isDragReject
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {isDragActive ? (
            isDragReject ? (
              <>
                <FileText className="h-16 w-16 text-red-500" />
                <p className="text-lg font-medium text-red-700">
                  DICOM 파일(.dcm, .dicom, 확장자 없음)만 업로드 가능합니다
                </p>
              </>
            ) : (
              <>
                <Upload className="h-16 w-16 text-blue-600 animate-bounce" />
                <p className="text-lg font-medium text-blue-700">
                  파일을 여기에 놓으세요
                </p>
              </>
            )
          ) : (
            <>
              <div className="flex gap-4">
                <Upload className="h-16 w-16 text-gray-400" />
                <FolderOpen className="h-16 w-16 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  DICOM 파일을 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  .dcm, .dicom 파일 또는 폴더를 선택할 수 있습니다 (다중 선택 가능)
                </p>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="bg-blue-100 px-4 py-2 rounded-md">
                  <p className="text-sm font-medium text-blue-800">
                    지원 형식: .dcm, .dicom, 확장자 없음
                  </p>
                </div>
                <div className="bg-green-100 px-4 py-2 rounded-md">
                  <p className="text-sm font-medium text-green-800">
                    다중 파일 업로드
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => open()} disabled={disabled}>
          <Upload className="h-4 w-4 mr-2" />
          파일 선택
        </Button>
        <Button
          variant="outline"
          onClick={handleFolderSelect}
          disabled={disabled}
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          폴더 선택
        </Button>
      </div>
    </div>
  )
}
