import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FolderOpen } from 'lucide-react';

/**
 * UploadDropzone.tsx
 *
 * DICOM 파일 드래그 앤 드롭 영역
 *
 * 목적:
 * - 파일/폴더 드래그 앤 드롭
 * - 클릭하여 파일 선택
 * - .dcm 파일만 허용
 * - 다중 파일 업로드 지원
 */

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function UploadDropzone({
  onFilesSelected,
  disabled = false,
}: UploadDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        'application/dicom': ['.dcm'],
        'application/octet-stream': ['.dcm'],
      },
      disabled,
      multiple: true,
    });

  return (
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
                .dcm 파일만 업로드 가능합니다
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
                .dcm 파일 또는 폴더를 선택할 수 있습니다 (다중 선택 가능)
              </p>
            </div>
            <div className="flex gap-4 mt-4">
              <div className="bg-blue-100 px-4 py-2 rounded-md">
                <p className="text-sm font-medium text-blue-800">
                  지원 형식: .dcm
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
  );
}
