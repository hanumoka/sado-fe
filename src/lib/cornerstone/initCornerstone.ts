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
import * as cornerstoneTools from '@cornerstonejs/tools'
import dicomImageLoader from '@cornerstonejs/dicom-image-loader'
import { registerWadoRsRenderedLoader } from './wadoRsRenderedLoader'
import { registerWadoRsBulkDataMetadataProvider } from '@/features/dicom-viewer-wado-rs-bulkdata/utils/wadoRsBulkDataMetadataProvider'

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
    console.log('[Cornerstone] Already initialized')
    return
  }

  // 초기화 진행 중이면 동일 Promise 반환 (중복 방지)
  if (initializingPromise) {
    console.log('[Cornerstone] Initialization already in progress, waiting...')
    return initializingPromise
  }

  console.log('[Cornerstone] Initializing...')

  initializingPromise = (async () => {
    try {
      // 1. Cornerstone Core 초기화 (CPU 렌더링 강제 - color 이미지 렌더링 문제 해결)
      console.log('[Cornerstone] Step 1: Initializing core with CPU rendering...')
      cornerstone.setUseCPURendering(true)
      await cornerstone.init()
      console.log('[Cornerstone] Step 1: Core initialized (CPU rendering)')

      // 2. DICOM Image Loader 초기화 (v4 API)
      console.log('[Cornerstone] Step 2: Initializing DICOM image loader...')
      try {
        dicomImageLoader.init({
          maxWebWorkers: navigator.hardwareConcurrency || 4,
        })
        console.log('[Cornerstone] Step 2: DICOM image loader initialized')
      } catch (e) {
        // Worker already registered 에러는 무시 (StrictMode 대응)
        console.warn('[Cornerstone] Step 2: DICOM image loader init warning:', e)
      }

      // 3. Image Loader 등록
      console.log('[Cornerstone] Step 3: Registering image loaders...')
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

      console.log('[Cornerstone] Step 3: Image loaders registered')

      // 4. Cornerstone Tools 초기화
      console.log('[Cornerstone] Step 4: Initializing tools...')
      try {
        await cornerstoneTools.init()
        console.log('[Cornerstone] Step 4: Tools initialized')
      } catch (e) {
        // Tools already initialized 에러는 무시
        console.warn('[Cornerstone] Step 4: Tools init warning:', e)
      }

      // 5. 기본 도구 추가
      console.log('[Cornerstone] Step 5: Adding tools...')
      try {
        cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool)
        cornerstoneTools.addTool(cornerstoneTools.PanTool)
        cornerstoneTools.addTool(cornerstoneTools.ZoomTool)
        cornerstoneTools.addTool(cornerstoneTools.StackScrollTool)
        console.log('[Cornerstone] Step 5: Tools added')
      } catch (e) {
        // Tools already added 에러는 무시
        console.warn('[Cornerstone] Step 5: Add tools warning:', e)
      }

      initialized = true
      console.log('[Cornerstone] ✅ Initialized successfully')
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
