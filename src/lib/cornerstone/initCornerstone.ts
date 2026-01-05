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

let initialized = false

/**
 * Cornerstone3D 초기화
 * - 앱 시작 시 한 번만 호출
 * - 중복 호출 방지
 */
export async function initCornerstone(): Promise<void> {
  if (initialized) {
    console.log('[Cornerstone] Already initialized')
    return
  }

  console.log('[Cornerstone] Initializing...')

  try {
    // 1. Cornerstone Core 초기화
    await cornerstone.init()

    // 2. DICOM Image Loader 초기화 (v4 API)
    dicomImageLoader.init({
      maxWebWorkers: navigator.hardwareConcurrency || 4,
    })

    // 3. Image Loader 등록
    // wadouri, wadors 로더를 Cornerstone에 등록
    dicomImageLoader.wadouri.register()
    dicomImageLoader.wadors.register()

    // 3-1. WADO-RS Rendered 커스텀 로더 등록 (멀티 슬롯 뷰어용)
    registerWadoRsRenderedLoader()

    // 4. Cornerstone Tools 초기화
    await cornerstoneTools.init()

    // 5. 기본 도구 추가
    cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool)
    cornerstoneTools.addTool(cornerstoneTools.PanTool)
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool)
    cornerstoneTools.addTool(cornerstoneTools.StackScrollTool)

    initialized = true
    console.log('[Cornerstone] Initialized successfully')
  } catch (error) {
    console.error('[Cornerstone] Initialization failed:', error)
    throw error
  }
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
