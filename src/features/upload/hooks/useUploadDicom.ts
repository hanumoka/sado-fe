import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { uploadConfig } from '@/lib/config'
import { storeInstance } from '@/lib/services/dicomWebService'
import type { UploadFile, UploadResponse, UploadSummary } from '../types/upload'

/**
 * useUploadDicom.ts
 *
 * DICOM 파일 업로드 Hook
 *
 * 기능:
 * - 다중 파일 업로드 관리
 * - 병렬 업로드 (동시 N개)
 * - 각 파일의 진행 상태 추적
 * - 업로드 결과 요약
 * - 업로드 완료 후 관련 캐시 무효화 (patients, studies)
 * - 멀티테넌시 지원 (X-Tenant-Id 헤더)
 */

/**
 * 업로드 옵션
 */
export interface UploadOptions {
  /**
   * 테넌트 ID (멀티테넌시)
   * 지정하지 않으면 서버 기본값(1) 사용
   */
  tenantId?: number | string
}

export function useUploadDicom() {
  const queryClient = useQueryClient()
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [summary, setSummary] = useState<UploadSummary | null>(null)

  // 현재 업로드에 사용할 tenantId (ref로 저장하여 콜백에서 참조)
  const currentTenantIdRef = useRef<number | string | undefined>(undefined)

  /**
   * 파일 상태 업데이트
   */
  const updateFileStatus = useCallback(
    (
      fileId: string,
      status: UploadFile['status'],
      progress: number,
      error?: string,
      response?: UploadResponse
    ) => {
      setUploadFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? { ...file, status, progress, error, response }
            : file
        )
      )
    },
    []
  )

  /**
   * 파일 진행률 업데이트
   */
  const updateFileProgress = useCallback((fileId: string, progress: number) => {
    setUploadFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, progress } : file))
    )
  }, [])

  /**
   * 실제 업로드 (STOW-RS 사용)
   */
  const realUpload = useCallback(
    async (fileId: string, file: File): Promise<UploadResponse> => {
      const result = await storeInstance(file, {
        tenantId: currentTenantIdRef.current,
        onProgress: (progress) => {
          updateFileProgress(fileId, progress)
        },
      })

      if (result.success) {
        // 성공
        return {
          success: true,
          message: '업로드 성공',
          studyInstanceUid: result.studyInstanceUid,
          seriesInstanceUid: result.seriesInstanceUid,
          sopInstanceUid: result.sopInstanceUid,
        }
      } else {
        // 에러 (409, 413, 415, 422)
        throw new Error(result.error || '업로드 실패')
      }
    },
    [updateFileProgress]
  )

  /**
   * 단일 파일 업로드 (STOW-RS)
   */
  const uploadSingleFile = useCallback(
    async (uploadFile: UploadFile): Promise<void> => {
      try {
        updateFileStatus(uploadFile.id, 'uploading', 0)

        const response = await realUpload(uploadFile.id, uploadFile.file)

        updateFileStatus(uploadFile.id, 'success', 100, undefined, response)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '업로드 실패'
        updateFileStatus(uploadFile.id, 'error', 0, errorMessage)
      }
    },
    [updateFileStatus, realUpload]
  )

  /**
   * 병렬 업로드 (동시 N개)
   */
  const uploadInParallel = useCallback(
    async (files: UploadFile[]): Promise<void> => {
      const queue = [...files]
      const uploading: Promise<void>[] = []

      const uploadNext = async (): Promise<void> => {
        if (queue.length === 0) return

        const file = queue.shift()!
        await uploadSingleFile(file)

        // 큐에 남은 파일이 있으면 계속 업로드
        if (queue.length > 0) {
          await uploadNext()
        }
      }

      // 동시에 concurrentUploads 개의 업로드 시작
      for (
        let i = 0;
        i < Math.min(uploadConfig.concurrentUploads, files.length);
        i++
      ) {
        uploading.push(uploadNext())
      }

      await Promise.all(uploading)
    },
    [uploadSingleFile]
  )

  /**
   * 파일 업로드 시작
   *
   * @param files 업로드할 파일 목록
   * @param options 업로드 옵션 (tenantId 등)
   */
  const uploadDicomFiles = useCallback(
    async (files: File[], options?: UploadOptions) => {
      // tenantId를 ref에 저장 (콜백에서 참조)
      currentTenantIdRef.current = options?.tenantId
      // ========== 업로드 정책 검증 ==========

      // 1. 파일 개수 검증 (최대 100개)
      if (files.length > uploadConfig.maxFileCount) {
        alert(
          `한 번에 최대 ${uploadConfig.maxFileCount}개의 파일만 업로드할 수 있습니다.\n` +
            `현재 선택: ${files.length}개\n` +
            `초과: ${files.length - uploadConfig.maxFileCount}개`
        )
        return
      }

      // 2. 개별 파일 크기 검증 (각 최대 500MB)
      const oversizedFiles = files.filter(
        (file) => file.size > uploadConfig.maxFileSize
      )
      if (oversizedFiles.length > 0) {
        const maxSizeMB = Math.round(uploadConfig.maxFileSize / (1024 * 1024))
        alert(
          `다음 파일이 최대 크기(${maxSizeMB}MB)를 초과합니다:\n` +
            oversizedFiles
              .map((f) => `- ${f.name} (${Math.round(f.size / (1024 * 1024))}MB)`)
              .join('\n')
        )
        return
      }

      // 3. 전체 크기 검증 (최대 2GB)
      const totalSize = files.reduce((acc, file) => acc + file.size, 0)
      if (totalSize > uploadConfig.maxTotalSize) {
        const totalSizeMB = Math.round(totalSize / (1024 * 1024))
        const maxTotalSizeMB = Math.round(
          uploadConfig.maxTotalSize / (1024 * 1024)
        )
        alert(
          `전체 파일 크기가 최대 크기(${maxTotalSizeMB}MB)를 초과합니다.\n` +
            `현재 크기: ${totalSizeMB}MB\n` +
            `초과: ${totalSizeMB - maxTotalSizeMB}MB`
        )
        return
      }

      // ========== 업로드 파일 목록 초기화 ==========
      const newUploadFiles: UploadFile[] = files.map((file) => ({
        file,
        id: uuidv4(),
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
      }))

      setUploadFiles(newUploadFiles)
      setSummary(null)
      setIsUploading(true)

      const startTime = Date.now()

      try {
        // 병렬 업로드 실행
        await uploadInParallel(newUploadFiles)
      } catch (error) {
        // 예상치 못한 에러 발생 시 모든 pending 파일을 에러 상태로 변경
        console.error('업로드 중 예상치 못한 오류 발생:', error)
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.status === 'pending'
              ? { ...f, status: 'error', error: '업로드 중 오류 발생' }
              : f
          )
        )
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // 최종 상태에서 요약 생성 및 캐시 무효화
      setUploadFiles((currentFiles) => {
        const successCount = currentFiles.filter(
          (f) => f.status === 'success'
        ).length
        const errorCount = currentFiles.filter(
          (f) => f.status === 'error'
        ).length
        const totalSize = currentFiles.reduce((acc, f) => acc + f.size, 0)

        setSummary({
          totalFiles: currentFiles.length,
          successCount,
          errorCount,
          totalSize,
          duration,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
        })

        // 성공한 파일이 있으면 관련 캐시 무효화
        // → 환자 목록, Study 목록 페이지에서 새 데이터 표시
        if (successCount > 0) {
          queryClient.invalidateQueries({ queryKey: ['patients'] })
          queryClient.invalidateQueries({ queryKey: ['studies'] })
        }

        return currentFiles
      })

      setIsUploading(false)
    },
    [uploadInParallel, queryClient]
  )

  /**
   * 업로드 목록 초기화
   */
  const clearUploadFiles = useCallback(() => {
    setUploadFiles([])
    setSummary(null)
  }, [])

  /**
   * 실패한 파일만 재시도
   */
  const retryFailed = useCallback(async () => {
    const failedFiles = uploadFiles.filter((f) => f.status === 'error')
    if (failedFiles.length === 0) return

    // 실패한 파일 상태 초기화
    setUploadFiles((prev) =>
      prev.map((f) =>
        f.status === 'error'
          ? { ...f, status: 'pending', progress: 0, error: undefined }
          : f
      )
    )

    setIsUploading(true)
    await uploadInParallel(failedFiles)
    setIsUploading(false)

    // 요약 업데이트 및 캐시 무효화
    setUploadFiles((currentFiles) => {
      const successCount = currentFiles.filter(
        (f) => f.status === 'success'
      ).length
      const errorCount = currentFiles.filter((f) => f.status === 'error').length
      const totalSize = currentFiles.reduce((acc, f) => acc + f.size, 0)

      setSummary((prev) =>
        prev
          ? { ...prev, successCount, errorCount }
          : {
              totalFiles: currentFiles.length,
              successCount,
              errorCount,
              totalSize,
              duration: 0,
            }
      )

      // 재시도로 성공한 파일이 있으면 캐시 무효화
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['patients'] })
        queryClient.invalidateQueries({ queryKey: ['studies'] })
      }

      return currentFiles
    })
  }, [uploadFiles, uploadInParallel, queryClient])

  return {
    uploadFiles,
    isUploading,
    summary,
    uploadDicomFiles,
    clearUploadFiles,
    retryFailed,
  }
}
