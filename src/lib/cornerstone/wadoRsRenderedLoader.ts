/**
 * WADO-RS Rendered API용 Cornerstone.js 커스텀 이미지 로더
 *
 * imageId 형식: 'wadors-rendered:{studyUid}:{seriesUid}:{instanceUid}:{frameNumber}'
 * frameNumber는 0-based (API 호출 시 +1 변환)
 *
 * mini-pacs-poc 참고
 */
import { imageLoader, type Types } from '@cornerstonejs/core'
import { getRenderedFrame } from '@/lib/services/dicomWebService'

const SCHEME = 'wadors-rendered'

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
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(blob)

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      img.onload = null
      img.onerror = null
      img.src = ''
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          cleanup()
          reject(new Error('Failed to get canvas 2d context'))
          return
        }

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        cleanup()
        resolve(imageData)
      } catch (e) {
        cleanup()
        reject(e)
      }
    }

    img.onerror = () => {
      cleanup()
      reject(new Error('Failed to load image from blob'))
    }

    img.src = objectUrl
  })
}

/**
 * WADO-RS Rendered API에서 이미지 로드
 */
async function loadImageAsync(imageId: string): Promise<Types.IImage> {
  const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, frameNumber } =
    parseImageId(imageId)

  // WADO-RS Rendered API 호출 (frameNumber는 0-based이므로 +1 필요)
  const blob = await getRenderedFrame(
    studyInstanceUid,
    seriesInstanceUid,
    sopInstanceUid,
    frameNumber + 1 // API는 1-based
  )

  if (blob.size === 0) {
    throw new Error(`Empty response for frame ${frameNumber}`)
  }

  const imageData = await blobToImageData(blob)

  // 캐시된 canvas 생성 (getCanvas 호출 시마다 새로 생성하지 않도록)
  let cachedCanvas: HTMLCanvasElement | null = null

  // Cornerstone IImage 객체 반환
  // Canvas getImageData()는 항상 RGBA (4채널) Uint8ClampedArray 반환
  const image = {
    imageId,
    columns: imageData.width,
    rows: imageData.height,
    width: imageData.width,
    height: imageData.height,
    // CRITICAL: Uint8Array로 변환 (Cornerstone 렌더링 파이프라인 요구사항)
    getPixelData: () => new Uint8Array(imageData.data),
    getCanvas: () => {
      if (!cachedCanvas) {
        cachedCanvas = document.createElement('canvas')
        cachedCanvas.width = imageData.width
        cachedCanvas.height = imageData.height
        const ctx = cachedCanvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.putImageData(imageData, 0, 0)
        }
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
    rgba: true,
    // CRITICAL: Canvas는 RGBA 4채널 반환 → 일관성 유지
    photometricInterpretation: 'RGBA',
    samplesPerPixel: 4, // Canvas getImageData = RGBA (4채널)
    columnPixelSpacing: 1,
    rowPixelSpacing: 1,
    sizeInBytes: imageData.data.length,
    invert: false,
    numberOfComponents: 4, // RGBA
    // CRITICAL: dataType 필수 - Cornerstone이 픽셀 데이터 해석에 사용
    dataType: 'Uint8Array',
    voiLUTFunction: undefined,
    modalityLUT: undefined,
    voiLUT: undefined,
  }

  return image as unknown as Types.IImage
}

/**
 * Cornerstone ImageLoaderFn 형식의 로더 함수
 */
function loadImage(imageId: string) {
  return {
    promise: loadImageAsync(imageId),
  }
}

/**
 * WADO-RS Rendered 로더를 Cornerstone에 등록
 */
export function registerWadoRsRenderedLoader(): void {
  console.log('[Cornerstone] Registering wadors-rendered loader')
  imageLoader.registerImageLoader(SCHEME, loadImage as unknown as Types.ImageLoaderFn)
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
