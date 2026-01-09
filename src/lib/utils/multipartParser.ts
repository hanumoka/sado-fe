/**
 * multipartParser.ts
 *
 * Multipart/related 바이너리 응답 파싱 유틸리티
 * DICOMweb Part 18 표준의 다중 프레임 응답(/frames/1,2,3)을 파싱합니다.
 *
 * @see https://dicom.nema.org/medical/dicom/2019a/output/chtml/part18/sect_6.5.4.html
 */

// 디버그 로그 플래그
const DEBUG_PARSER = false

/**
 * Multipart/related 응답에서 파싱된 프레임 데이터
 */
export interface ParsedFrame {
  frameNumber: number
  data: ArrayBuffer
  contentType?: string
}

/**
 * 바이트 배열에서 특정 패턴의 모든 위치 찾기
 *
 * @param data 검색할 바이트 배열
 * @param pattern 찾을 패턴
 * @returns 패턴이 시작하는 모든 인덱스
 */
function findAllPatternPositions(data: Uint8Array, pattern: Uint8Array): number[] {
  const positions: number[] = []
  const patternLength = pattern.length

  for (let i = 0; i <= data.length - patternLength; i++) {
    let match = true
    for (let j = 0; j < patternLength; j++) {
      if (data[i + j] !== pattern[j]) {
        match = false
        break
      }
    }
    if (match) {
      positions.push(i)
    }
  }

  return positions
}

/**
 * \r\n\r\n (헤더 끝) 위치 찾기
 *
 * @param data 바이트 배열
 * @param startOffset 검색 시작 위치
 * @returns 헤더 끝 위치 (없으면 -1)
 */
function findHeaderEnd(data: Uint8Array, startOffset: number = 0): number {
  // \r\n\r\n = [13, 10, 13, 10]
  for (let i = startOffset; i < data.length - 3; i++) {
    if (data[i] === 13 && data[i + 1] === 10 && data[i + 2] === 13 && data[i + 3] === 10) {
      return i
    }
  }
  return -1
}

/**
 * 헤더 텍스트에서 프레임 번호 추출
 *
 * Content-Location: frames/1 → 1
 * Content-Location: frames/5/rendered → 5
 *
 * @param headerText 헤더 텍스트
 * @returns 프레임 번호 (없으면 null)
 */
function extractFrameNumber(headerText: string): number | null {
  // Content-Location: frames/{number} 패턴
  const match = headerText.match(/frames\/(\d+)/i)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

/**
 * Multipart/related 바이너리 응답 파싱 (BulkData용)
 *
 * DICOMweb Part 18 표준 multipart 응답을 파싱하여 프레임별 바이너리 데이터 추출
 *
 * @param response fetch Response 객체
 * @returns Map<프레임번호, ArrayBuffer>
 */
export async function parseMultipartFrames(
  response: Response
): Promise<Map<number, ArrayBuffer>> {
  if (DEBUG_PARSER) console.log('[MultipartParser] parseMultipartFrames START')

  // Content-Type에서 boundary 추출
  const contentType = response.headers.get('Content-Type') || ''
  const boundaryMatch = contentType.match(/boundary=([^;]+)/)

  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type header: ' + contentType)
  }

  const boundary = boundaryMatch[1].trim()
  if (DEBUG_PARSER) console.log('[MultipartParser] Boundary:', boundary)

  // 응답 바이너리 읽기
  const buffer = await response.arrayBuffer()
  const uint8 = new Uint8Array(buffer)

  if (DEBUG_PARSER) console.log('[MultipartParser] Response size:', uint8.length, 'bytes')

  // boundary 바이트 시퀀스 생성 (--boundary)
  const boundaryBytes = new TextEncoder().encode(`--${boundary}`)
  const endBoundaryBytes = new TextEncoder().encode(`--${boundary}--`)

  // 모든 boundary 위치 찾기
  const positions = findAllPatternPositions(uint8, boundaryBytes)

  if (DEBUG_PARSER) console.log('[MultipartParser] Found', positions.length, 'boundary positions')

  if (positions.length < 2) {
    throw new Error('Invalid multipart response: insufficient boundaries')
  }

  const result = new Map<number, ArrayBuffer>()

  // 각 파트 처리 (마지막 boundary 전까지)
  for (let i = 0; i < positions.length - 1; i++) {
    const partStart = positions[i] + boundaryBytes.length
    const partEnd = positions[i + 1]

    // 종료 boundary 체크 (--boundary--)
    const possibleEnd = uint8.slice(positions[i + 1], positions[i + 1] + endBoundaryBytes.length)
    const isEndBoundary = possibleEnd.length === endBoundaryBytes.length &&
      possibleEnd.every((byte, idx) => byte === endBoundaryBytes[idx])

    if (isEndBoundary && i === positions.length - 2) {
      // 마지막 파트 처리 후 종료
    }

    // 파트 데이터 추출
    const partData = uint8.slice(partStart, partEnd)

    // 헤더 끝 찾기 (\r\n\r\n)
    const headerEnd = findHeaderEnd(partData)
    if (headerEnd === -1) {
      if (DEBUG_PARSER) console.log('[MultipartParser] No header end found in part', i)
      continue
    }

    // 헤더 파싱
    const headerBytes = partData.slice(0, headerEnd)
    const headerText = new TextDecoder().decode(headerBytes)

    if (DEBUG_PARSER) console.log('[MultipartParser] Part', i, 'header:', headerText.substring(0, 200))

    // 프레임 번호 추출
    const frameNumber = extractFrameNumber(headerText)
    if (frameNumber === null) {
      if (DEBUG_PARSER) console.log('[MultipartParser] No frame number found in part', i)
      continue
    }

    // 바디 추출 (헤더 끝 + \r\n\r\n 이후)
    const bodyStart = headerEnd + 4
    // 끝의 \r\n 제외 (boundary 앞)
    // \r\n = [CR(13), LF(10)] 순서
    let bodyEnd = partData.length
    if (partData[bodyEnd - 2] === 13 && partData[bodyEnd - 1] === 10) {
      bodyEnd -= 2
    }

    const body = partData.slice(bodyStart, bodyEnd)

    if (DEBUG_PARSER) {
      console.log('[MultipartParser] Frame', frameNumber, '- body size:', body.length, 'bytes')
    }

    // ArrayBuffer로 변환 (복사)
    const frameBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
    result.set(frameNumber, frameBuffer)
  }

  if (DEBUG_PARSER) {
    console.log('[MultipartParser] Parsed', result.size, 'frames')
  }

  return result
}

/**
 * Multipart/related PNG 응답 파싱 (Rendered용)
 *
 * 여러 PNG 이미지가 포함된 multipart 응답 파싱
 *
 * @param response fetch Response 객체
 * @returns ParsedFrame 배열
 */
export async function parseMultipartRenderedFrames(
  response: Response
): Promise<ParsedFrame[]> {
  const framesMap = await parseMultipartFrames(response)

  const frames: ParsedFrame[] = []
  for (const [frameNumber, data] of framesMap) {
    frames.push({
      frameNumber,
      data,
      contentType: 'image/png',
    })
  }

  // 프레임 번호로 정렬
  frames.sort((a, b) => a.frameNumber - b.frameNumber)

  return frames
}

/**
 * Content-Type 헤더에서 boundary 추출
 *
 * @param contentType Content-Type 헤더 값
 * @returns boundary 문자열 (없으면 null)
 */
export function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=([^;]+)/)
  return match ? match[1].trim() : null
}
