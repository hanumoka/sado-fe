import { ApiError, ErrorCodes } from './errors'
import { apiConfig } from './config'

/**
 * api.ts
 *
 * Fetch API Wrapper
 *
 * 주요 기능:
 * 1. 구조화된 에러 처리 (ApiError)
 * 2. AbortController 기반 타임아웃 처리
 * 3. GET, POST, PUT, DELETE, uploadFile 메서드 제공
 *
 * Note: 인증/인가 기능은 POC 단계에서 제외됨
 */

const BASE_URL = apiConfig.baseUrl

/**
 * 공통 에러 처리 함수
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // 서버에서 에러 응답 본문이 있는지 확인
    let errorDetails: Record<string, unknown> | undefined

    try {
      const errorBody = await response.json()
      errorDetails = errorBody
    } catch {
      // JSON 파싱 실패 시 무시
    }

    const error = ApiError.fromHttpStatus(response.status, response.statusText)
    if (errorDetails) {
      throw new ApiError(error.code, error.message, error.status, errorDetails)
    }
    throw error
  }

  // 204 No Content 처리
  if (response.status === 204) {
    // void 또는 undefined를 반환하는 경우를 위한 처리
    return null as unknown as T
  }

  // JSON 파싱 에러 처리
  try {
    return await response.json()
  } catch {
    throw new ApiError(ErrorCodes.UNKNOWN, '응답 데이터 파싱에 실패했습니다')
  }
}

/**
 * 공통 fetch 래퍼 (타임아웃 및 네트워크 에러 처리 포함)
 *
 * @param url - 요청 URL
 * @param options - fetch 옵션
 * @param timeout - 타임아웃 (ms), 기본값: apiConfig.timeout
 */
async function fetchWithErrorHandling(
  url: string,
  options: RequestInit,
  timeout: number = apiConfig.timeout
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    // 타임아웃 에러 처리
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(ErrorCodes.TIMEOUT, '요청 시간이 초과되었습니다', 408)
    }
    // 네트워크 에러 (오프라인, DNS 실패 등)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw ApiError.networkError(error)
    }
    throw new ApiError(
      ErrorCodes.UNKNOWN,
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 공통 헤더 생성
 */
function getHeaders(includeContentType = true): HeadersInit {
  const headers: HeadersInit = {}

  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

export const api = {
  /**
   * GET 요청
   */
  get: async <T = unknown>(url: string): Promise<T> => {
    const response = await fetchWithErrorHandling(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: getHeaders(),
    })

    return handleResponse<T>(response)
  },

  /**
   * POST 요청
   */
  post: async <T = unknown>(url: string, data: unknown): Promise<T> => {
    const response = await fetchWithErrorHandling(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })

    return handleResponse<T>(response)
  },

  /**
   * PUT 요청
   */
  put: async <T = unknown>(url: string, data: unknown): Promise<T> => {
    const response = await fetchWithErrorHandling(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })

    return handleResponse<T>(response)
  },

  /**
   * DELETE 요청
   */
  delete: async <T = unknown>(url: string): Promise<T> => {
    const response = await fetchWithErrorHandling(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })

    return handleResponse<T>(response)
  },

  /**
   * 파일 업로드 (multipart/form-data)
   * 파일 업로드는 일반 요청보다 긴 타임아웃 사용 (apiConfig.uploadTimeout)
   */
  uploadFile: async <T = unknown>(url: string, file: File): Promise<T> => {
    const formData = new FormData()
    formData.append('file', file)

    // Content-Type은 브라우저가 자동으로 설정 (boundary 포함)
    const response = await fetchWithErrorHandling(
      `${BASE_URL}${url}`,
      {
        method: 'POST',
        headers: getHeaders(false), // Content-Type 제외
        body: formData,
      },
      apiConfig.uploadTimeout // 파일 업로드용 긴 타임아웃 (120초)
    )

    return handleResponse<T>(response)
  },
}

// ApiError, ErrorCodes를 함께 export하여 사용 편의성 제공
export { ApiError, ErrorCodes, isApiError } from './errors'
