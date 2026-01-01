import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { UploadFile, UploadResponse } from '../types/upload';

/**
 * useUploadDicom.ts
 *
 * DICOM 파일 업로드 Hook
 *
 * 목적:
 * - 다중 파일 업로드 관리
 * - 각 파일의 진행 상태 추적
 * - API 호출 및 에러 처리
 */

export function useUploadDicom() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * 파일 업로드 시작
   */
  const uploadDicomFiles = async (files: File[]) => {
    // 업로드 파일 목록 초기화
    const newUploadFiles: UploadFile[] = files.map((file) => ({
      file,
      id: uuidv4(),
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0,
    }));

    setUploadFiles(newUploadFiles);
    setIsUploading(true);

    // 각 파일을 순차적으로 업로드
    for (const uploadFile of newUploadFiles) {
      await uploadSingleFile(uploadFile);
    }

    setIsUploading(false);
  };

  /**
   * 단일 파일 업로드
   */
  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      // 상태를 'uploading'으로 변경
      updateFileStatus(uploadFile.id, 'uploading', 0);

      // FormData 생성
      const formData = new FormData();
      formData.append('file', uploadFile.file);

      // API 호출 (XMLHttpRequest로 진행률 추적)
      await uploadWithProgress(uploadFile.id, formData);

      // 성공 시 상태 업데이트
      updateFileStatus(uploadFile.id, 'success', 100);
    } catch (error) {
      // 실패 시 상태 업데이트
      const errorMessage =
        error instanceof Error ? error.message : '업로드 실패';
      updateFileStatus(uploadFile.id, 'error', 0, errorMessage);
    }
  };

  /**
   * 진행률 추적이 가능한 업로드
   */
  const uploadWithProgress = (
    fileId: string,
    formData: FormData
  ): Promise<UploadResponse> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 진행률 이벤트
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          updateFileProgress(fileId, progress);
        }
      });

      // 완료 이벤트
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response: UploadResponse = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('응답 파싱 실패'));
          }
        } else {
          reject(new Error(`서버 오류: ${xhr.status}`));
        }
      });

      // 에러 이벤트
      xhr.addEventListener('error', () => {
        reject(new Error('네트워크 오류'));
      });

      // 타임아웃 이벤트
      xhr.addEventListener('timeout', () => {
        reject(new Error('요청 시간 초과'));
      });

      // API 엔드포인트 (환경 변수에서 읽기)
      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || 'http://localhost:10200';
      const uploadUrl = `${apiBaseUrl}/api/instances/upload`;

      xhr.open('POST', uploadUrl);

      // Authorization 헤더 추가 (authStore에서 토큰 가져오기)
      // const token = useAuthStore.getState().token;
      // if (token) {
      //   xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      // }

      xhr.timeout = 60000; // 60초 타임아웃
      xhr.send(formData);
    });
  };

  /**
   * 파일 상태 업데이트
   */
  const updateFileStatus = (
    fileId: string,
    status: UploadFile['status'],
    progress: number,
    error?: string
  ) => {
    setUploadFiles((prev) =>
      prev.map((file) =>
        file.id === fileId
          ? { ...file, status, progress, error }
          : file
      )
    );
  };

  /**
   * 파일 진행률 업데이트
   */
  const updateFileProgress = (fileId: string, progress: number) => {
    setUploadFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, progress } : file
      )
    );
  };

  /**
   * 업로드 목록 초기화
   */
  const clearUploadFiles = () => {
    setUploadFiles([]);
  };

  return {
    uploadFiles,
    isUploading,
    uploadDicomFiles,
    clearUploadFiles,
  };
}
