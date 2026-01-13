/**
 * multipartParser.ts
 *
 * Multipart/related 바이너리 응답 파싱 유틸리티
 * DICOMweb Part 18 표준의 다중 프레임 응답(/frames/1,2,3)을 파싱합니다.
 *
 * 성능 최적화 (2026-01-13):
 * - 스트리밍 파싱: Response.body.getReader()로 청크 단위 처리
 * - 첫 프레임 표시 시간 단축
 * - 메모리 사용량 최적화 (전체 응답 버퍼링 불필요)
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
 * Multipart/related 응답에서 파싱된 프레임 데이터 (메타데이터 포함)
 * Content-Type과 Transfer Syntax 정보를 포함하여 클라이언트 디코딩 지원
 */
export interface ParsedFrameWithMetadata {
  frameNumber: number
  data: ArrayBuffer
  contentType: string // 필수 (기본값: application/octet-stream)
  transferSyntax?: string // Content-Type의 transfer-syntax 파라미터
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
 * 헤더 텍스트에서 Content-Type과 Transfer Syntax 추출
 *
 * @example
 * Content-Type: application/octet-stream → { contentType: 'application/octet-stream' }
 * Content-Type: image/jp2; transfer-syntax=1.2.840.10008.1.2.4.90 → { contentType: 'image/jp2', transferSyntax: '1.2.840.10008.1.2.4.90' }
 *
 * @param headerText 헤더 텍스트
 * @returns Content-Type 정보
 */
function extractContentTypeFromHeader(headerText: string): {
  contentType: string
  transferSyntax?: string
} {
  // Content-Type: {type}[; transfer-syntax={uid}] 패턴
  const match = headerText.match(/Content-Type:\s*([^;\r\n]+)(?:;\s*transfer-syntax=([^\r\n;]+))?/i)
  return {
    contentType: match?.[1]?.trim() || 'application/octet-stream',
    transferSyntax: match?.[2]?.trim(),
  }
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

/**
 * Multipart/related 바이너리 응답 파싱 (메타데이터 포함)
 *
 * 각 파트의 Content-Type과 Transfer Syntax 정보를 추출하여 반환합니다.
 * 클라이언트에서 압축 데이터 디코딩이 필요한 경우 사용합니다.
 *
 * @param response fetch Response 객체
 * @returns Map<프레임번호, ParsedFrameWithMetadata>
 */
export async function parseMultipartFramesWithMetadata(
  response: Response
): Promise<Map<number, ParsedFrameWithMetadata>> {
  if (DEBUG_PARSER) console.log('[MultipartParser] parseMultipartFramesWithMetadata START')

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

  const result = new Map<number, ParsedFrameWithMetadata>()

  // 각 파트 처리 (마지막 boundary 전까지)
  for (let i = 0; i < positions.length - 1; i++) {
    const partStart = positions[i] + boundaryBytes.length
    const partEnd = positions[i + 1]

    // 종료 boundary 체크 (--boundary--)
    const possibleEnd = uint8.slice(positions[i + 1], positions[i + 1] + endBoundaryBytes.length)
    const isEndBoundary =
      possibleEnd.length === endBoundaryBytes.length &&
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

    // Content-Type 및 Transfer Syntax 추출
    const { contentType: partContentType, transferSyntax } = extractContentTypeFromHeader(headerText)

    if (DEBUG_PARSER) {
      console.log('[MultipartParser] Frame', frameNumber, 'contentType:', partContentType, 'transferSyntax:', transferSyntax)
    }

    // 바디 추출 (헤더 끝 + \r\n\r\n 이후)
    const bodyStart = headerEnd + 4
    // 끝의 \r\n 제외 (boundary 앞)
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

    result.set(frameNumber, {
      frameNumber,
      data: frameBuffer,
      contentType: partContentType,
      transferSyntax,
    })
  }

  if (DEBUG_PARSER) {
    console.log('[MultipartParser] Parsed', result.size, 'frames with metadata')
  }

  return result
}

// ==================== 스트리밍 파서 (성능 최적화) ====================

/**
 * 바이트 배열 병합 유틸리티
 */
function concatUint8Arrays(arrays: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/**
 * 바이트 배열에서 패턴의 첫 번째 위치 찾기 (Boyer-Moore-Horspool 최적화)
 */
function findPatternPosition(data: Uint8Array, pattern: Uint8Array, startOffset: number = 0): number {
  const patternLength = pattern.length
  const dataLength = data.length

  if (patternLength === 0 || dataLength - startOffset < patternLength) {
    return -1
  }

  // Build bad character table for Boyer-Moore-Horspool
  const badCharTable = new Uint8Array(256).fill(patternLength)
  for (let i = 0; i < patternLength - 1; i++) {
    badCharTable[pattern[i]] = patternLength - 1 - i
  }

  let i = startOffset + patternLength - 1
  while (i < dataLength) {
    let j = patternLength - 1
    while (j >= 0 && data[i - (patternLength - 1 - j)] === pattern[j]) {
      j--
    }
    if (j < 0) {
      return i - patternLength + 1
    }
    i += badCharTable[data[i]]
  }

  return -1
}

/**
 * 스트리밍 Multipart 파서
 *
 * Response.body를 청크 단위로 읽으면서 프레임을 파싱합니다.
 * AsyncGenerator를 사용하여 프레임이 준비되는 대로 yield합니다.
 *
 * @param response fetch Response 객체
 * @yields ParsedFrame 객체
 */
export async function* parseMultipartFramesStreaming(
  response: Response
): AsyncGenerator<ParsedFrame, void, undefined> {
  if (!response.body) {
    throw new Error('Response body is null - streaming not supported')
  }

  // Content-Type에서 boundary 추출
  const contentType = response.headers.get('Content-Type') || ''
  const boundaryMatch = contentType.match(/boundary=([^;]+)/)

  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type header: ' + contentType)
  }

  const boundary = boundaryMatch[1].trim()
  const boundaryBytes = new TextEncoder().encode(`--${boundary}`)
  const endBoundaryBytes = new TextEncoder().encode(`--${boundary}--`)

  if (DEBUG_PARSER) {
    console.log('[MultipartParser] Streaming parser started, boundary:', boundary)
  }

  const reader = response.body.getReader()
  let buffer: Uint8Array<ArrayBuffer> = new Uint8Array(0)
  let partIndex = 0
  let done = false

  try {
    while (!done) {
      // 더 많은 데이터 읽기
      const { value, done: readerDone } = await reader.read()
      done = readerDone

      if (value) {
        // 새 청크를 버퍼에 추가
        buffer = concatUint8Arrays([buffer, new Uint8Array(value)])
      }

      // 버퍼에서 완전한 파트 찾기
      while (true) {
        // 첫 번째 boundary 찾기
        const boundaryPos = findPatternPosition(buffer, boundaryBytes)
        if (boundaryPos === -1) {
          break // boundary가 없으면 더 많은 데이터 필요
        }

        // 다음 boundary 찾기
        const nextBoundaryPos = findPatternPosition(buffer, boundaryBytes, boundaryPos + boundaryBytes.length)

        // 종료 boundary 확인
        const endBoundaryPos = findPatternPosition(buffer, endBoundaryBytes, boundaryPos)
        const isEndBoundary = endBoundaryPos === boundaryPos

        if (isEndBoundary) {
          // 종료 boundary - 파싱 완료
          buffer = buffer.slice(boundaryPos + endBoundaryBytes.length)
          done = true
          break
        }

        if (nextBoundaryPos === -1) {
          // 다음 boundary가 없으면 더 많은 데이터 필요 (스트림이 끝난 경우 제외)
          if (!done) {
            break
          }

          // 스트림 끝났지만 다음 boundary 없음 - 마지막 파트 처리
          // (일부 서버는 종료 boundary를 생략하거나 불완전한 응답 전송)
          const partStart = boundaryPos + boundaryBytes.length
          if (partStart < buffer.length) {
            const partData = buffer.slice(partStart)

            // 헤더 끝 찾기 (\r\n\r\n)
            const headerEnd = findHeaderEnd(partData)
            if (headerEnd !== -1) {
              const headerBytes = partData.slice(0, headerEnd)
              const headerText = new TextDecoder().decode(headerBytes)
              const frameNumber = extractFrameNumber(headerText)

              if (frameNumber !== null) {
                const bodyStart = headerEnd + 4
                let bodyEnd = partData.length
                // 끝의 \r\n 제외
                if (partData.length >= 2 && partData[bodyEnd - 2] === 13 && partData[bodyEnd - 1] === 10) {
                  bodyEnd -= 2
                }

                if (bodyStart < bodyEnd) {
                  const body = partData.slice(bodyStart, bodyEnd)

                  if (DEBUG_PARSER) {
                    console.log(`[MultipartParser] Streaming: Last frame ${frameNumber}, size: ${body.length} bytes`)
                  }

                  yield {
                    frameNumber,
                    data: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
                    contentType: 'image/png',
                  }
                  partIndex++
                }
              }
            }
          }
          break
        }

        // 완전한 파트 추출
        const partStart = boundaryPos + boundaryBytes.length
        const partEnd = nextBoundaryPos
        const partData = buffer.slice(partStart, partEnd)

        // 헤더 끝 찾기 (\r\n\r\n)
        const headerEnd = findHeaderEnd(partData)
        if (headerEnd === -1) {
          // 헤더가 불완전하면 스킵
          buffer = buffer.slice(nextBoundaryPos)
          continue
        }

        // 헤더 파싱
        const headerBytes = partData.slice(0, headerEnd)
        const headerText = new TextDecoder().decode(headerBytes)

        // 프레임 번호 추출
        const frameNumber = extractFrameNumber(headerText)
        if (frameNumber === null) {
          // 프레임 번호 없으면 스킵 (프리앰블 등)
          buffer = buffer.slice(nextBoundaryPos)
          partIndex++
          continue
        }

        // 바디 추출
        const bodyStart = headerEnd + 4 // \r\n\r\n 길이
        let bodyEnd = partData.length
        // 끝의 \r\n 제외
        if (partData[bodyEnd - 2] === 13 && partData[bodyEnd - 1] === 10) {
          bodyEnd -= 2
        }

        const body = partData.slice(bodyStart, bodyEnd)

        if (DEBUG_PARSER) {
          console.log(`[MultipartParser] Streaming: Frame ${frameNumber}, size: ${body.length} bytes`)
        }

        // 프레임 yield (복사 최소화 - 버퍼 조각 직접 사용)
        yield {
          frameNumber,
          data: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
          contentType: 'image/png',
        }

        // 처리된 부분 버퍼에서 제거
        buffer = buffer.slice(nextBoundaryPos)
        partIndex++
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (DEBUG_PARSER) {
    console.log(`[MultipartParser] Streaming parser completed: ${partIndex} parts processed`)
  }
}

/**
 * 스트리밍 Multipart 파서 (콜백 방식)
 *
 * 프레임이 파싱되는 즉시 콜백을 호출합니다.
 * AsyncGenerator보다 간단한 사용법을 제공합니다.
 *
 * @param response fetch Response 객체
 * @param onFrame 프레임 파싱 완료 시 호출되는 콜백
 * @returns 파싱된 총 프레임 수
 */
export async function parseMultipartFramesWithCallback(
  response: Response,
  onFrame: (frame: ParsedFrame) => void
): Promise<number> {
  let count = 0

  for await (const frame of parseMultipartFramesStreaming(response)) {
    onFrame(frame)
    count++
  }

  return count
}

/**
 * 스트리밍 Multipart 파서 (배열 반환)
 *
 * 기존 parseMultipartRenderedFrames와 동일한 인터페이스를 제공하면서
 * 내부적으로 스트리밍 파싱을 사용합니다.
 *
 * @param response fetch Response 객체
 * @returns ParsedFrame 배열
 */
export async function parseMultipartRenderedFramesStreaming(
  response: Response
): Promise<ParsedFrame[]> {
  const frames: ParsedFrame[] = []

  for await (const frame of parseMultipartFramesStreaming(response)) {
    frames.push(frame)
  }

  // 프레임 번호로 정렬
  frames.sort((a, b) => a.frameNumber - b.frameNumber)

  return frames
}
