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
import { enableRenderedInterceptor } from '@/features/dicom-viewer/utils/wadoRsRenderedInterceptor'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_INIT = false

// 렌더링 모드 타입
export type RenderingMode = 'cpu' | 'gpu'

// sessionStorage 키
const RENDERING_MODE_STORAGE_KEY = 'cornerstone-rendering-mode'

// 현재 렌더링 모드 상태
let currentRenderingMode: RenderingMode = 'cpu'
let initialized = false
let initializingPromise: Promise<void> | null = null

/**
 * GPU 렌더링 지원 여부 확인 (WebGL2)
 */
export function checkGpuSupport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    return !!gl
  } catch {
    return false
  }
}

/**
 * 현재 렌더링 모드 반환
 */
export function getRenderingMode(): RenderingMode {
  return currentRenderingMode
}

/**
 * CPU 렌더링 사용 중인지 확인
 */
export function isUsingCPURendering(): boolean {
  return currentRenderingMode === 'cpu'
}

/**
 * sessionStorage에서 저장된 렌더링 모드 복원
 */
function getInitialRenderingMode(): RenderingMode {
  try {
    const stored = sessionStorage.getItem(RENDERING_MODE_STORAGE_KEY)
    if (stored === 'gpu' && checkGpuSupport()) {
      return 'gpu'
    }
  } catch {
    // sessionStorage 접근 실패 시 기본값 사용
  }
  return 'cpu' // 기본값: CPU (안정성 우선)
}

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
      // 1. Cornerstone Core 초기화
      // sessionStorage에서 저장된 렌더링 모드 복원 (기본값: CPU)
      // GPU 렌더링 시 RGBA 이미지 (WADO-RS Rendered) 첫 사이클 깨짐 가능성 있음
      currentRenderingMode = getInitialRenderingMode()
      const useCPU = currentRenderingMode === 'cpu'

      if (DEBUG_INIT) console.log(`[Cornerstone] Step 1: Initializing core with ${currentRenderingMode.toUpperCase()} rendering...`)
      cornerstone.setUseCPURendering(useCPU)
      await cornerstone.init()
      if (DEBUG_INIT) console.log(`[Cornerstone] Step 1: Core initialized (${currentRenderingMode.toUpperCase()} rendering)`)

      // 1-0. Cornerstone 성능 최적화 설정
      // 배치 프리페처 비활성화 후 Cornerstone Pool Manager가 직접 동시성 제어
      if (DEBUG_INIT) console.log('[Cornerstone] Step 1-0: Configuring performance settings...')
      const { RequestType } = Enums
      const cpuCores = navigator.hardwareConcurrency || 4

      // Pool Manager 최적화: Cornerstone이 직접 동시성 제어
      // - imageRetrievalPoolManager: 네트워크 요청 관리
      //   Interaction: 사용자 상호작용 (우선순위 높음)
      //   Prefetch: 백그라운드 프리로드
      // - imageLoadPoolManager: 디코딩 작업 관리 (Web Worker)
      imageRetrievalPoolManager.setMaxSimultaneousRequests(RequestType.Interaction, 8)   // 6→8 증가
      imageRetrievalPoolManager.setMaxSimultaneousRequests(RequestType.Prefetch, 16)     // 10→16 증가
      imageLoadPoolManager.setMaxSimultaneousRequests(RequestType.Interaction, Math.min(cpuCores, 8))
      imageLoadPoolManager.setMaxSimultaneousRequests(RequestType.Prefetch, cpuCores)    // 2N→N (CPU 부하 감소)

      // Cornerstone 내부 캐시 크기 설정 (2GB)
      // OHIF 방식: 단일 캐시 계층으로 단순화 (Cornerstone 캐시만 사용)
      // 3x3 레이아웃 (9슬롯 × 100프레임 × ~2MB = ~1.8GB) 지원
      cache.setMaxCacheSize(2 * 1024 * 1024 * 1024)

      if (DEBUG_INIT) console.log(`[Cornerstone] Step 1-0: Performance configured (retrieval: 6/10, decode: ${cpuCores}/${cpuCores * 2}, cache: 2GB)`)

      // 1-1. WADO-RS Rendered 인터셉터 (Pre-rendered 모드용)
      if (DEBUG_INIT) console.log('[Cornerstone] Step 1-1: Enabling Rendered Interceptor...')
      enableRenderedInterceptor()
      if (DEBUG_INIT) console.log('[Cornerstone] Step 1-1: Rendered Interceptor enabled')

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
 * Cornerstone 재초기화 (렌더링 모드 전환용)
 *
 * 주의: 이 함수 호출 전에 모든 RenderingEngine을 파괴해야 합니다.
 * 호출자가 다음 순서를 따라야 합니다:
 * 1. 모든 재생 중지
 * 2. 모든 RenderingEngine 파괴
 * 3. reinitializeCornerstone() 호출
 * 4. 새 RenderingEngine 생성
 *
 * @param useCPU CPU 렌더링 사용 여부
 * @returns 재초기화 성공 여부
 */
export async function reinitializeCornerstone(useCPU: boolean): Promise<boolean> {
  const newMode: RenderingMode = useCPU ? 'cpu' : 'gpu'

  // 같은 모드면 스킵
  if (currentRenderingMode === newMode && initialized) {
    if (DEBUG_INIT) console.log(`[Cornerstone] Already using ${newMode.toUpperCase()} rendering`)
    return true
  }

  // GPU 모드 요청 시 지원 여부 체크
  if (!useCPU && !checkGpuSupport()) {
    console.warn('[Cornerstone] GPU rendering not supported on this device')
    return false
  }

  console.log(`[Cornerstone] Reinitializing with ${newMode.toUpperCase()} rendering...`)

  try {
    // 1. 현재 렌더링 모드 업데이트
    currentRenderingMode = newMode

    // 2. sessionStorage에 저장
    try {
      sessionStorage.setItem(RENDERING_MODE_STORAGE_KEY, newMode)
    } catch {
      // sessionStorage 접근 실패는 무시
    }

    // 3. Cornerstone 렌더링 모드 설정
    // Note: setUseCPURendering은 init() 전에 호출해야 효과가 있음
    // 이미 init()된 상태에서는 RenderingEngine을 새로 생성해야 새 모드가 적용됨
    cornerstone.setUseCPURendering(useCPU)

    // 4. 초기화 상태는 유지 (image loader, tools 등은 재사용 가능)
    // RenderingEngine만 새로 생성하면 새 렌더링 모드가 적용됨

    console.log(`[Cornerstone] Rendering mode changed to ${newMode.toUpperCase()}`)
    console.log('[Cornerstone] Note: RenderingEngine must be recreated for changes to take effect')

    return true
  } catch (error) {
    console.error('[Cornerstone] Reinitialization failed:', error)
    // 실패 시 CPU 모드로 폴백
    currentRenderingMode = 'cpu'
    cornerstone.setUseCPURendering(true)
    return false
  }
}

/**
 * Cornerstone 모듈 export
 */
export { cornerstone, cornerstoneTools, dicomImageLoader }
