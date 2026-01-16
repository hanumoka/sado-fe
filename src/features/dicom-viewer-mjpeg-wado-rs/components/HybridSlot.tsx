/**
 * HybridSlot Component
 *
 * MJPEG + Cornerstone 듀얼 레이어 슬롯
 * 레이어 조합 및 전환 로직 관리
 *
 * 구조:
 * - z-index: 0 - CornerstoneLayer (하단, 백그라운드 프리로드)
 * - z-index: 1 - MjpegLayer (상단, 즉시 재생)
 *
 * 전환 흐름:
 * 1. MJPEG 재생 중 + Cornerstone 프리로드 완료 → pendingTransition = true
 * 2. MJPEG 루프 경계 감지 (frame=0) → transition-prepare 진입
 * 3. MJPEG freeze → transitioning (useRef DOM 직접 조작 크로스페이드)
 * 4. 크로스페이드 완료 (200ms) → cornerstone phase
 *
 * 성능 최적화:
 * - GPU 가속 레이어 분리 (will-change, transform: translateZ(0))
 * - useRef DOM 직접 조작 크로스페이드 (React 리렌더 없이 opacity 조작)
 * - MJPEG 즉시 중단 (cancelAnimationFrame)
 */

import { useCallback, useEffect, useRef } from 'react'
import { useHybridMultiViewerStore } from '../stores/hybridMultiViewerStore'
import { MjpegLayer } from './layers/MjpegLayer'
import { CornerstoneLayer } from './layers/CornerstoneLayer'
import { HybridSlotOverlay } from './HybridSlotOverlay'
import type { HybridInstanceSummary } from '../types'

interface HybridSlotProps {
  /** 슬롯 ID */
  slotId: number
  /** Instance 드래그 앤 드롭 핸들러 */
  onDrop?: (slotId: number, instance: HybridInstanceSummary) => void
}

// 디버그 로그 플래그
const DEBUG_SLOT = false

// 크로스페이드 지속 시간 (ms)
const CROSSFADE_DURATION = 200

/**
 * GPU 가속 레이어 스타일
 * - will-change: 브라우저에 변경 예정 속성 힌트
 * - transform: translateZ(0): GPU 레이어 생성 강제
 * - backface-visibility: hidden: 불필요한 레이어 연산 방지
 */
const GPU_ACCELERATED_STYLE: React.CSSProperties = {
  willChange: 'opacity, transform',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
}

/**
 * useRef 기반 크로스페이드 훅 (React 리렌더 없음)
 *
 * DOM 요소의 style.opacity를 직접 조작하여 React 리렌더 없이 애니메이션
 * 완료 시에만 onComplete 콜백 호출
 */
function useDomCrossfade(duration: number = CROSSFADE_DURATION) {
  const mjpegLayerRef = useRef<HTMLDivElement | null>(null)
  const cornerstoneLayerRef = useRef<HTMLDivElement | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const onCompleteRef = useRef<(() => void) | null>(null)

  const start = useCallback((onComplete?: () => void) => {
    if (isRunningRef.current) return
    isRunningRef.current = true
    startTimeRef.current = null
    onCompleteRef.current = onComplete ?? null

    // 초기 opacity 설정
    if (mjpegLayerRef.current) {
      mjpegLayerRef.current.style.opacity = '1'
    }
    if (cornerstoneLayerRef.current) {
      cornerstoneLayerRef.current.style.opacity = '0'
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // DOM 직접 조작 (React 리렌더 없음)
      if (mjpegLayerRef.current) {
        mjpegLayerRef.current.style.opacity = String(1 - progress)
      }
      if (cornerstoneLayerRef.current) {
        cornerstoneLayerRef.current.style.opacity = String(progress)
      }

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate)
      } else {
        isRunningRef.current = false
        onCompleteRef.current?.()
      }
    }

    rafIdRef.current = requestAnimationFrame(animate)
  }, [duration])

  const cancel = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    isRunningRef.current = false
    startTimeRef.current = null
    onCompleteRef.current = null
  }, [])

  const reset = useCallback(() => {
    cancel()
    // 초기 상태로 리셋
    if (mjpegLayerRef.current) {
      mjpegLayerRef.current.style.opacity = '1'
    }
    if (cornerstoneLayerRef.current) {
      cornerstoneLayerRef.current.style.opacity = '0'
    }
  }, [cancel])

  return {
    mjpegLayerRef,
    cornerstoneLayerRef,
    start,
    cancel,
    reset,
    isRunning: isRunningRef.current
  }
}

/**
 * 하이브리드 듀얼 레이어 슬롯
 */
export function HybridSlot({ slotId, onDrop }: HybridSlotProps) {
  // useRef 기반 크로스페이드 (React 리렌더 없음)
  const crossfade = useDomCrossfade(CROSSFADE_DURATION)

  // Store에서 슬롯 상태 구독
  const slot = useHybridMultiViewerStore((state) => state.slots[slotId])
  const {
    assignInstanceToSlot,
    requestTransition,
    prepareTransition,
    completeTransition,
    setSlotPhase,
    updateMjpegState,
    updateCornerstoneState,
  } = useHybridMultiViewerStore()

  const instance = slot?.instance ?? null
  const phase = slot?.phase ?? 'idle'
  const mjpegState = slot?.mjpeg
  const cornerstoneState = slot?.cornerstone

  // ========== Instance 변경 시 크로스페이드 리셋 ==========

  useEffect(() => {
    crossfade.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance?.sopInstanceUid])

  // ========== 드래그 앤 드롭 ==========

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const instanceData = e.dataTransfer.getData('application/json')
      if (!instanceData) return

      try {
        const droppedInstance: HybridInstanceSummary = JSON.parse(instanceData)
        assignInstanceToSlot(slotId, droppedInstance)
        onDrop?.(slotId, droppedInstance)

        if (DEBUG_SLOT) {
          console.log(`[HybridSlot ${slotId}] Instance dropped:`, droppedInstance.sopInstanceUid)
        }
      } catch (error) {
        console.error(`[HybridSlot ${slotId}] Drop failed:`, error)
      }
    },
    [slotId, assignInstanceToSlot, onDrop]
  )

  // ========== MJPEG 캐시 완료 → 재생 시작 ==========

  const handleMjpegCacheComplete = useCallback(
    (frameCount: number) => {
      if (DEBUG_SLOT) {
        console.log(`[HybridSlot ${slotId}] MJPEG cache complete: ${frameCount} frames`)
      }

      // MJPEG 캐시 완료 → 재생 시작
      updateMjpegState(slotId, { isPlaying: true })
      setSlotPhase(slotId, 'mjpeg-playing')
    },
    [slotId, updateMjpegState, setSlotPhase]
  )

  // ========== Cornerstone 프리로드 완료 → 전환 대기 ==========

  const handleCornerstonePreloadComplete = useCallback(() => {
    if (DEBUG_SLOT) {
      console.log(`[HybridSlot ${slotId}] Cornerstone preload complete - requesting transition`)
    }

    // 전환 대기 상태로 설정 (루프 경계 대기)
    requestTransition(slotId)
  }, [slotId, requestTransition])

  // ========== MJPEG 루프 경계 → transition-prepare 진입 ==========

  const handleLoopBoundary = useCallback(() => {
    // 클로저 stale value 문제 방지: getState()로 최신 상태 직접 읽기
    // (React 리렌더링 배칭과 Zustand 동기 업데이트 간의 race condition 회피)
    const { slots } = useHybridMultiViewerStore.getState()
    const currentSlot = slots[slotId]

    // 전환 대기 중인 경우에만 transition-prepare 진입
    if (!currentSlot?.transition.pendingTransition) {
      return
    }

    if (DEBUG_SLOT) {
      console.log(`[HybridSlot ${slotId}] Loop boundary - entering transition-prepare`)
    }

    // transition-prepare: MJPEG freeze + Cornerstone 첫 프레임 대기
    prepareTransition(slotId)
  }, [slotId, prepareTransition])

  // ========== transition-prepare 진입 시 크로스페이드 시작 ==========
  //
  // transition-prepare에 진입했다는 것은:
  // 1. Cornerstone preload 완료 (pendingTransition=true의 조건)
  // 2. MJPEG 루프 경계 도달
  // → 즉시 transitioning으로 진행하고 DOM 직접 조작으로 애니메이션

  useEffect(() => {
    if (phase === 'transition-prepare') {
      setSlotPhase(slotId, 'transitioning')
      // DOM 직접 조작 크로스페이드 시작 (React 리렌더 없음)
      // 완료 시 completeTransition 호출
      crossfade.start(() => {
        completeTransition(slotId)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, slotId, setSlotPhase, completeTransition])

  // ========== Cornerstone 준비 완료 ==========

  const handleCornerstoneReady = useCallback(() => {
    if (DEBUG_SLOT) {
      console.log(`[HybridSlot ${slotId}] Cornerstone viewport ready`)
    }

    updateCornerstoneState(slotId, { isReady: true })
  }, [slotId, updateCornerstoneState])

  // ========== 에러 처리 ==========

  const handleMjpegError = useCallback(
    (error: string) => {
      console.error(`[HybridSlot ${slotId}] MJPEG error:`, error)
      updateMjpegState(slotId, { errorMessage: error })
    },
    [slotId, updateMjpegState]
  )

  const handleCornerstoneError = useCallback(
    (error: string) => {
      console.error(`[HybridSlot ${slotId}] Cornerstone error:`, error)
      updateCornerstoneState(slotId, { errorMessage: error })
    },
    [slotId, updateCornerstoneState]
  )

  // ========== 빈 슬롯 렌더링 ==========

  if (!instance) {
    return (
      <div
        className="relative bg-gray-800 rounded-lg border-2 border-dashed border-purple-600/50 flex flex-col items-center justify-center min-h-[200px] w-full h-full"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-gray-400 text-center p-4">
          <svg
            className="mx-auto h-12 w-12 mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <p className="text-sm">Slot {slotId + 1}</p>
          <p className="text-xs mt-1 opacity-75">Drag DICOM here</p>
          <p className="text-xs mt-1 text-purple-500">(Hybrid MJPEG+WADO-RS)</p>
        </div>
      </div>
    )
  }

  // ========== 듀얼 레이어 렌더링 ==========

  // 레이어 가시성 결정
  const isMjpegVisible = phase !== 'cornerstone'
  const isCornerstoneVisible = phase === 'cornerstone' || phase === 'transitioning' || phase === 'transition-prepare'

  // 레이어 재생 상태 결정
  const isMjpegPlaying = mjpegState?.isPlaying ?? false
  const isCornerstonePlaying = cornerstoneState?.isPlaying ?? false

  // MJPEG freeze 상태 (transition-prepare 또는 transitioning에서 freeze)
  const isMjpegFrozen = phase === 'transition-prepare' || phase === 'transitioning'

  // 초기 opacity 값 (DOM 직접 조작 시 transitioning 상태에서는 RAF가 관리)
  // transitioning이 아닐 때만 React가 opacity 설정
  const mjpegOpacity = phase === 'cornerstone' ? 0 : 1
  const cornerstoneOpacity = phase === 'cornerstone' ? 1 : 0

  return (
    <div
      className="relative bg-black rounded-lg overflow-hidden w-full h-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Cornerstone Layer (z-index: 0, 하단) - GPU 가속 */}
      <div
        ref={crossfade.cornerstoneLayerRef}
        className="absolute inset-0"
        style={{
          zIndex: 0,
          opacity: cornerstoneOpacity,
          ...GPU_ACCELERATED_STYLE,
        }}
      >
        <CornerstoneLayer
          slotId={slotId}
          instance={instance}
          isVisible={isCornerstoneVisible}
          isPlaying={isCornerstonePlaying}
          onPreloadComplete={handleCornerstonePreloadComplete}
          onReady={handleCornerstoneReady}
          onError={handleCornerstoneError}
        />
      </div>

      {/* MJPEG Layer (z-index: 1, 상단) - GPU 가속, 항상 마운트 + visibility로 숨김 */}
      <div
        ref={crossfade.mjpegLayerRef}
        className="absolute inset-0"
        style={{
          zIndex: 1,
          opacity: mjpegOpacity,
          visibility: isMjpegVisible ? 'visible' : 'hidden',
          pointerEvents: isMjpegVisible ? 'auto' : 'none',
          ...GPU_ACCELERATED_STYLE,
        }}
      >
        <MjpegLayer
          slotId={slotId}
          instance={instance}
          isPlaying={isMjpegPlaying}
          isFrozen={isMjpegFrozen}
          onLoopBoundary={handleLoopBoundary}
          onCacheComplete={handleMjpegCacheComplete}
          onError={handleMjpegError}
        />
      </div>

      {/* 상태 오버레이 (z-index: 2) */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        <HybridSlotOverlay slotId={slotId} />
      </div>
    </div>
  )
}
