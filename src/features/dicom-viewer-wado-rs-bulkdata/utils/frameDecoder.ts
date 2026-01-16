/**
 * frameDecoder.ts
 *
 * 압축된 프레임 데이터를 디코딩하는 유틸리티
 * Cornerstone3D의 코덱을 활용하여 JPEG 2000 등의 압축 데이터를 raw pixels로 변환
 *
 * @see https://www.cornerstonejs.org/docs/concepts/cornerstone-dicom-image-loader
 */

import type { DicomPixelMetadata } from './wadoRsBulkDataMetadataProvider'

// 디버그 로그 플래그
const DEBUG_DECODER = false

// Transfer Syntax UID 상수
export const TRANSFER_SYNTAX = {
  // 비압축
  IMPLICIT_VR_LITTLE_ENDIAN: '1.2.840.10008.1.2',
  EXPLICIT_VR_LITTLE_ENDIAN: '1.2.840.10008.1.2.1',
  EXPLICIT_VR_BIG_ENDIAN: '1.2.840.10008.1.2.2',
  // JPEG 2000
  JPEG_2000_LOSSLESS: '1.2.840.10008.1.2.4.90',
  JPEG_2000: '1.2.840.10008.1.2.4.91',
  // JPEG Baseline
  JPEG_BASELINE: '1.2.840.10008.1.2.4.50',
  JPEG_EXTENDED: '1.2.840.10008.1.2.4.51',
  // JPEG Lossless
  JPEG_LOSSLESS: '1.2.840.10008.1.2.4.57',
  JPEG_LOSSLESS_SV1: '1.2.840.10008.1.2.4.70',
  // JPEG-LS
  JPEG_LS_LOSSLESS: '1.2.840.10008.1.2.4.80',
  JPEG_LS: '1.2.840.10008.1.2.4.81',
  // RLE
  RLE_LOSSLESS: '1.2.840.10008.1.2.5',
} as const

// Content-Type → Transfer Syntax 매핑
const CONTENT_TYPE_TO_TRANSFER_SYNTAX: Record<string, string> = {
  'image/jp2': TRANSFER_SYNTAX.JPEG_2000_LOSSLESS,
  'image/jpeg': TRANSFER_SYNTAX.JPEG_BASELINE,
  'image/jls': TRANSFER_SYNTAX.JPEG_LS_LOSSLESS,
  'application/octet-stream': TRANSFER_SYNTAX.EXPLICIT_VR_LITTLE_ENDIAN,
}

// 코덱 초기화 상태
let jpeg2000Initialized = false
let jpegBaselineInitialized = false

/**
 * JPEG 2000 디코더 초기화 (최초 1회)
 */
export async function initializeJPEG2000Decoder(): Promise<void> {
  if (jpeg2000Initialized) return

  try {
    if (DEBUG_DECODER) console.log('[FrameDecoder] Initializing JPEG 2000 decoder...')

    // Cornerstone DICOM Image Loader 초기화 (코덱 로드 포함)
    // init()이 이미 호출된 경우 내부적으로 무시됨
    // dicomImageLoader.init()은 initCornerstone.ts에서 이미 호출됨
    // 여기서는 플래그만 설정

    jpeg2000Initialized = true
    if (DEBUG_DECODER) console.log('[FrameDecoder] JPEG 2000 decoder initialized')
  } catch (error) {
    console.error('[FrameDecoder] Failed to initialize JPEG 2000 decoder:', error)
    throw error
  }
}

/**
 * JPEG Baseline 디코더 초기화 (최초 1회)
 */
export async function initializeJPEGBaselineDecoder(): Promise<void> {
  if (jpegBaselineInitialized) return

  try {
    if (DEBUG_DECODER) console.log('[FrameDecoder] Initializing JPEG Baseline decoder...')

    // JPEG Baseline은 기본적으로 초기화됨
    jpegBaselineInitialized = true
    if (DEBUG_DECODER) console.log('[FrameDecoder] JPEG Baseline decoder initialized')
  } catch (error) {
    console.error('[FrameDecoder] Failed to initialize JPEG Baseline decoder:', error)
    throw error
  }
}

/**
 * Content-Type이 압축 포맷인지 확인
 *
 * @param contentType Content-Type 문자열
 * @returns 압축 포맷이면 true
 */
export function isCompressedContentType(contentType: string): boolean {
  return contentType !== 'application/octet-stream'
}

/**
 * Content-Type에서 Transfer Syntax UID 추출
 *
 * @param contentType Content-Type 문자열
 * @param transferSyntaxFromHeader Content-Type의 transfer-syntax 파라미터 (있으면 우선 사용)
 * @returns Transfer Syntax UID
 */
export function getTransferSyntaxFromContentType(
  contentType: string,
  transferSyntaxFromHeader?: string
): string {
  // 헤더에서 명시적으로 제공된 경우 우선 사용
  if (transferSyntaxFromHeader) {
    return transferSyntaxFromHeader
  }

  // Content-Type에서 매핑
  return CONTENT_TYPE_TO_TRANSFER_SYNTAX[contentType] || TRANSFER_SYNTAX.EXPLICIT_VR_LITTLE_ENDIAN
}

/**
 * 압축된 프레임 데이터 디코딩
 *
 * @param compressedData 압축된 바이너리 데이터
 * @param contentType Content-Type (image/jp2, application/octet-stream 등)
 * @param metadata 이미지 메타데이터 (rows, columns, bitsAllocated 등)
 * @param transferSyntax Transfer Syntax UID (Content-Type 헤더에서 추출된 경우)
 * @returns 디코딩된 raw pixel ArrayBuffer
 */
export async function decodeCompressedFrame(
  compressedData: ArrayBuffer,
  contentType: string,
  metadata: DicomPixelMetadata,
  transferSyntax?: string
): Promise<ArrayBuffer> {
  // application/octet-stream이면 그대로 반환 (디코딩 불필요)
  if (contentType === 'application/octet-stream') {
    if (DEBUG_DECODER) console.log('[FrameDecoder] Raw pixels, no decoding needed')
    return compressedData
  }

  const effectiveTransferSyntax = getTransferSyntaxFromContentType(contentType, transferSyntax)

  if (DEBUG_DECODER) {
    console.log('[FrameDecoder] Decoding compressed frame:', {
      contentType,
      transferSyntax: effectiveTransferSyntax,
      compressedSize: compressedData.byteLength,
      metadata: { rows: metadata.rows, columns: metadata.columns, bitsAllocated: metadata.bitsAllocated },
    })
  }

  // JPEG 2000 디코딩
  if (contentType === 'image/jp2') {
    return decodeJPEG2000Frame(compressedData, metadata, effectiveTransferSyntax)
  }

  // JPEG Baseline 디코딩
  if (contentType === 'image/jpeg') {
    return decodeJPEGBaselineFrame(compressedData, metadata, effectiveTransferSyntax)
  }

  // 지원하지 않는 포맷
  console.warn(`[FrameDecoder] Unsupported content type: ${contentType}, returning as-is`)
  return compressedData
}

/**
 * JPEG 2000 프레임 디코딩
 *
 * @param compressedData JPEG 2000 압축 데이터
 * @param metadata 이미지 메타데이터
 * @param transferSyntax Transfer Syntax UID
 * @returns 디코딩된 raw pixels
 */
async function decodeJPEG2000Frame(
  compressedData: ArrayBuffer,
  metadata: DicomPixelMetadata,
  transferSyntax: string
): Promise<ArrayBuffer> {
  await initializeJPEG2000Decoder()

  try {
    // ImageFrame 객체 생성 (Cornerstone 디코더 요구사항)
    const imageFrame = createImageFrame(metadata)

    // 압축 데이터를 Uint8Array로 변환
    const encodedPixelData = new Uint8Array(compressedData)

    // Cornerstone의 decodeImageFrame 사용
    // 이 함수는 내부적으로 Web Worker를 통해 WASM 코덱 호출
    const decodedFrame = await decodeImageFrameWithCodec(
      imageFrame,
      transferSyntax,
      encodedPixelData,
      metadata
    )

    if (DEBUG_DECODER) {
      console.log('[FrameDecoder] JPEG 2000 decoded:', {
        compressedSize: compressedData.byteLength,
        decodedSize: decodedFrame.byteLength,
        ratio: (compressedData.byteLength / decodedFrame.byteLength * 100).toFixed(1) + '%',
      })
    }

    return decodedFrame

  } catch (error) {
    console.error('[FrameDecoder] JPEG 2000 decoding failed:', error)
    throw new Error(`JPEG 2000 decoding failed: ${error}`)
  }
}

/**
 * JPEG Baseline 프레임 디코딩
 *
 * @param compressedData JPEG 압축 데이터
 * @param metadata 이미지 메타데이터
 * @param transferSyntax Transfer Syntax UID
 * @returns 디코딩된 raw pixels
 */
async function decodeJPEGBaselineFrame(
  compressedData: ArrayBuffer,
  metadata: DicomPixelMetadata,
  transferSyntax: string
): Promise<ArrayBuffer> {
  await initializeJPEGBaselineDecoder()

  try {
    const imageFrame = createImageFrame(metadata)
    const encodedPixelData = new Uint8Array(compressedData)

    const decodedFrame = await decodeImageFrameWithCodec(
      imageFrame,
      transferSyntax,
      encodedPixelData,
      metadata
    )

    if (DEBUG_DECODER) {
      console.log('[FrameDecoder] JPEG Baseline decoded:', {
        compressedSize: compressedData.byteLength,
        decodedSize: decodedFrame.byteLength,
      })
    }

    return decodedFrame

  } catch (error) {
    console.error('[FrameDecoder] JPEG Baseline decoding failed:', error)
    throw new Error(`JPEG Baseline decoding failed: ${error}`)
  }
}

/**
 * ImageFrame 객체 생성 (Cornerstone 디코더 요구사항)
 */
function createImageFrame(metadata: DicomPixelMetadata): Record<string, unknown> {
  return {
    rows: metadata.rows,
    columns: metadata.columns,
    bitsAllocated: metadata.bitsAllocated,
    bitsStored: metadata.bitsStored,
    highBit: metadata.highBit,
    pixelRepresentation: metadata.pixelRepresentation,
    samplesPerPixel: metadata.samplesPerPixel,
    photometricInterpretation: metadata.photometricInterpretation,
    pixelData: undefined,
  }
}

/**
 * Cornerstone 디코더를 통한 이미지 프레임 디코딩
 *
 * 지원되는 디코딩 방법:
 * 1. JPEG Baseline/Extended: Canvas API (브라우저 네이티브)
 * 2. JPEG 2000: Cornerstone의 imageLoader 통한 디코딩
 *
 * 참고: JPEG 2000 클라이언트 디코딩은 Web Worker를 통해 수행됨
 */
async function decodeImageFrameWithCodec(
  imageFrame: Record<string, unknown>,
  transferSyntax: string,
  encodedPixelData: Uint8Array,
  metadata: DicomPixelMetadata
): Promise<ArrayBuffer> {
  // JPEG Baseline/Extended의 경우 Canvas API 사용 (가장 빠름)
  if (transferSyntax === TRANSFER_SYNTAX.JPEG_BASELINE ||
      transferSyntax === TRANSFER_SYNTAX.JPEG_EXTENDED) {
    return decodeJPEGWithCanvas(encodedPixelData, metadata)
  }

  // JPEG 2000 디코딩: Cornerstone의 디코더 사용 시도
  if (transferSyntax === TRANSFER_SYNTAX.JPEG_2000 ||
      transferSyntax === TRANSFER_SYNTAX.JPEG_2000_LOSSLESS) {
    try {
      return await decodeJPEG2000WithCornerstone(imageFrame, encodedPixelData, metadata)
    } catch (error) {
      if (DEBUG_DECODER) {
        console.warn('[FrameDecoder] JPEG 2000 client-side decode failed, fallback to server:', error)
      }
      // 클라이언트 디코딩 실패 시 에러 발생 → 서버 사이드 디코딩 유도
      throw new Error(`JPEG 2000 client-side decoding failed: ${error}. Use raw format for server-side decoding.`)
    }
  }

  // 지원하지 않는 Transfer Syntax
  throw new Error(`Direct codec call not implemented for ${transferSyntax}. Need server-side decoding.`)
}

/**
 * JPEG 2000 디코딩 (Cornerstone의 Web Worker 디코더 활용)
 *
 * Cornerstone3D의 dicom-image-loader는 내부적으로 OpenJPEG WASM 코덱을 사용
 * 이 함수는 Cornerstone의 디코딩 파이프라인을 직접 호출하여 프레임 디코딩
 */
async function decodeJPEG2000WithCornerstone(
  _imageFrame: Record<string, unknown>,
  encodedPixelData: Uint8Array,
  metadata: DicomPixelMetadata
): Promise<ArrayBuffer> {
  // Cornerstone의 dicom-image-loader에서 decodeImageFrame을 사용하려면
  // 완전한 imageFrame 객체가 필요함
  // 현재는 직접 WASM 코덱 호출 대신 imageLoader를 통한 디코딩 권장

  // 옵션 1: @cornerstonejs/codec-openjpeg 직접 호출 시도
  try {
    // 동적 import로 코덱 로드
    const openjpegModule = await import('@cornerstonejs/codec-openjpeg')

    if (openjpegModule && typeof openjpegModule.decode === 'function') {
      const decodeOptions = {
        rows: metadata.rows,
        columns: metadata.columns,
        bitsAllocated: metadata.bitsAllocated,
        bitsStored: metadata.bitsStored,
        highBit: metadata.highBit,
        pixelRepresentation: metadata.pixelRepresentation,
        samplesPerPixel: metadata.samplesPerPixel,
      }

      const decodedFrame = await openjpegModule.decode(encodedPixelData, decodeOptions)

      if (DEBUG_DECODER) {
        console.log('[FrameDecoder] JPEG 2000 decoded via @cornerstonejs/codec-openjpeg:', {
          inputSize: encodedPixelData.byteLength,
          outputSize: decodedFrame.byteLength,
        })
      }

      return decodedFrame.buffer || decodedFrame
    }
  } catch (codecError) {
    if (DEBUG_DECODER) {
      console.warn('[FrameDecoder] @cornerstonejs/codec-openjpeg not available:', codecError)
    }
  }

  // 옵션 2: dicom-image-loader의 내부 디코더 호출 시도
  try {
    const dicomImageLoader = await import('@cornerstonejs/dicom-image-loader')

    // decodeImageFrame이 export되어 있는지 확인
    if (dicomImageLoader && typeof dicomImageLoader.decodeImageFrame === 'function') {
      return new Promise((resolve, reject) => {
        const imageFrame = {
          rows: metadata.rows,
          columns: metadata.columns,
          bitsAllocated: metadata.bitsAllocated,
          bitsStored: metadata.bitsStored,
          highBit: metadata.highBit,
          pixelRepresentation: metadata.pixelRepresentation,
          samplesPerPixel: metadata.samplesPerPixel,
          photometricInterpretation: metadata.photometricInterpretation,
          pixelData: encodedPixelData,
        }

        const decodeConfig = {}
        const options = {}

        dicomImageLoader.decodeImageFrame(
          imageFrame,
          TRANSFER_SYNTAX.JPEG_2000_LOSSLESS,
          encodedPixelData,
          decodeConfig,
          options,
          (decodedFrame: unknown, error: Error | null) => {
            if (error) {
              reject(error)
            } else if (decodedFrame && typeof decodedFrame === 'object' && 'pixelData' in decodedFrame) {
              const frame = decodedFrame as { pixelData: Uint8Array | ArrayBuffer }
              const pixelData = frame.pixelData
              resolve(pixelData instanceof ArrayBuffer ? pixelData : pixelData.buffer)
            } else {
              reject(new Error('Invalid decoded frame result'))
            }
          }
        )
      })
    }
  } catch (loaderError) {
    if (DEBUG_DECODER) {
      console.warn('[FrameDecoder] dicom-image-loader decodeImageFrame not available:', loaderError)
    }
  }

  // 모든 클라이언트 디코딩 옵션 실패
  throw new Error('No JPEG 2000 decoder available. Server-side decoding required.')
}

/**
 * Canvas API를 통한 JPEG 디코딩 (Baseline/Extended 전용)
 *
 * @param jpegData JPEG 바이너리 데이터
 * @param metadata 이미지 메타데이터
 * @returns 디코딩된 raw pixels (RGBA 또는 Grayscale)
 */
async function decodeJPEGWithCanvas(
  jpegData: Uint8Array,
  metadata: DicomPixelMetadata
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    // Uint8Array를 새 ArrayBuffer로 복사하여 Blob 생성 (SharedArrayBuffer 타입 문제 회피)
    const arrayBuffer = new ArrayBuffer(jpegData.byteLength)
    new Uint8Array(arrayBuffer).set(jpegData)
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      canvas.width = metadata.columns
      canvas.height = metadata.rows

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, metadata.columns, metadata.rows)
      const imageData = ctx.getImageData(0, 0, metadata.columns, metadata.rows)

      // RGBA → Grayscale 변환 (samplesPerPixel=1인 경우)
      if (metadata.samplesPerPixel === 1) {
        const grayscale = new Uint8Array(metadata.rows * metadata.columns)
        for (let i = 0; i < grayscale.length; i++) {
          // 단순 평균 (R+G+B)/3
          grayscale[i] = Math.round(
            (imageData.data[i * 4] + imageData.data[i * 4 + 1] + imageData.data[i * 4 + 2]) / 3
          )
        }
        resolve(grayscale.buffer)
      } else {
        // RGB/RGBA 그대로 반환
        resolve(imageData.data.buffer)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to decode JPEG image'))
    }

    img.src = url
  })
}

/**
 * 디코더 초기화 (모든 지원 코덱)
 * 앱 시작 시 또는 첫 압축 데이터 수신 전 호출 권장
 */
export async function initializeAllDecoders(): Promise<void> {
  await Promise.all([
    initializeJPEG2000Decoder(),
    initializeJPEGBaselineDecoder(),
  ])
}
