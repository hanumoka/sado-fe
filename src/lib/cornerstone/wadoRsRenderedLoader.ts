/**
 * WADO-RS Rendered API용 Cornerstone.js 커스텀 이미지 로더
 *
 * imageId 형식: 'wadors-rendered:{studyUid}:{seriesUid}:{instanceUid}:{frameNumber}'
 * frameNumber는 0-based (API 호출 시 +1 변환)
 *
 * mini-pacs-poc 참고
 */
import { imageLoader, metaData, type Types } from '@cornerstonejs/core'
import { getRenderedFrame } from '@/lib/services/dicomWebService'

const SCHEME = 'wadors-rendered'

// 이미지별 메타데이터 캐시
const imageMetadataCache = new Map<string, {
  rows: number
  columns: number
  samplesPerPixel: number
}>()

interface WadoRsRenderedImageId {
  studyInstanceUid: string
  seriesInstanceUid: string
  sopInstanceUid: string
  frameNumber: number // 0-based
}

/**
 * imageId 파싱
 * @param imageId 'wadors-rendered:studyUid:seriesUid:instanceUid:frameNumber'
 */
function parseImageId(imageId: string): WadoRsRenderedImageId {
  const parts = imageId.split(':')
  // 'wadors-rendered' : 'studyUid' : 'seriesUid' : 'instanceUid' : 'frameNumber'
  if (parts.length < 5) {
    throw new Error(`Invalid wadors-rendered imageId format: ${imageId}`)
  }
  return {
    studyInstanceUid: parts[1],
    seriesInstanceUid: parts[2],
    sopInstanceUid: parts[3],
    frameNumber: parseInt(parts[4], 10),
  }
}

/**
 * Blob을 ImageData로 변환
 * JPEG/PNG 이미지를 Canvas에 그려서 픽셀 데이터 추출
 * 메모리 누수 방지를 위해 모든 리소스를 명시적으로 정리
 */
async function blobToImageData(blob: Blob): Promise<ImageData> {
  console.log('[wadors-rendered] blobToImageData START - blob:', { size: blob.size, type: blob.type })

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(blob)
    console.log('[wadors-rendered] blobToImageData - objectUrl created:', objectUrl)

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      img.onload = null
      img.onerror = null
      img.src = ''
    }

    img.onload = () => {
      console.log('[wadors-rendered] blobToImageData - img.onload fired, size:', img.width, 'x', img.height)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          console.error('[wadors-rendered] blobToImageData - Failed to get 2d context')
          cleanup()
          reject(new Error('Failed to get canvas 2d context'))
          return
        }

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        console.log('[wadors-rendered] blobToImageData - ImageData extracted:', imageData.width, 'x', imageData.height)
        cleanup()
        resolve(imageData)
      } catch (e) {
        console.error('[wadors-rendered] blobToImageData - Error in onload:', e)
        cleanup()
        reject(e)
      }
    }

    img.onerror = (e) => {
      console.error('[wadors-rendered] blobToImageData - img.onerror fired:', e)
      cleanup()
      reject(new Error('Failed to load image from blob'))
    }

    img.src = objectUrl
    console.log('[wadors-rendered] blobToImageData - img.src set, waiting for onload...')
  })
}


/**
 * WADO-RS Rendered API에서 이미지 로드
 */
async function loadImageAsync(imageId: string): Promise<Types.IImage> {
  console.log('[wadors-rendered] loadImageAsync called:', imageId)

  const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, frameNumber } =
    parseImageId(imageId)

  console.log('[wadors-rendered] Parsed imageId:', { studyInstanceUid, seriesInstanceUid, sopInstanceUid, frameNumber })

  // WADO-RS Rendered API 호출 (frameNumber는 0-based이므로 +1 필요)
  console.log('[wadors-rendered] Calling getRenderedFrame for frame:', frameNumber + 1)

  let blob: Blob
  try {
    blob = await getRenderedFrame(
      studyInstanceUid,
      seriesInstanceUid,
      sopInstanceUid,
      frameNumber + 1 // API는 1-based
    )
    console.log('[wadors-rendered] Blob received:', { size: blob.size, type: blob.type })
  } catch (error) {
    console.error('[wadors-rendered] getRenderedFrame FAILED:', error)
    throw error
  }

  if (blob.size === 0) {
    throw new Error(`Empty response for frame ${frameNumber}`)
  }

  const imageData = await blobToImageData(blob)
  console.log('[wadors-rendered] ImageData created:', { width: imageData.width, height: imageData.height, dataLength: imageData.data.length })

  // 이미지 크기가 0인 경우 에러
  if (imageData.width === 0 || imageData.height === 0) {
    throw new Error(`Invalid image dimensions: ${imageData.width}x${imageData.height}`)
  }

  // 캐시된 canvas (getCanvas 호출 시마다 새로 생성하지 않도록)
  let cachedCanvas: HTMLCanvasElement | null = null

  // Cornerstone IImage 객체 반환
  // mini-pacs-poc 참조 프로젝트 구현 적용: RGBA (4채널) 직접 사용
  const image = {
    imageId,
    columns: imageData.width,
    rows: imageData.height,
    width: imageData.width,
    height: imageData.height,
    // CRITICAL: RGBA 데이터 직접 반환 (Uint8Array로 변환)
    getPixelData: () => {
      console.log('[wadors-rendered] ⚠️ getPixelData CALLED - GPU rendering path')
      return new Uint8Array(imageData.data)
    },
    getCanvas: () => {
      console.log('[wadors-rendered] ✅ getCanvas CALLED - CPU rendering path')
      if (!cachedCanvas) {
        cachedCanvas = document.createElement('canvas')
        cachedCanvas.width = imageData.width
        cachedCanvas.height = imageData.height
        const ctx = cachedCanvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.putImageData(imageData, 0, 0)
        }
        console.log('[wadors-rendered] Canvas created:', cachedCanvas.width, 'x', cachedCanvas.height)
      }
      return cachedCanvas
    },
    minPixelValue: 0,
    maxPixelValue: 255,
    slope: 1,
    intercept: 0,
    windowCenter: 128,
    windowWidth: 256,
    color: true,
    rgba: true,                           // CRITICAL: true (RGBA 사용)
    photometricInterpretation: 'RGBA',    // CRITICAL: 추가
    samplesPerPixel: 4,                   // CRITICAL: 4채널
    columnPixelSpacing: 1,
    rowPixelSpacing: 1,
    sizeInBytes: imageData.data.length,   // 4채널 크기
    invert: false,
    numberOfComponents: 4,                // CRITICAL: 4채널
    dataType: 'Uint8Array',               // CRITICAL: 필수!
    voiLUTFunction: undefined,
    modalityLUT: undefined,
    voiLUT: undefined,
  }

  // 메타데이터 캐시에 저장
  imageMetadataCache.set(imageId, {
    rows: imageData.height,
    columns: imageData.width,
    samplesPerPixel: 4,
  })

  console.log('[wadors-rendered] IImage object created:', {
    imageId,
    rows: image.rows,
    columns: image.columns,
    color: image.color,
    rgba: image.rgba,
    numberOfComponents: image.numberOfComponents,
    sizeInBytes: image.sizeInBytes,
    dataType: image.dataType,
  })

  return image as unknown as Types.IImage
}

/**
 * Cornerstone ImageLoaderFn 형식의 로더 함수
 */
function loadImage(imageId: string) {
  console.log('[wadors-rendered] loadImage called:', imageId)
  const promise = loadImageAsync(imageId)

  // Promise 에러 핸들링 추가
  promise.catch((error) => {
    console.error('[wadors-rendered] loadImageAsync failed:', error)
  })

  return {
    promise,
  }
}

/**
 * WADO-RS Rendered 이미지용 메타데이터 프로바이더
 * Cornerstone이 imageId에 대한 메타데이터를 요청할 때 호출됨
 */
function wadoRsRenderedMetadataProvider(type: string, imageId: string): unknown {
  // 우리 스킴이 아니면 무시
  if (!imageId.startsWith(SCHEME)) {
    return undefined
  }

  const cached = imageMetadataCache.get(imageId)

  // 캐시된 메타데이터가 없으면 기본값 사용
  const rows = cached?.rows ?? 512
  const columns = cached?.columns ?? 512
  const samplesPerPixel = cached?.samplesPerPixel ?? 4

  switch (type) {
    case 'imagePixelModule':
      return {
        pixelRepresentation: 0, // unsigned
        bitsAllocated: 8,
        bitsStored: 8,
        highBit: 7,
        samplesPerPixel,
        photometricInterpretation: 'RGB',
        rows,
        columns,
      }

    case 'voiLutModule':
      return {
        windowCenter: [128],
        windowWidth: [256],
      }

    case 'modalityLutModule':
      return {
        rescaleIntercept: 0,
        rescaleSlope: 1,
      }

    case 'imagePlaneModule':
      return {
        rowCosines: [1, 0, 0],
        columnCosines: [0, 1, 0],
        imagePositionPatient: [0, 0, 0],
        rowPixelSpacing: 1,
        columnPixelSpacing: 1,
        sliceThickness: 1,
      }

    case 'generalSeriesModule':
      return {
        modality: 'OT', // Other
      }

    default:
      return undefined
  }
}

/**
 * WADO-RS Rendered 로더를 Cornerstone에 등록
 */
export function registerWadoRsRenderedLoader(): void {
  console.log('[Cornerstone] Registering wadors-rendered loader')
  imageLoader.registerImageLoader(SCHEME, loadImage as unknown as Types.ImageLoaderFn)

  // 메타데이터 프로바이더 등록
  metaData.addProvider(wadoRsRenderedMetadataProvider, 10000) // 높은 우선순위
  console.log('[Cornerstone] Registered wadors-rendered metadata provider')
}

/**
 * WADO-RS Rendered imageId 생성
 * @param studyInstanceUid Study Instance UID
 * @param seriesInstanceUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param frameNumber 0-based 프레임 번호
 */
export function createWadoRsRenderedImageId(
  studyInstanceUid: string,
  seriesInstanceUid: string,
  sopInstanceUid: string,
  frameNumber: number
): string {
  return `${SCHEME}:${studyInstanceUid}:${seriesInstanceUid}:${sopInstanceUid}:${frameNumber}`
}

/**
 * WADO-RS Rendered imageId 배열 생성 (전체 프레임)
 * @param studyInstanceUid Study Instance UID
 * @param seriesInstanceUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @param numberOfFrames 총 프레임 수
 */
export function createWadoRsRenderedImageIds(
  studyInstanceUid: string,
  seriesInstanceUid: string,
  sopInstanceUid: string,
  numberOfFrames: number
): string[] {
  const imageIds: string[] = []
  for (let i = 0; i < numberOfFrames; i++) {
    imageIds.push(
      createWadoRsRenderedImageId(studyInstanceUid, seriesInstanceUid, sopInstanceUid, i)
    )
  }
  return imageIds
}

export { SCHEME as WADORS_RENDERED_SCHEME }
