import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { apiConfig, uploadConfig } from '@/lib/config'
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
 */

export function useUploadDicom() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [summary, setSummary] = useState<UploadSummary | null>(null)

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
   * 진행률 추적이 가능한 실제 업로드
   */
  const realUpload = useCallback(
    (fileId: string, formData: FormData): Promise<UploadResponse> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            updateFileProgress(fileId, progress)
          }
        })

        xhr.addEventListener('load', () => {
          // 상태 코드별 처리
          switch (xhr.status) {
            case 200: // OK - 파일 업데이트
            case 201: // Created - 파일 생성
              try {
                const response: UploadResponse = JSON.parse(xhr.responseText)
                resolve(response)
              } catch {
                reject(new Error('응답 파싱 실패'))
              }
              break
            case 409: // Conflict - 중복 파일
              reject(new Error('이미 존재하는 파일입니다'))
              break
            case 413: // Payload Too Large - 파일 크기 초과
              reject(new Error('파일 크기가 너무 큽니다'))
              break
            case 415: // Unsupported Media Type - DICOM 형식 아님
              reject(new Error('지원하지 않는 파일 형식입니다'))
              break
            case 422: // Unprocessable Entity - 잘못된 DICOM
              reject(new Error('유효하지 않은 DICOM 파일입니다'))
              break
            case 429: // Too Many Requests
              reject(
                new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요')
              )
              break
            default:
              if (xhr.status >= 400 && xhr.status < 500) {
                reject(new Error(`클라이언트 오류: ${xhr.status}`))
              } else if (xhr.status >= 500) {
                reject(new Error(`서버 오류: ${xhr.status}`))
              } else {
                reject(new Error(`예상치 못한 응답: ${xhr.status}`))
              }
          }
        })

        xhr.addEventListener('error', () => reject(new Error('네트워크 오류')))
        xhr.addEventListener('timeout', () =>
          reject(new Error('요청 시간 초과'))
        )

        xhr.open('POST', `${apiConfig.baseUrl}/api/instances/upload`)
        xhr.timeout = apiConfig.uploadTimeout
        xhr.send(formData)
      })
    },
    [updateFileProgress]
  )

  /**
   * 단일 파일 업로드
   */
  const uploadSingleFile = useCallback(
    async (uploadFile: UploadFile): Promise<void> => {
      try {
        updateFileStatus(uploadFile.id, 'uploading', 0)

        const formData = new FormData()
        formData.append('file', uploadFile.file)
        const response = await realUpload(uploadFile.id, formData)

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
   */
  const uploadDicomFiles = useCallback(
    async (files: File[]) => {
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

      // 최종 상태에서 요약 생성
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

        return currentFiles
      })

      setIsUploading(false)
    },
    [uploadInParallel]
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

    // 요약 업데이트
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

      return currentFiles
    })
  }, [uploadFiles, uploadInParallel])

  return {
    uploadFiles,
    isUploading,
    summary,
    uploadDicomFiles,
    clearUploadFiles,
    retryFailed,
  }
}
