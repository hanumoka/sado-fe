/**
 * wadoRsFetchInterceptor.ts
 *
 * WADO-RS Fetch Interceptor
 *
 * cornerstoneDICOMImageLoader의 HTTP 요청을 가로채서
 * PixelData 캐시에 있으면 캐시된 데이터를 반환.
 *
 * 핵심 원칙:
 * - IImage 생성은 cornerstoneDICOMImageLoader가 담당 (이미지 왜곡 방지)
 * - HTTP 요청만 캐시된 PixelData로 대체 (네트워크 최적화)
 * - 캐시 미스 시 원래 fetch로 폴백 (안전성 보장)
 */

import { getCachedPixelData } from './wadoRsPixelDataCache'

// 디버그 로그 플래그 (테스트 후 false로 변경)
const DEBUG_INTERCEPTOR = true

// 원본 fetch 함수 저장
let originalFetch: typeof window.fetch | null = null

// 원본 XMLHttpRequest.open 저장
let originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null
let originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null

// 인터셉터 활성화 상태
let isInterceptorEnabled = false

// 인터셉트 통계
let interceptedRequests = 0
let cacheHitRequests = 0
let passedThroughRequests = 0

/**
 * WADO-RS 프레임 요청 패턴 매칭
 *
 * cornerstoneDICOMImageLoader가 요청하는 URL 형식:
 * http://localhost:10201/dicomweb/studies/{studyUid}/series/{seriesUid}/instances/{sopInstanceUid}/frames/{frameNumber}
 *
 * @param url 요청 URL
 * @returns WADO-RS 프레임 요청 여부
 */
function isWadoRsFrameRequest(url: string): boolean {
  // /dicomweb/studies/.../instances/.../frames/N 패턴
  // 단일 프레임 요청만 인터셉트 (배치 요청 /frames/1,2,3은 제외)
  const pattern = /\/dicomweb\/studies\/[^/]+\/series\/[^/]+\/instances\/[^/]+\/frames\/\d+$/
  return pattern.test(url)
}

/**
 * Request/URL에서 URL 문자열 추출
 *
 * @param input fetch의 첫 번째 인자
 * @returns URL 문자열
 */
function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }
  if (input instanceof URL) {
    return input.href
  }
  if (input instanceof Request) {
    return input.url
  }
  return ''
}

/**
 * ArrayBuffer를 Response 객체로 변환
 *
 * cornerstoneDICOMImageLoader가 기대하는 응답 형식으로 변환
 *
 * @param data 캐시된 PixelData
 * @param url 원본 요청 URL
 * @returns Response 객체
 */
function createCachedResponse(data: ArrayBuffer, _url: string): Response {
  return new Response(data, {
    status: 200,
    statusText: 'OK (from cache)',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': data.byteLength.toString(),
      'X-Cache-Status': 'HIT',
    },
  })
}

/**
 * Fetch Interceptor 활성화
 *
 * window.fetch와 XMLHttpRequest를 오버라이드하여 WADO-RS 프레임 요청을 가로챔.
 * cornerstoneDICOMImageLoader 초기화 전에 호출해야 함.
 */
export function enableWadoRsFetchInterceptor(): void {
  if (isInterceptorEnabled) {
    if (DEBUG_INTERCEPTOR) {
      console.log('[WadoRsFetchInterceptor] Already enabled, skipping')
    }
    return
  }

  // 원본 fetch 저장
  originalFetch = window.fetch.bind(window)

  // fetch 오버라이드
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = extractUrl(input)

    // WADO-RS 프레임 요청인지 확인
    if (isWadoRsFrameRequest(url)) {
      interceptedRequests++

      try {
        // 캐시에서 PixelData 조회
        const cachedData = getCachedPixelData(url)

        if (cachedData) {
          cacheHitRequests++

          if (DEBUG_INTERCEPTOR) {
            console.log(`[WadoRsFetchInterceptor] [fetch] Cache HIT: ${url}`)
          }

          // 캐시된 데이터로 Response 생성
          return createCachedResponse(cachedData, url)
        }
      } catch (error) {
        // 캐시 조회 실패 시 원래 fetch로 폴백
        console.warn('[WadoRsFetchInterceptor] Cache read failed, falling back to network:', error)
      }

      // 캐시 미스: 원래 fetch 사용
      passedThroughRequests++

      if (DEBUG_INTERCEPTOR) {
        console.log(`[WadoRsFetchInterceptor] [fetch] Cache MISS, fetching: ${url}`)
      }
    }

    // WADO-RS 프레임 요청이 아니거나 캐시 미스인 경우 원래 fetch 사용
    return originalFetch!(input, init)
  }

  // XMLHttpRequest 오버라이드 (cornerstoneDICOMImageLoader가 XHR을 사용하는 경우)
  originalXHROpen = XMLHttpRequest.prototype.open
  originalXHRSend = XMLHttpRequest.prototype.send

  // XHR 요청 URL을 저장하기 위한 WeakMap
  const xhrUrlMap = new WeakMap<XMLHttpRequest, string>()

  // open 오버라이드 - URL 저장
  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    const urlString = typeof url === 'string' ? url : url.href
    xhrUrlMap.set(this, urlString)

    if (DEBUG_INTERCEPTOR && isWadoRsFrameRequest(urlString)) {
      console.log(`[WadoRsFetchInterceptor] [XHR] open: ${urlString}`)
    }

    // 원본 open 호출
    return originalXHROpen!.call(this, method, url, async ?? true, username, password)
  }

  // send 오버라이드 - 캐시 확인 및 응답 주입
  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    const url = xhrUrlMap.get(this)

    if (url && isWadoRsFrameRequest(url)) {
      interceptedRequests++

      try {
        const cachedData = getCachedPixelData(url)

        if (cachedData) {
          cacheHitRequests++

          if (DEBUG_INTERCEPTOR) {
            console.log(`[WadoRsFetchInterceptor] [XHR] Cache HIT: ${url}`)
          }

          // XHR 응답 시뮬레이션
          // readyState와 response를 직접 설정할 수 없으므로 defineProperty 사용
          const xhr = this

          // 즉시 완료 상태로 설정
          setTimeout(() => {
            Object.defineProperty(xhr, 'readyState', { value: 4, writable: false })
            Object.defineProperty(xhr, 'status', { value: 200, writable: false })
            Object.defineProperty(xhr, 'statusText', { value: 'OK (from cache)', writable: false })
            Object.defineProperty(xhr, 'response', { value: cachedData, writable: false })
            Object.defineProperty(xhr, 'responseType', { value: 'arraybuffer', writable: false })

            // 이벤트 발생
            xhr.dispatchEvent(new Event('readystatechange'))
            xhr.dispatchEvent(new ProgressEvent('load'))
            xhr.dispatchEvent(new ProgressEvent('loadend'))
          }, 0)

          return // 원본 send 호출 안함
        }
      } catch (error) {
        console.warn('[WadoRsFetchInterceptor] [XHR] Cache read failed, falling back to network:', error)
      }

      // 캐시 미스
      passedThroughRequests++

      if (DEBUG_INTERCEPTOR) {
        console.log(`[WadoRsFetchInterceptor] [XHR] Cache MISS, fetching: ${url}`)
      }
    }

    // 원본 send 호출
    return originalXHRSend!.call(this, body)
  }

  isInterceptorEnabled = true

  if (DEBUG_INTERCEPTOR) {
    console.log('[WadoRsFetchInterceptor] Enabled (fetch + XHR)')
  }
}

/**
 * Fetch Interceptor 비활성화
 *
 * window.fetch와 XMLHttpRequest를 원본으로 복원
 */
export function disableWadoRsFetchInterceptor(): void {
  if (!isInterceptorEnabled) {
    if (DEBUG_INTERCEPTOR) {
      console.log('[WadoRsFetchInterceptor] Not enabled or already disabled')
    }
    return
  }

  // 원본 fetch 복원
  if (originalFetch) {
    window.fetch = originalFetch
    originalFetch = null
  }

  // 원본 XMLHttpRequest 복원
  if (originalXHROpen) {
    XMLHttpRequest.prototype.open = originalXHROpen
    originalXHROpen = null
  }
  if (originalXHRSend) {
    XMLHttpRequest.prototype.send = originalXHRSend
    originalXHRSend = null
  }

  isInterceptorEnabled = false

  if (DEBUG_INTERCEPTOR) {
    console.log('[WadoRsFetchInterceptor] Disabled')
  }
}

/**
 * Interceptor 활성화 상태 확인
 *
 * @returns 활성화 여부
 */
export function isWadoRsFetchInterceptorEnabled(): boolean {
  return isInterceptorEnabled
}

/**
 * Interceptor 통계 조회
 *
 * @returns 통계 객체
 */
export function getInterceptorStats(): {
  enabled: boolean
  interceptedRequests: number
  cacheHitRequests: number
  passedThroughRequests: number
  hitRate: number
} {
  const hitRate =
    interceptedRequests > 0
      ? (cacheHitRequests / interceptedRequests) * 100
      : 0

  return {
    enabled: isInterceptorEnabled,
    interceptedRequests,
    cacheHitRequests,
    passedThroughRequests,
    hitRate: Math.round(hitRate * 100) / 100,
  }
}

/**
 * Interceptor 통계 리셋
 */
export function resetInterceptorStats(): void {
  interceptedRequests = 0
  cacheHitRequests = 0
  passedThroughRequests = 0
}
