/**
 * initCornerstone.ts
 *
 * Cornerstone3D v4 초기화 유틸리티
 *
 * 주요 기능:
 * 1. Cornerstone Core 초기화
 * 2. DICOM Image Loader 등록 (WADO-RS/WADO-URI/WADO-RS Rendered)
 * 3. Tools 초기화
 *
 * 등록되는 Image Loader:
 * - wadouri: WADO-URI 프로토콜 (레거시)
 * - wadors: WADO-RS 프로토콜 (표준 DICOMweb)
 * - wadors-rendered: WADO-RS Rendered API (멀티 슬롯 뷰어용 커스텀 로더)
 */
import * as cornerstone from '@cornerstonejs/core'
import {
  cache,
  imageLoadPoolManager,
  imageRetrievalPoolManager,
  Enums,
} from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import dicomImageLoader from '@cornerstonejs/dicom-image-loader'
import { registerWadoRsRenderedLoader } from './wadoRsRenderedLoader'
import { registerWadoRsBulkDataMetadataProvider } from '@/features/dicom-viewer-wado-rs-bulkdata/utils/wadoRsBulkDataMetadataProvider'
// OHIF 방식: L2 캐시(Fetch Interceptor) 제거, Cornerstone 내장 캐시만 사용
// import { enableWadoRsFetchInterceptor } from '@/features/dicom-viewer-wado-rs-bulkdata/utils/wadoRsFetchInterceptor'
import { enableRenderedInterceptor } from '@/features/dicom-viewer/utils/wadoRsRenderedInterceptor'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_INIT = false

let initialized = false
let initializingPromise: Promise<void> | null = null

/**
 * Cornerstone3D 초기화
 * - 앱 시작 시 한 번만 호출
 * - 중복 호출 방지 (동시 호출 시 동일 Promise 반환)
 */
export async function initCornerstone(): Promise<void> {
  // 이미 초기화 완료
  if (initialized) {
    if (DEBUG_INIT) console.log('[Cornerstone] Already initialized')
    return
  }

  // 초기화 진행 중이면 동일 Promise 반환 (중복 방지)
  if (initializingPromise) {
    if (DEBUG_INIT) console.log('[Cornerstone] Initialization already in progress, waiting...')
    return initializingPromise
  }

  if (DEBUG_INIT) console.log('[Cornerstone] Initializing...')

  initializingPromise = (async () => {
    try {
      // 1. Cornerstone Core 초기화 (GPU 렌더링 사용 - OHIF 방식)
      // 기존: CPU 렌더링 강제 (setUseCPURendering(true)) → CPU 148% 문제 발생
      // 변경: GPU 렌더링 사용 → CPU ~10-20%로 대폭 절감 (OHIF 수준)
      // 주의: color 이미지 렌더링 문제 발생 시 Cornerstone3D 버전 확인 필요
      if (DEBUG_INIT) console.log('[Cornerstone] Step 1: Initializing core with GPU rendering...')
      // cornerstone.setUseCPURendering(true)  // GPU 렌더링 사용을 위해 비활성화
      await cornerstone.init()
      if (DEBUG_INIT) console.log('[Cornerstone] Step 1: Core initialized (GPU rendering)')

      // 1-0. Cornerstone 성능 최적화 설정
      // 배치 프리페처 비활성화 후 Cornerstone Pool Manager가 직접 동시성 제어
      if (DEBUG_INIT) console.log('[Cornerstone] Step 1-0: Configuring performance settings...')
      const { RequestType } = Enums
      const cpuCores = navigator.hardwareConcurrency || 4

      // Pool Manager 최적화: OHIF 방식 동시 로드 지원
      // - Interaction: 사용자 상호작용 (높은 우선순위)
      // - Prefetch: 초기 버퍼 및 백그라운드 프리로드
      // 9슬롯 × 초기버퍼(15프레임)을 동시에 로드하기 위해 충분한 동시성 필요
      imageRetrievalPoolManager.setMaxSimultaneousRequests(RequestType.Interaction, 6)
      imageRetrievalPoolManager.setMaxSimultaneousRequests(RequestType.Prefetch, 6)
      imageLoadPoolManager.setMaxSimultaneousRequests(RequestType.Interaction, cpuCores)
      imageLoadPoolManager.setMaxSimultaneousRequests(RequestType.Prefetch, cpuCores)

      // Cornerstone 내부 캐시 크기 설정 (1GB)
      // 메모리 최적화: 2GB → 1GB (OHIF 수준)
      // LRU eviction으로 오래된 프레임 자동 해제
      // 주의: 너무 작으면 무한 네트워크 요청 발생 가능 (이전 800MB에서 문제 발생)
      cache.setMaxCacheSize(1024 * 1024 * 1024)

      if (DEBUG_INIT) console.log(`[Cornerstone] Step 1-0: Performance configured (retrieval: 6/6, decode: ${cpuCores}/${cpuCores}, cache: 1GB)`)

      // 1-1. WADO-RS Fetch Interceptors
      // OHIF 방식: BulkData 인터셉터(L2 캐시) 제거, Cornerstone 내장 캐시만 사용
      // Rendered 인터셉터만 유지 (Pre-rendered 모드용)
      if (DEBUG_INIT) console.log('[Cornerstone] Step 1-1: Enabling WADO-RS Rendered Interceptor...')
      // enableWadoRsFetchInterceptor()  // L2 캐시 비활성화 - OHIF 방식으로 단순화
      enableRenderedInterceptor()        // Rendered (PNG) 인터셉터만 유지
      if (DEBUG_INIT) console.log('[Cornerstone] Step 1-1: WADO-RS Rendered Interceptor enabled')

      // 2. DICOM Image Loader 초기화 (v4 API)
      if (DEBUG_INIT) console.log('[Cornerstone] Step 2: Initializing DICOM image loader...')
      try {
        dicomImageLoader.init({
          maxWebWorkers: navigator.hardwareConcurrency || 4,
        })
        if (DEBUG_INIT) console.log('[Cornerstone] Step 2: DICOM image loader initialized')
      } catch (e) {
        // Worker already registered 에러는 무시 (StrictMode 대응)
        console.warn('[Cornerstone] Step 2: DICOM image loader init warning:', e)
      }

      // 3. Image Loader 등록
      if (DEBUG_INIT) console.log('[Cornerstone] Step 3: Registering image loaders...')
      try {
        dicomImageLoader.wadouri.register()
        dicomImageLoader.wadors.register()
      } catch (e) {
        console.warn('[Cornerstone] Step 3: Image loader registration warning:', e)
      }

      // 3-1. WADO-RS Rendered 커스텀 로더 등록 (멀티 슬롯 뷰어용)
      registerWadoRsRenderedLoader()

      // 3-2. WADO-RS BulkData 메타데이터 프로바이더 등록 (wadors: scheme 지원)
      registerWadoRsBulkDataMetadataProvider()

      if (DEBUG_INIT) console.log('[Cornerstone] Step 3: Image loaders registered')

      // 4. Cornerstone Tools 초기화
      if (DEBUG_INIT) console.log('[Cornerstone] Step 4: Initializing tools...')
      try {
        await cornerstoneTools.init()
        if (DEBUG_INIT) console.log('[Cornerstone] Step 4: Tools initialized')
      } catch (e) {
        // Tools already initialized 에러는 무시
        console.warn('[Cornerstone] Step 4: Tools init warning:', e)
      }

      // 5. 기본 도구 추가
      if (DEBUG_INIT) console.log('[Cornerstone] Step 5: Adding tools...')
      try {
        cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool)
        cornerstoneTools.addTool(cornerstoneTools.PanTool)
        cornerstoneTools.addTool(cornerstoneTools.ZoomTool)
        cornerstoneTools.addTool(cornerstoneTools.StackScrollTool)
        if (DEBUG_INIT) console.log('[Cornerstone] Step 5: Tools added')
      } catch (e) {
        // Tools already added 에러는 무시
        console.warn('[Cornerstone] Step 5: Add tools warning:', e)
      }

      initialized = true
      if (DEBUG_INIT) console.log('[Cornerstone] ✅ Initialized successfully')
    } catch (error) {
      console.error('[Cornerstone] ❌ Initialization failed:', error)
      initializingPromise = null
      throw error
    }
  })()

  return initializingPromise
}

/**
 * 초기화 상태 확인
 */
export function isInitialized(): boolean {
  return initialized
}

/**
 * Cornerstone 모듈 export
 */
export { cornerstone, cornerstoneTools, dicomImageLoader }
