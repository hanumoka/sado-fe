/**
 * HybridMetadataProvider
 *
 * 하이브리드 뷰어 전용 DICOM 메타데이터 프로바이더
 * Cornerstone의 wadors 로더가 PixelData를 디코딩하는데 필요한 메타데이터 제공
 *
 * 기존 wadoRsBulkDataMetadataProvider.ts와 동일한 로직이지만
 * 사이드이펙트 방지를 위해 독립적으로 정의
 *
 * 주의: 기존 뷰어의 store/manager 임포트 금지
 */

import { metaData } from '@cornerstonejs/core'
import { getTenantId } from '@/lib/tenantStore'
import { withRetry } from '@/lib/errors'

// 디버그 로그 플래그
const DEBUG_PROVIDER = false

// API 기본 경로 (Vite 프록시 사용)
const API_BASE = ''

/**
 * DICOM 픽셀 메타데이터
 */
export interface HybridPixelMetadata {
  rows: number
  columns: number
  samplesPerPixel: number
  photometricInterpretation: string
  bitsAllocated: number
  bitsStored: number
  highBit: number
  pixelRepresentation: number
  numberOfFrames: number
  transferSyntaxUid: string
}

// 하이브리드 뷰어 전용 메타데이터 캐시
const hybridMetadataCache = new Map<string, HybridPixelMetadata>()

// 진행 중인 fetch 요청 (중복 방지)
const pendingFetches = new Map<string, Promise<HybridPixelMetadata>>()

/**
 * wadors: imageId에서 UID 추출
 */
function parseWadoRsImageId(imageId: string): {
  studyUid: string
  seriesUid: string
  sopInstanceUid: string
} | null {
  try {
    const url = imageId.replace('wadors:', '')
    const match = url.match(
      /\/studies\/([^/]+)\/series\/([^/]+)\/instances\/([^/]+)\/frames/
    )

    if (!match) {
      return null
    }

    return {
      studyUid: match[1],
      seriesUid: match[2],
      sopInstanceUid: match[3],
    }
  } catch {
    return null
  }
}

/**
 * DICOM JSON 값 추출 헬퍼
 */
function getDicomValue<T>(dicomJson: Record<string, unknown>, tag: string): T | undefined {
  const element = dicomJson[tag] as { Value?: T[] } | undefined
  return element?.Value?.[0]
}

/**
 * 백엔드에서 메타데이터를 조회하고 캐시에 저장
 */
export async function fetchHybridMetadata(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): Promise<HybridPixelMetadata> {
  // 캐시 확인
  const cached = hybridMetadataCache.get(sopInstanceUid)
  if (cached) {
    return cached
  }

  // 진행 중인 요청 확인
  const pending = pendingFetches.get(sopInstanceUid)
  if (pending) {
    return pending
  }

  // 새 요청 생성
  const fetchPromise = withRetry(
    () => fetchMetadataFromBackend(studyUid, seriesUid, sopInstanceUid),
    { maxRetries: 2, retryDelay: 500, useBackoff: true }
  )
  pendingFetches.set(sopInstanceUid, fetchPromise)

  try {
    const metadata = await fetchPromise
    return metadata
  } finally {
    pendingFetches.delete(sopInstanceUid)
  }
}

/**
 * 백엔드 API에서 메타데이터 조회
 */
async function fetchMetadataFromBackend(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): Promise<HybridPixelMetadata> {
  const url = `${API_BASE}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/metadata`

  const headers: Record<string, string> = {
    Accept: 'application/dicom+json',
  }

  const tenantId = getTenantId()
  if (tenantId !== undefined && tenantId !== null) {
    headers['X-Tenant-Id'] = String(tenantId)
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Invalid metadata response format for ${sopInstanceUid}`)
  }

  const dicomJson = data[0] as Record<string, unknown>

  if (!dicomJson || typeof dicomJson !== 'object') {
    throw new Error(`Malformed DICOM JSON for ${sopInstanceUid}`)
  }

  const rows = getDicomValue<number>(dicomJson, '00280010')
  const columns = getDicomValue<number>(dicomJson, '00280011')

  const metadata: HybridPixelMetadata = {
    rows: rows ?? 512,
    columns: columns ?? 512,
    samplesPerPixel: getDicomValue<number>(dicomJson, '00280002') ?? 1,
    photometricInterpretation: getDicomValue<string>(dicomJson, '00280004') ?? 'MONOCHROME2',
    bitsAllocated: getDicomValue<number>(dicomJson, '00280100') ?? 16,
    bitsStored: getDicomValue<number>(dicomJson, '00280101') ?? 16,
    highBit: getDicomValue<number>(dicomJson, '00280102') ?? 15,
    pixelRepresentation: getDicomValue<number>(dicomJson, '00280103') ?? 0,
    numberOfFrames: parseInt(getDicomValue<string>(dicomJson, '00280008') ?? '1', 10),
    transferSyntaxUid: getDicomValue<string>(dicomJson, '00020010') ?? '1.2.840.10008.1.2.1',
  }

  // 캐시에 저장
  hybridMetadataCache.set(sopInstanceUid, metadata)
  if (DEBUG_PROVIDER) {
    console.log(`[HybridMetadataProvider] Metadata cached for ${sopInstanceUid}`)
  }

  return metadata
}

/**
 * Cornerstone 메타데이터 프로바이더 함수
 */
function hybridMetadataProvider(type: string, imageId: string): unknown {
  // wadors: 스킴만 처리
  if (!imageId.startsWith('wadors:')) {
    return undefined
  }

  const parsed = parseWadoRsImageId(imageId)
  if (!parsed) {
    return undefined
  }

  const cached = hybridMetadataCache.get(parsed.sopInstanceUid)
  if (!cached) {
    return undefined
  }

  switch (type) {
    case 'imagePixelModule':
      return {
        pixelRepresentation: cached.pixelRepresentation,
        bitsAllocated: cached.bitsAllocated,
        bitsStored: cached.bitsStored,
        highBit: cached.highBit,
        samplesPerPixel: cached.samplesPerPixel,
        photometricInterpretation: cached.photometricInterpretation,
        rows: cached.rows,
        columns: cached.columns,
      }

    case 'voiLutModule':
      if (cached.photometricInterpretation?.startsWith('MONOCHROME')) {
        const maxValue = Math.pow(2, cached.bitsStored) - 1
        return {
          windowCenter: [maxValue / 2],
          windowWidth: [maxValue],
        }
      }
      return undefined

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
        modality: 'OT',
      }

    case 'transferSyntax':
      return cached.transferSyntaxUid

    default:
      return undefined
  }
}

// 프로바이더 등록 여부 플래그
let isProviderRegistered = false

/**
 * 메타데이터 프로바이더를 Cornerstone에 등록
 */
export function registerHybridMetadataProvider(): void {
  if (isProviderRegistered) {
    return
  }

  // 높은 우선순위로 등록
  metaData.addProvider(hybridMetadataProvider, 10001)
  isProviderRegistered = true

  if (DEBUG_PROVIDER) {
    console.log('[HybridMetadataProvider] Provider registered')
  }
}

/**
 * 메타데이터 캐시 초기화
 */
export function clearHybridMetadataCache(): void {
  hybridMetadataCache.clear()
  pendingFetches.clear()
}

/**
 * 특정 인스턴스의 캐시된 메타데이터 조회
 */
export function getCachedHybridMetadata(sopInstanceUid: string): HybridPixelMetadata | undefined {
  return hybridMetadataCache.get(sopInstanceUid)
}
