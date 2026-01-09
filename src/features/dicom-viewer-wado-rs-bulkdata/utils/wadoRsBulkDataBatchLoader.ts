/**
 * wadoRsBulkDataBatchLoader.ts
 *
 * WADO-RS BulkData 배치 로딩 및 Cornerstone 캐시 주입
 *
 * DICOMweb Part 18 FrameList API를 사용하여 여러 프레임을 단일 HTTP 요청으로 로드하고,
 * Cornerstone 캐시에 직접 주입하여 개별 요청 대비 90% HTTP 요청 절감.
 *
 * 핵심 기능:
 * 1. 배치 API로 여러 프레임 PixelData 로드 (/frames/1,2,3,4,5)
 * 2. Raw PixelData → Cornerstone IImage 변환
 * 3. cache.putImageLoadObject()로 Cornerstone 캐시 직접 주입
 *
 * @see https://dicom.nema.org/medical/dicom/2019a/output/chtml/part18/sect_6.5.4.html
 */
import { cache, type Types, utilities } from '@cornerstonejs/core'
import { retrieveFrameBatch } from '@/lib/services/dicomWebService'
import { createWadoRsBulkDataImageId } from './wadoRsBulkDataImageIdHelper'
import type { DicomPixelMetadata } from './wadoRsBulkDataMetadataProvider'

// 디버그 로그 플래그
const DEBUG_BATCH_LOADER = false

/**
 * Raw PixelData (ArrayBuffer)를 Cornerstone IImage로 변환
 *
 * @param imageId Cornerstone imageId
 * @param pixelData Raw PixelData (서버에서 디코딩된 상태)
 * @param metadata DICOM 픽셀 메타데이터
 * @returns Cornerstone IImage 객체
 */
function createImageFromPixelData(
  imageId: string,
  pixelData: ArrayBuffer,
  metadata: DicomPixelMetadata
): Types.IImage {
  const {
    rows,
    columns,
    bitsAllocated,
    bitsStored,
    highBit,
    samplesPerPixel,
    photometricInterpretation,
    pixelRepresentation,
  } = metadata

  // TypedArray 변환 (bitsAllocated 기반)
  let typedPixelData: Uint8Array | Uint16Array | Int16Array
  if (bitsAllocated === 8) {
    typedPixelData = new Uint8Array(pixelData)
  } else if (bitsAllocated === 16) {
    // pixelRepresentation: 0 = unsigned, 1 = signed
    typedPixelData =
      pixelRepresentation === 1 ? new Int16Array(pixelData) : new Uint16Array(pixelData)
  } else {
    // 기본값: Uint16Array (대부분의 DICOM 이미지)
    typedPixelData = new Uint16Array(pixelData)
  }

  // 픽셀 값 범위 계산 (Window/Level 자동 설정용)
  let minPixelValue = Infinity
  let maxPixelValue = -Infinity
  for (let i = 0; i < typedPixelData.length; i++) {
    const val = typedPixelData[i]
    if (val < minPixelValue) minPixelValue = val
    if (val > maxPixelValue) maxPixelValue = val
  }

  // 범위가 계산되지 않은 경우 기본값
  if (minPixelValue === Infinity) minPixelValue = 0
  if (maxPixelValue === -Infinity) maxPixelValue = bitsAllocated === 8 ? 255 : 65535

  // 캐시된 pixelData 참조 (getPixelData 호출 시 새 배열 생성 방지)
  const cachedPixelData = typedPixelData

  // 캐시된 canvas (lazy evaluation)
  let cachedCanvas: HTMLCanvasElement | null = null

  // Window/Level 계산
  const windowWidth = maxPixelValue - minPixelValue || 1
  const windowCenter = minPixelValue + windowWidth / 2

  // numberOfComponents (GPU 텍스처 형식 결정)
  const numberOfComponents = samplesPerPixel

  // voxelManager 생성 (CRITICAL - GPU 렌더링 필수!)
  // cornerstoneDICOMImageLoader가 생성하는 것과 동일한 구조
  // StackViewport._updateActorToDisplayImageId()에서 image.voxelManager.getScalarData() 호출
  const voxelManager = utilities.VoxelManager.createImageVoxelManager({
    scalarData: cachedPixelData,
    width: columns,
    height: rows,
    numberOfComponents: numberOfComponents,
  })

  // imageFrame 객체 생성 (cornerstoneDICOMImageLoader 호환)
  // Cornerstone3D 렌더링 파이프라인이 이 속성을 참조할 수 있음
  const imageFrame = {
    pixelData: cachedPixelData,
    rows,
    columns,
    bitsAllocated,
    bitsStored,
    highBit,
    pixelRepresentation,
    samplesPerPixel,
    photometricInterpretation,
    imageData: undefined as ImageData | undefined,
    minPixelValue,
    maxPixelValue,
    windowCenter,
    windowWidth,
    renderingParameters: undefined,
  }

  // Cornerstone IImage 객체 생성
  const image = {
    imageId,
    rows,
    columns,
    width: columns,
    height: rows,

    // PixelData 반환 (캐시된 참조)
    getPixelData: () => cachedPixelData,

    // Canvas 반환 (Grayscale → RGBA 변환)
    getCanvas: () => {
      if (!cachedCanvas) {
        cachedCanvas = createCanvasFromPixelData(
          cachedPixelData,
          rows,
          columns,
          metadata,
          minPixelValue,
          maxPixelValue
        )
      }
      return cachedCanvas
    },

    // cornerstoneDICOMImageLoader 호환 - 핵심!
    imageFrame,

    // voxelManager - GPU 렌더링 필수! (CRITICAL)
    // StackViewport._updateActorToDisplayImageId()에서 사용
    voxelManager,

    // 픽셀 메타데이터
    color: samplesPerPixel > 1,
    rgba: false,
    numberOfComponents,
    photometricInterpretation,

    // 픽셀 형식
    bitsAllocated,
    bitsStored,
    highBit,
    pixelRepresentation,
    samplesPerPixel,

    // 크기 정보
    sizeInBytes: pixelData.byteLength,
    dataType: bitsAllocated === 8 ? 'Uint8Array' :
              (pixelRepresentation === 1 ? 'Int16Array' : 'Uint16Array'),

    // 픽셀 값 범위
    minPixelValue,
    maxPixelValue,
    slope: 1,
    intercept: 0,

    // Window/Level
    windowCenter,
    windowWidth,

    // 표시 옵션
    invert: photometricInterpretation === 'MONOCHROME1',
    columnPixelSpacing: 1,
    rowPixelSpacing: 1,

    // VOI/Modality LUT
    voiLUTFunction: undefined,
    modalityLUT: undefined,
    voiLUT: undefined,
  }

  if (DEBUG_BATCH_LOADER) {
    if (DEBUG_BATCH_LOADER) if (DEBUG_BATCH_LOADER) console.log('[WadoRsBulkDataBatchLoader] IImage created:', {
      imageId,
      rows,
      columns,
      minPixelValue,
      maxPixelValue,
      windowCenter,
      windowWidth,
      sizeInBytes: pixelData.byteLength,
    })
  }

  return image as unknown as Types.IImage
}

/**
 * PixelData를 Canvas로 변환 (Grayscale → RGBA)
 *
 * @param pixelData TypedArray 픽셀 데이터
 * @param rows 이미지 높이
 * @param columns 이미지 너비
 * @param metadata DICOM 메타데이터
 * @param minPixelValue 최소 픽셀 값
 * @param maxPixelValue 최대 픽셀 값
 * @returns HTMLCanvasElement
 */
function createCanvasFromPixelData(
  pixelData: Uint8Array | Uint16Array | Int16Array,
  rows: number,
  columns: number,
  metadata: DicomPixelMetadata,
  minPixelValue: number,
  maxPixelValue: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = columns
  canvas.height = rows

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    if (DEBUG_BATCH_LOADER) console.error('[WadoRsBulkDataBatchLoader] Failed to get 2d context')
    return canvas
  }

  const imageData = ctx.createImageData(columns, rows)
  const data = imageData.data
  const range = maxPixelValue - minPixelValue || 1
  const invert = metadata.photometricInterpretation === 'MONOCHROME1'

  // Grayscale → RGBA 변환
  for (let i = 0; i < pixelData.length; i++) {
    // 픽셀 값을 0-255 범위로 정규화
    let normalized = ((pixelData[i] - minPixelValue) / range) * 255
    normalized = Math.max(0, Math.min(255, normalized))

    // MONOCHROME1은 반전
    if (invert) {
      normalized = 255 - normalized
    }

    const gray = Math.round(normalized)
    const idx = i * 4
    data[idx] = gray // R
    data[idx + 1] = gray // G
    data[idx + 2] = gray // B
    data[idx + 3] = 255 // A
  }

  ctx.putImageData(imageData, 0, 0)

  if (DEBUG_BATCH_LOADER) {
    if (DEBUG_BATCH_LOADER) if (DEBUG_BATCH_LOADER) console.log('[WadoRsBulkDataBatchLoader] Canvas created:', columns, 'x', rows)
  }

  return canvas
}

/**
 * 배치 프레임 로드 및 Cornerstone 캐시 주입
 *
 * 단일 HTTP 요청으로 여러 프레임을 로드하고 Cornerstone 캐시에 직접 저장.
 * 이후 Cornerstone이 imageId로 요청하면 캐시에서 즉시 반환됨.
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumbers 프레임 번호 배열 (1-based)
 * @param metadata DICOM 픽셀 메타데이터
 * @returns 로드된 프레임 수
 */
export async function loadAndCacheFrameBatch(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string,
  frameNumbers: number[], // 1-based
  metadata: DicomPixelMetadata
): Promise<number> {
  if (frameNumbers.length === 0) {
    return 0
  }

  if (DEBUG_BATCH_LOADER) {
    if (DEBUG_BATCH_LOADER) console.log(
      `[WadoRsBulkDataBatchLoader] Loading frames ${frameNumbers.join(',')} for ${sopInstanceUid}`
    )
  }

  // 1. 배치 API로 여러 프레임 로드
  const frameDataMap = await retrieveFrameBatch(studyUid, seriesUid, sopInstanceUid, frameNumbers)

  if (DEBUG_BATCH_LOADER) {
    if (DEBUG_BATCH_LOADER) if (DEBUG_BATCH_LOADER) console.log(`[WadoRsBulkDataBatchLoader] Received ${frameDataMap.size} frames from API`)
  }

  // 2. 각 프레임을 IImage로 변환하여 캐시에 저장
  let cachedCount = 0
  for (const [frameNumber, pixelData] of frameDataMap) {
    // imageId 생성 (0-based frameNumber 사용)
    const imageId = createWadoRsBulkDataImageId(
      studyUid,
      seriesUid,
      sopInstanceUid,
      frameNumber - 1 // 0-based
    )

    // 캐시에 이미 있는지 확인 (cornerstoneDICOMImageLoader가 먼저 로드한 경우)
    // 기존 IImage를 덮어쓰면 GPU 텍스처 초기화 문제 발생
    const existingImage = cache.getImageLoadObject(imageId)
    if (existingImage) {
      if (DEBUG_BATCH_LOADER) {
        if (DEBUG_BATCH_LOADER) if (DEBUG_BATCH_LOADER) console.log(`[WadoRsBulkDataBatchLoader] Skip caching (already exists): frame ${frameNumber}`)
      }
      cachedCount++ // 이미 캐시된 것도 카운트
      continue
    }

    // IImage 변환
    const image = createImageFromPixelData(imageId, pixelData, metadata)

    // Cornerstone 캐시에 직접 저장
    // ImageLoadObject 형식: { promise: Promise<IImage>, cancelFn?: () => void }
    cache.putImageLoadObject(imageId, {
      promise: Promise.resolve(image),
    })

    cachedCount++

    if (DEBUG_BATCH_LOADER) {
      if (DEBUG_BATCH_LOADER) if (DEBUG_BATCH_LOADER) console.log(`[WadoRsBulkDataBatchLoader] Cached frame ${frameNumber} as ${imageId}`)
    }
  }

  if (DEBUG_BATCH_LOADER) {
    if (DEBUG_BATCH_LOADER) console.log(
      `[WadoRsBulkDataBatchLoader] Batch complete: ${cachedCount} frames cached for ${sopInstanceUid}`
    )
  }

  return cachedCount
}

/**
 * 배치 로딩 통계
 */
interface BatchLoadStats {
  totalBatchRequests: number
  totalFramesLoaded: number
  totalBytesLoaded: number
  avgFramesPerBatch: number
}

// 통계 추적 변수
let totalBatchRequests = 0
let totalFramesLoaded = 0
let totalBytesLoaded = 0

/**
 * 배치 로딩 통계 조회
 */
export function getBatchLoaderStats(): BatchLoadStats {
  return {
    totalBatchRequests,
    totalFramesLoaded,
    totalBytesLoaded,
    avgFramesPerBatch: totalBatchRequests > 0 ? totalFramesLoaded / totalBatchRequests : 0,
  }
}

/**
 * 배치 로딩 통계 리셋
 */
export function resetBatchLoaderStats(): void {
  totalBatchRequests = 0
  totalFramesLoaded = 0
  totalBytesLoaded = 0
}
