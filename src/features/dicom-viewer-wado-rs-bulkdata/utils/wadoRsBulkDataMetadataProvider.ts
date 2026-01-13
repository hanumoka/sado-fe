/**
 * wadoRsBulkDataMetadataProvider.ts
 *
 * WADO-RS BulkData (wadors: scheme) 메타데이터 프로바이더
 *
 * Cornerstone의 wadors 로더가 PixelData를 디코딩하려면 메타데이터가 필요합니다.
 * 이 프로바이더는:
 * 1. 백엔드 /metadata 엔드포인트에서 DICOM 메타데이터를 조회
 * 2. 메타데이터를 캐시에 저장
 * 3. Cornerstone이 요청할 때 적절한 형식으로 반환
 *
 * @see https://www.cornerstonejs.org/docs/concepts/cornerstone-core/metadataproviders
 */
import { metaData } from '@cornerstonejs/core'
import { getTenantId } from '@/lib/tenantStore'
import { API_BASE_URL } from '@/lib/config'
import { withRetry } from '@/lib/errors'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_PROVIDER = false

const API_BASE = API_BASE_URL

/**
 * DICOM 픽셀 메타데이터
 */
export interface DicomPixelMetadata {
  rows: number
  columns: number
  samplesPerPixel: number
  photometricInterpretation: string
  bitsAllocated: number
  bitsStored: number
  highBit: number
  pixelRepresentation: number
  numberOfFrames: number
  transferSyntaxUid: string  // Transfer Syntax UID (서버에서 디코딩된 raw pixels 형식)
}

// 메타데이터 캐시: sopInstanceUid → metadata
const metadataCache = new Map<string, DicomPixelMetadata>()

// 진행 중인 fetch 요청 (중복 방지)
const pendingFetches = new Map<string, Promise<DicomPixelMetadata>>()

/**
 * wadors: imageId에서 UID 추출
 *
 * @param imageId wadors:http://host/dicomweb/studies/{study}/series/{series}/instances/{instance}/frames/{frame}
 * @returns 추출된 UID 또는 null
 */
function parseWadoRsImageId(imageId: string): {
  studyUid: string
  seriesUid: string
  sopInstanceUid: string
} | null {
  try {
    // wadors: 스킴 제거
    const url = imageId.replace('wadors:', '')

    // URL 패턴 매칭
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
 *
 * @param studyUid Study Instance UID
 * @param seriesUid Series Instance UID
 * @param sopInstanceUid SOP Instance UID
 * @returns DICOM 픽셀 메타데이터
 */
export async function fetchAndCacheMetadata(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): Promise<DicomPixelMetadata> {
  // 1. 캐시 확인
  const cached = metadataCache.get(sopInstanceUid)
  if (cached) {
    return cached
  }

  // 2. 진행 중인 요청 확인 (중복 방지)
  const pending = pendingFetches.get(sopInstanceUid)
  if (pending) {
    return pending
  }

  // 3. 새 요청 생성 (withRetry로 재시도)
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
 * 백엔드 API에서 메타데이터 조회 (내부 함수)
 */
async function fetchMetadataFromBackend(
  studyUid: string,
  seriesUid: string,
  sopInstanceUid: string
): Promise<DicomPixelMetadata> {
  const url = `${API_BASE}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/metadata`

  // 헤더 설정
  const headers: Record<string, string> = {
    Accept: 'application/dicom+json',
  }

  // 멀티테넌시 지원
  const tenantId = getTenantId()
  if (tenantId !== undefined && tenantId !== null) {
    headers['X-Tenant-Id'] = String(tenantId)
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // DICOM JSON 배열의 첫 번째 객체
  const dicomJson = data[0] as Record<string, unknown>

  if (!dicomJson) {
    throw new Error(`Empty metadata response for ${sopInstanceUid}`)
  }

  // DICOM JSON 파싱 - 필수 메타데이터 검증
  const rows = getDicomValue<number>(dicomJson, '00280010')
  const columns = getDicomValue<number>(dicomJson, '00280011')

  // 필수 이미지 차원 메타데이터 검증
  if (!rows || !columns) {
    console.warn(
      `[WadoRsBulkDataMetadataProvider] Missing required DICOM dimensions for ${sopInstanceUid}: ` +
        `Rows=${rows}, Columns=${columns}. Using defaults (512x512).`
    )
  }

  // 비정상적인 값 검증
  if (rows && (rows < 1 || rows > 65535)) {
    console.warn(`[WadoRsBulkDataMetadataProvider] Invalid Rows value: ${rows}`)
  }
  if (columns && (columns < 1 || columns > 65535)) {
    console.warn(`[WadoRsBulkDataMetadataProvider] Invalid Columns value: ${columns}`)
  }

  const metadata: DicomPixelMetadata = {
    rows: rows ?? 512,
    columns: columns ?? 512,
    samplesPerPixel: getDicomValue<number>(dicomJson, '00280002') ?? 1,
    photometricInterpretation: getDicomValue<string>(dicomJson, '00280004') ?? 'MONOCHROME2',
    bitsAllocated: getDicomValue<number>(dicomJson, '00280100') ?? 16,
    bitsStored: getDicomValue<number>(dicomJson, '00280101') ?? 16,
    highBit: getDicomValue<number>(dicomJson, '00280102') ?? 15,
    pixelRepresentation: getDicomValue<number>(dicomJson, '00280103') ?? 0,
    numberOfFrames: parseInt(getDicomValue<string>(dicomJson, '00280008') ?? '1', 10),
    // Transfer Syntax UID (0002,0010) - 서버에서 디코딩된 raw pixels 형식
    // 기본값: Explicit VR Little Endian (1.2.840.10008.1.2.1)
    transferSyntaxUid: getDicomValue<string>(dicomJson, '00020010') ?? '1.2.840.10008.1.2.1',
  }

  // 캐시에 저장
  metadataCache.set(sopInstanceUid, metadata)
  if (DEBUG_PROVIDER) console.log(`[WadoRsBulkDataMetadataProvider] Metadata cached for ${sopInstanceUid}:`, metadata)

  return metadata
}

/**
 * Cornerstone 메타데이터 프로바이더 함수
 *
 * Cornerstone이 특정 imageId에 대한 메타데이터를 요청할 때 호출됩니다.
 *
 * @param type 메타데이터 유형 (imagePixelModule, voiLutModule 등)
 * @param imageId 이미지 ID
 * @returns 요청된 메타데이터 또는 undefined
 */
function wadoRsBulkDataMetadataProvider(type: string, imageId: string): unknown {
  // wadors: 스킴만 처리
  if (!imageId.startsWith('wadors:')) {
    return undefined
  }

  const parsed = parseWadoRsImageId(imageId)
  if (!parsed) {
    return undefined
  }

  const cached = metadataCache.get(parsed.sopInstanceUid)
  if (!cached) {
    // 메타데이터가 아직 캐시되지 않음 - 이미지 로드 전에 fetchAndCacheMetadata가 호출되어야 함
    if (DEBUG_PROVIDER) console.warn(
      `[WadoRsBulkDataMetadataProvider] Metadata not cached for ${parsed.sopInstanceUid}. ` +
        'Call fetchAndCacheMetadata before loading images.'
    )
    return undefined
  }

  // 메타데이터 유형별 반환
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
      // MONOCHROME 이미지에 대한 기본 VOI LUT
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
      // Cornerstone wadors 로더가 Transfer-Syntax를 요청할 때 반환
      return cached.transferSyntaxUid

    default:
      return undefined
  }
}

/**
 * 메타데이터 프로바이더를 Cornerstone에 등록
 *
 * 앱 초기화 시 한 번 호출해야 합니다.
 */
export function registerWadoRsBulkDataMetadataProvider(): void {
  // 높은 우선순위로 등록 (다른 프로바이더보다 먼저 호출됨)
  metaData.addProvider(wadoRsBulkDataMetadataProvider, 10000)
  if (DEBUG_PROVIDER) console.log('[WadoRsBulkDataMetadataProvider] Metadata provider registered')
}

/**
 * 메타데이터 캐시 초기화
 *
 * 페이지 전환 시 또는 메모리 정리가 필요할 때 호출합니다.
 */
export function clearMetadataCache(): void {
  const prevSize = metadataCache.size
  metadataCache.clear()
  pendingFetches.clear()
  if (DEBUG_PROVIDER) console.log(`[WadoRsBulkDataMetadataProvider] Metadata cache cleared (was ${prevSize} items)`)
}

/**
 * 특정 인스턴스의 캐시된 메타데이터 조회
 *
 * @param sopInstanceUid SOP Instance UID
 * @returns 캐시된 메타데이터 또는 undefined
 */
export function getCachedMetadata(sopInstanceUid: string): DicomPixelMetadata | undefined {
  return metadataCache.get(sopInstanceUid)
}

/**
 * 캐시 통계
 */
export function getMetadataCacheStats(): {
  size: number
  pendingCount: number
} {
  return {
    size: metadataCache.size,
    pendingCount: pendingFetches.size,
  }
}
