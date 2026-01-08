import { ApiError, ErrorCodes } from './apiErrors'
import { apiConfig } from './config'
import { getTenantId } from './tenantStore'

/**
 * api.ts
 *
 * Fetch API Wrapper
 *
 * 주요 기능:
 * 1. 구조화된 에러 처리 (ApiError)
 * 2. AbortController 기반 타임아웃 처리
 * 3. GET, POST, PUT, DELETE, uploadFile 메서드 제공
 * 4. 멀티테넌시 지원 (X-Tenant-Id 헤더 자동 추가)
 *
 * Note: 인증/인가 기능은 POC 단계에서 제외됨
 */

const BASE_URL = apiConfig.baseUrl

/**
 * 공통 에러 처리 함수
 * Backend ApiResponse 형식 처리: { code: number, message: string, data: T }
 *
 * Note: 204 No Content 응답의 경우 null을 반환합니다.
 */
async function handleResponse<T>(response: Response): Promise<T | null> {
  // 204 No Content 처리 - 타입 안전하게 null 반환
  if (response.status === 204) {
    return null
  }

  // HTTP 상태 코드가 에러인 경우
  if (!response.ok) {
    let errorMessage = response.statusText

    try {
      const errorBody = await response.json()
      // Backend ApiResponse 형식에서 message 추출
      if (errorBody.message) {
        errorMessage = errorBody.message
      }
    } catch {
      // JSON 파싱 실패 시 무시
    }

    const error = ApiError.fromHttpStatus(response.status, errorMessage)
    throw error
  }

  // JSON 파싱 및 Backend ApiResponse 처리
  try {
    const json = await response.json()

    // Backend ApiResponse 형식인지 확인
    if (typeof json === 'object' && json !== null && 'code' in json && 'data' in json) {
      const apiResponse = json as { code: number; message: string; data: T }

      // Backend 성공 판단: code가 2xxxxx
      if (apiResponse.code >= 200000 && apiResponse.code < 300000) {
        return apiResponse.data
      } else {
        // Backend에서 에러 응답을 보낸 경우
        throw new ApiError(
          ErrorCodes.UNKNOWN,
          apiResponse.message || 'API 오류가 발생했습니다',
          response.status
        )
      }
    }

    // ApiResponse 형식이 아닌 경우 (호환성 유지)
    return json as T
  } catch (error) {
    // JSON 파싱 에러 또는 위에서 throw된 ApiError
    if (error instanceof ApiError) {
      throw error
    }
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
 *
 * 멀티테넌시: tenantStore에 tenantId가 설정되어 있으면 X-Tenant-Id 헤더 추가
 */
function getHeaders(includeContentType = true): HeadersInit {
  const headers: Record<string, string> = {}

  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }

  // 멀티테넌시: X-Tenant-Id 헤더 추가
  const tenantId = getTenantId()
  if (tenantId !== undefined && tenantId !== null) {
    headers['X-Tenant-Id'] = String(tenantId)
  }

  return headers
}

export const api = {
  /**
   * GET 요청
   *
   * @returns Promise<T | null> - 204 No Content 응답 시 null 반환
   */
  get: async <T = unknown>(url: string): Promise<T | null> => {
    const response = await fetchWithErrorHandling(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: getHeaders(),
    })

    return handleResponse<T>(response)
  },

  /**
   * POST 요청
   *
   * @returns Promise<T | null> - 204 No Content 응답 시 null 반환
   */
  post: async <T = unknown>(url: string, data: unknown): Promise<T | null> => {
    const response = await fetchWithErrorHandling(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })

    return handleResponse<T>(response)
  },

  /**
   * PUT 요청
   *
   * @returns Promise<T | null> - 204 No Content 응답 시 null 반환
   */
  put: async <T = unknown>(url: string, data: unknown): Promise<T | null> => {
    const response = await fetchWithErrorHandling(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })

    return handleResponse<T>(response)
  },

  /**
   * DELETE 요청
   *
   * @returns Promise<T | null> - 204 No Content 응답 시 null 반환
   */
  delete: async <T = unknown>(url: string): Promise<T | null> => {
    const response = await fetchWithErrorHandling(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })

    return handleResponse<T>(response)
  },

  /**
   * 파일 업로드 (multipart/form-data)
   * 파일 업로드는 일반 요청보다 긴 타임아웃 사용 (apiConfig.uploadTimeout)
   *
   * @returns Promise<T | null> - 204 No Content 응답 시 null 반환
   */
  uploadFile: async <T = unknown>(url: string, file: File): Promise<T | null> => {
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
export { ApiError, ErrorCodes, isApiError } from './apiErrors'
