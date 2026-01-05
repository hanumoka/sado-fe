/**
 * viewer.ts
 *
 * DICOM Viewer 관련 타입 정의
 *
 * 목적:
 * - Viewer 전용 확장 타입 정의
 * - Viewer 도구 타입 정의
 * - Window/Level 설정 타입 정의
 */

import type { Instance as BaseInstance } from '@/types'

// 기본 Instance 타입 re-export (기존 코드 호환성)
export type { Instance, Series } from '@/types'

/**
 * Viewer용 확장 Instance (추가 이미지 정보 포함)
 */
export interface ViewerInstance extends BaseInstance {
  studyId?: string // Study ID
  rows?: number // 이미지 행 수
  columns?: number // 이미지 열 수
  pixelSpacing?: [number, number] // 픽셀 간격 [행, 열]
}

/**
 * Series 인터페이스 (Viewer에서 필요한 정보)
 *
 * Series 타입을 확장하여 DICOM UID 필드 추가
 */
export interface ViewerSeries extends import('@/types').Series {
  studyInstanceUid: string // Cornerstone3D WADO-RS URL 생성용 (DICOM UID)
  // Inherits from Series: id, seriesInstanceUid, studyId (내부 ID), seriesNumber, modality, seriesDescription, instancesCount
}

/**
 * Viewer 도구 타입
 */
export type ViewerTool =
  | 'WindowLevel' // 창/레벨 조정
  | 'Zoom' // 확대/축소
  | 'Pan' // 이동
  | 'Reset' // 초기화

/**
 * Window/Level 프리셋
 */
export interface WindowLevelPreset {
  name: string
  windowWidth: number
  windowCenter: number
}

/**
 * 기본 Window/Level 프리셋
 */
export const DEFAULT_PRESETS: WindowLevelPreset[] = [
  { name: 'CT Abdomen', windowWidth: 400, windowCenter: 40 },
  { name: 'CT Bone', windowWidth: 2000, windowCenter: 300 },
  { name: 'CT Brain', windowWidth: 80, windowCenter: 40 },
  { name: 'CT Lung', windowWidth: 1500, windowCenter: -600 },
  { name: 'CT Mediastinum', windowWidth: 350, windowCenter: 50 },
]
