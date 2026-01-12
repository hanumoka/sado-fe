/**
 * useViewerPage - 공유 뷰어 페이지 훅
 *
 * 모든 DICOM 뷰어 페이지에서 공통으로 사용하는 상태 및 로직
 * - 레이아웃 관리
 * - 슬롯 선택
 * - 인스턴스 필터링
 * - 썸네일 에러 추적
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import type {
  BaseInstanceInfo,
  GridLayout,
  InstanceFilter,
} from '../types/viewerTypes'
import { LAYOUT_OPTIONS } from '../types/viewerTypes'

interface UseViewerPageOptions<T extends BaseInstanceInfo> {
  /** 전체 인스턴스 목록 */
  instances: T[]
  /** 초기 레이아웃 */
  initialLayout?: GridLayout
  /** 초기 인스턴스 필터 */
  initialFilter?: InstanceFilter
  /** Store의 setLayout 함수 (layout 변경 시 Store와 동기화) */
  onLayoutChange?: (layout: GridLayout) => void
  /** 썸네일 로드 완료 콜백 */
  onThumbnailLoad?: (sopInstanceUid: string) => void
  /** 썸네일 총 개수 설정 콜백 */
  setTotalThumbnailCount?: (count: number) => void
  /** 썸네일 추적 리셋 콜백 */
  resetThumbnailTracking?: () => void
}

interface UseViewerPageReturn<T extends BaseInstanceInfo> {
  // 레이아웃 상태
  layout: GridLayout
  setLayout: (layout: GridLayout) => void
  currentLayoutSlots: number

  // 슬롯 선택
  selectedSlot: number
  setSelectedSlot: (slot: number) => void
  handleSlotClick: (slotId: number) => void

  // 인스턴스 필터링
  instanceFilter: InstanceFilter
  setInstanceFilter: (filter: InstanceFilter) => void
  filteredInstances: T[]
  playableCount: number
  totalCount: number

  // 썸네일 에러 추적
  thumbnailErrors: Record<string, boolean>
  handleThumbnailLoad: (sopInstanceUid: string) => void
  handleThumbnailError: (sopInstanceUid: string) => void
}

export function useViewerPage<T extends BaseInstanceInfo>({
  instances,
  initialLayout = '1x1',
  initialFilter = 'playable',
  onLayoutChange,
  onThumbnailLoad,
  setTotalThumbnailCount,
  resetThumbnailTracking,
}: UseViewerPageOptions<T>): UseViewerPageReturn<T> {
  // 레이아웃 상태
  const [layout, setLayoutState] = useState<GridLayout>(initialLayout)

  // 슬롯 선택
  const [selectedSlot, setSelectedSlot] = useState<number>(0)

  // 인스턴스 필터
  const [instanceFilter, setInstanceFilter] = useState<InstanceFilter>(initialFilter)

  // 썸네일 에러 추적
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({})

  // 현재 레이아웃 슬롯 수
  const currentLayoutSlots = useMemo(() => {
    return LAYOUT_OPTIONS.find((o) => o.value === layout)?.slots || 1
  }, [layout])

  // 필터링된 인스턴스
  const filteredInstances = useMemo(() => {
    if (instanceFilter === 'playable') {
      return instances.filter((inst) => (inst.numberOfFrames || 1) > 1)
    }
    return instances
  }, [instances, instanceFilter])

  // 재생 가능 인스턴스 수
  const playableCount = useMemo(() => {
    return instances.filter((inst) => (inst.numberOfFrames || 1) > 1).length
  }, [instances])

  // 전체 인스턴스 수
  const totalCount = instances.length

  // 레이아웃 변경 핸들러
  const setLayout = useCallback((newLayout: GridLayout) => {
    setLayoutState(newLayout)
    onLayoutChange?.(newLayout)

    // 선택된 슬롯이 새 레이아웃 범위를 벗어나면 0으로 리셋
    const newSlots = LAYOUT_OPTIONS.find((o) => o.value === newLayout)?.slots || 1
    setSelectedSlot((prev) => (prev >= newSlots ? 0 : prev))
  }, [onLayoutChange])

  // 슬롯 클릭 핸들러
  const handleSlotClick = useCallback((slotId: number) => {
    setSelectedSlot(slotId)
  }, [])

  // 썸네일 로드 성공 핸들러
  const handleThumbnailLoad = useCallback((sopInstanceUid: string) => {
    onThumbnailLoad?.(sopInstanceUid)
  }, [onThumbnailLoad])

  // 썸네일 로드 에러 핸들러
  const handleThumbnailError = useCallback((sopInstanceUid: string) => {
    setThumbnailErrors((prev) => ({ ...prev, [sopInstanceUid]: true }))
    // 에러도 "완료"로 처리
    onThumbnailLoad?.(sopInstanceUid)
  }, [onThumbnailLoad])

  // 필터링된 인스턴스 개수 변경 시 썸네일 총 개수 업데이트
  useEffect(() => {
    if (filteredInstances.length > 0) {
      setTotalThumbnailCount?.(filteredInstances.length)
    }
  }, [filteredInstances.length, setTotalThumbnailCount])

  // 페이지 언마운트 시 썸네일 추적 리셋
  useEffect(() => {
    return () => {
      resetThumbnailTracking?.()
    }
  }, [resetThumbnailTracking])

  return {
    // 레이아웃
    layout,
    setLayout,
    currentLayoutSlots,

    // 슬롯 선택
    selectedSlot,
    setSelectedSlot,
    handleSlotClick,

    // 인스턴스 필터링
    instanceFilter,
    setInstanceFilter,
    filteredInstances,
    playableCount,
    totalCount,

    // 썸네일 에러
    thumbnailErrors,
    handleThumbnailLoad,
    handleThumbnailError,
  }
}
