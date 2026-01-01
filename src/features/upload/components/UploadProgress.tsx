import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import type { UploadFile } from '../types/upload';

/**
 * UploadProgress.tsx
 *
 * 업로드 진행 상태 표시 컴포넌트
 *
 * 목적:
 * - 각 파일의 업로드 진행률 표시
 * - 상태별 아이콘 및 색상 구분
 * - 에러 메시지 표시
 */

interface UploadProgressProps {
  files: UploadFile[];
}

export default function UploadProgress({ files }: UploadProgressProps) {
  if (files.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          업로드 진행 상황
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          총 {files.length}개 파일
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {files.map((file) => (
          <div key={file.id} className="p-4">
            <div className="flex items-start gap-3">
              {/* 상태 아이콘 */}
              <div className="flex-shrink-0 mt-1">
                {file.status === 'pending' && (
                  <FileText className="h-5 w-5 text-gray-400" />
                )}
                {file.status === 'uploading' && (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                )}
                {file.status === 'success' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {file.status === 'error' && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>

              {/* 파일 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500 ml-2">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* 진행률 바 */}
                {(file.status === 'uploading' || file.status === 'success') && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">
                        {file.status === 'uploading'
                          ? '업로드 중...'
                          : '완료'}
                      </span>
                      <span className="text-xs font-medium text-gray-900">
                        {file.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          file.status === 'success'
                            ? 'bg-green-600'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 에러 메시지 */}
                {file.status === 'error' && file.error && (
                  <p className="mt-2 text-sm text-red-600">{file.error}</p>
                )}

                {/* 대기 상태 */}
                {file.status === 'pending' && (
                  <p className="mt-1 text-xs text-gray-500">대기 중...</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 전체 요약 */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            성공:{' '}
            <span className="font-medium text-green-600">
              {files.filter((f) => f.status === 'success').length}
            </span>
          </span>
          <span className="text-gray-600">
            실패:{' '}
            <span className="font-medium text-red-600">
              {files.filter((f) => f.status === 'error').length}
            </span>
          </span>
          <span className="text-gray-600">
            진행 중:{' '}
            <span className="font-medium text-blue-600">
              {files.filter((f) => f.status === 'uploading').length}
            </span>
          </span>
          <span className="text-gray-600">
            대기:{' '}
            <span className="font-medium text-gray-600">
              {files.filter((f) => f.status === 'pending').length}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
