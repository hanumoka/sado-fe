/**
 * CornerstoneLayer Component
 *
 * Cornerstone StackViewport 렌더링 레이어
 * WADO-RS BulkData를 백그라운드에서 프리로드
 * MJPEG에서 전환 시 활성화
 *
 * 주의: 기존 뷰어의 store/manager 임포트 금지
 * - useWadoRsBulkDataMultiViewerStore (X)
 * - wadoRsBulkDataCineAnimationManager (X)
 */

import { useEffect, useRef, useState } from 'react'
import {
  Enums,
  getRenderingEngine as csGetRenderingEngine,
  RenderingEngine,
  imageLoader,
  type Types,
} from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { useHybridMultiViewerStore } from '../../stores/hybridMultiViewerStore'
import { createHybridImageIds } from '../../utils/hybridImageIdHelper'
import { fetchHybridMetadata, registerHybridMetadataProvider } from '../../utils/hybridMetadataProvider'
import { hybridCineAnimationManager } from '../../utils/HybridCineAnimationManager'
import { cornerstonePreloadQueue } from '../../utils/cornerstonePreloadQueue'
import type { HybridInstanceSummary } from '../../types'

// ============================================================================
// Constants (독립적인 ID 사용 - 기존 뷰어와 충돌 방지)
// ============================================================================

/** 하이브리드 뷰어 전용 RenderingEngine ID */
export const HYBRID_RENDERING_ENGINE_ID = 'hybrid-mjpeg-wadors-engine'

/** 하이브리드 뷰어 전용 ToolGroup ID */
export const HYBRID_TOOL_GROUP_ID = 'hybrid-mjpeg-wadors-tools'

// 디버그 로그 플래그
const DEBUG_LAYER = false

// ============================================================================
// Module-level Initialization
// ============================================================================

// RenderingEngine 싱글톤
let renderingEngine: RenderingEngine | null = null

// ToolGroup 초기화 여부
let toolGroupInitialized = false

/**
 * RenderingEngine 초기화 (최초 1회)
 */
function ensureRenderingEngine(): RenderingEngine {
  if (renderingEngine) {
    return renderingEngine
  }

  // 기존 인스턴스 확인
  const existing = csGetRenderingEngine(HYBRID_RENDERING_ENGINE_ID)
  if (existing) {
    renderingEngine = existing as RenderingEngine
    return renderingEngine
  }

  // 새 인스턴스 생성
  renderingEngine = new RenderingEngine(HYBRID_RENDERING_ENGINE_ID)

  if (DEBUG_LAYER) {
    console.log('[CornerstoneLayer] RenderingEngine created:', HYBRID_RENDERING_ENGINE_ID)
  }

  return renderingEngine
}

/**
 * ToolGroup 초기화 (최초 1회)
 */
function ensureToolGroup(): void {
  if (toolGroupInitialized) {
    return
  }

  // 기존 ToolGroup 확인
  let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(HYBRID_TOOL_GROUP_ID)
  if (toolGroup) {
    toolGroupInitialized = true
    return
  }

  // 새 ToolGroup 생성
  toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(HYBRID_TOOL_GROUP_ID)
  if (!toolGroup) {
    console.error('[CornerstoneLayer] Failed to create ToolGroup')
    return
  }

  // 기본 도구 추가
  toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName)
  toolGroup.addTool(cornerstoneTools.PanTool.toolName)
  toolGroup.addTool(cornerstoneTools.ZoomTool.toolName)
  toolGroup.addTool(cornerstoneTools.StackScrollTool.toolName)

  // 기본 활성화 설정
  toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
  })
  toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
  })
  toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
  })
  toolGroup.setToolActive(cornerstoneTools.StackScrollTool.toolName, {
    bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
  })

  toolGroupInitialized = true

  if (DEBUG_LAYER) {
    console.log('[CornerstoneLayer] ToolGroup initialized:', HYBRID_TOOL_GROUP_ID)
  }
}

// ============================================================================
// Component
// ============================================================================

interface CornerstoneLayerProps {
  /** 슬롯 ID */
  slotId: number
  /** 할당된 인스턴스 */
  instance: HybridInstanceSummary | null
  /** 레이어 가시성 (전환 전까지 hidden) */
  isVisible: boolean
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 프리로드 완료 시 콜백 */
  onPreloadComplete?: () => void
  /** 준비 완료 시 콜백 */
  onReady?: () => void
  /** 프리로드 진행률 콜백 */
  onPreloadProgress?: (progress: number) => void
  /** 에러 발생 시 콜백 */
  onError?: (error: string) => void
}

/**
 * Cornerstone StackViewport 렌더링 레이어
 */
export function CornerstoneLayer({
  slotId,
  instance,
  isVisible,
  isPlaying,
  onPreloadComplete,
  onReady,
  onPreloadProgress,
  onError,
}: CornerstoneLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Types.IStackViewport | null>(null)
  const [isViewportReady, setIsViewportReady] = useState(false)
  const [isStackLoaded, setIsStackLoaded] = useState(false)

  const { globalFps, updateCornerstoneState } = useHybridMultiViewerStore()

  const viewportId = `hybrid-cornerstone-slot-${slotId}`

  // ========== 메타데이터 프로바이더 등록 (최초 1회) ==========

  useEffect(() => {
    registerHybridMetadataProvider()
  }, [])

  // ========== Viewport 초기화 ==========

  useEffect(() => {
    if (!containerRef.current || !instance) {
      return
    }

    if (DEBUG_LAYER) {
      console.log(`[CornerstoneLayer ${slotId}] Initializing viewport`)
    }

    // RenderingEngine 및 ToolGroup 초기화
    const engine = ensureRenderingEngine()
    ensureToolGroup()

    try {
      // 기존 뷰포트 제거
      const existingViewport = engine.getViewport(viewportId)
      if (existingViewport) {
        engine.disableElement(viewportId)
      }

      // 새 Stack Viewport 생성
      engine.enableElement({
        viewportId,
        type: Enums.ViewportType.STACK,
        element: containerRef.current,
        defaultOptions: {
          background: [0, 0, 0] as Types.Point3,
        },
      })

      viewportRef.current = engine.getViewport(viewportId) as Types.IStackViewport
      setIsViewportReady(true)

      // ToolGroup에 viewport 연결
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(HYBRID_TOOL_GROUP_ID)
      if (toolGroup) {
        try {
          toolGroup.addViewport(viewportId, HYBRID_RENDERING_ENGINE_ID)
        } catch {
          // 이미 추가된 경우 무시
        }
      }

      if (DEBUG_LAYER) {
        console.log(`[CornerstoneLayer ${slotId}] Viewport created`)
      }
    } catch (error) {
      console.error(`[CornerstoneLayer ${slotId}] Viewport creation failed:`, error)
      onError?.('Failed to create viewport')
    }

    return () => {
      setIsViewportReady(false)
      setIsStackLoaded(false)

      // ToolGroup에서 viewport 제거
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(HYBRID_TOOL_GROUP_ID)
      if (toolGroup) {
        try {
          toolGroup.removeViewports(HYBRID_RENDERING_ENGINE_ID, viewportId)
        } catch {
          // 이미 제거된 경우 무시
        }
      }

      // CineAnimationManager에서 viewport 등록 해제
      hybridCineAnimationManager.unregisterViewport(slotId)

      // Viewport 비활성화
      const engine = csGetRenderingEngine(HYBRID_RENDERING_ENGINE_ID)
      if (engine) {
        try {
          engine.disableElement(viewportId)
        } catch {
          // 이미 제거된 경우 무시
        }
      }

      viewportRef.current = null

      if (DEBUG_LAYER) {
        console.log(`[CornerstoneLayer ${slotId}] Viewport cleaned up`)
      }
    }
  }, [instance?.sopInstanceUid, slotId, viewportId, onError])

  // ========== Stack 설정 및 프리로드 ==========

  useEffect(() => {
    if (!viewportRef.current || !instance || !isViewportReady) {
      setIsStackLoaded(false)
      return
    }

    const loadStack = async () => {
      setIsStackLoaded(false)

      const { studyInstanceUid, seriesInstanceUid, sopInstanceUid, numberOfFrames } = instance

      if (DEBUG_LAYER) {
        console.log(`[CornerstoneLayer ${slotId}] Loading stack:`, {
          sopInstanceUid: sopInstanceUid.slice(0, 20) + '...',
          numberOfFrames,
        })
      }

      // 메타데이터 먼저 로드
      try {
        await fetchHybridMetadata(studyInstanceUid, seriesInstanceUid, sopInstanceUid)
        if (DEBUG_LAYER) {
          console.log(`[CornerstoneLayer ${slotId}] Metadata cached`)
        }
      } catch (metadataErr) {
        console.error(`[CornerstoneLayer ${slotId}] Metadata fetch failed:`, metadataErr)
        // 메타데이터 실패해도 계속 진행 (fallback 값 사용)
      }

      // ImageIds 생성
      const imageIds = createHybridImageIds(
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid,
        numberOfFrames
      )

      try {
        // Stack 설정
        await viewportRef.current!.setStack(imageIds)

        // 첫 프레임 로드
        if (imageIds.length > 0) {
          await imageLoader.loadImage(imageIds[0])
        }

        // 인덱스 설정 및 렌더링
        viewportRef.current!.setImageIdIndex(0)

        // Viewport resize 및 카메라 리셋
        const engine = csGetRenderingEngine(HYBRID_RENDERING_ENGINE_ID)
        if (engine) {
          engine.resize()
        }
        viewportRef.current!.resetCamera()

        // 브라우저 레이아웃 계산 완료 대기 (검은 화면 방지)
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => requestAnimationFrame(resolve))

        viewportRef.current!.render()

        // CineAnimationManager에 viewport 등록
        hybridCineAnimationManager.registerViewport(slotId, viewportRef.current!, numberOfFrames)

        setIsStackLoaded(true)
        onReady?.()

        if (DEBUG_LAYER) {
          console.log(`[CornerstoneLayer ${slotId}] Stack loaded with ${imageIds.length} frames`)
        }

        // 프리로드 큐에 등록 (순차 처리로 MJPEG 재생 보호)
        if (numberOfFrames > 1) {
          cornerstonePreloadQueue.enqueue({
            slotId,
            imageIds,
            onProgress: (progress) => {
              updateCornerstoneState(slotId, { preloadProgress: progress })
              onPreloadProgress?.(progress)
            },
            onComplete: () => {
              updateCornerstoneState(slotId, {
                isPreloaded: true,
                preloadProgress: 100,
              })
              onPreloadComplete?.()
            },
            onError: (error) => {
              console.error(`[CornerstoneLayer ${slotId}] Preload error:`, error)
            },
          })
        } else {
          // 단일 프레임은 즉시 프리로드 완료
          updateCornerstoneState(slotId, {
            isPreloaded: true,
            preloadProgress: 100,
          })
          onPreloadComplete?.()
        }
      } catch (error) {
        console.error(`[CornerstoneLayer ${slotId}] Stack load failed:`, error)
        onError?.('Failed to load stack')
        setIsStackLoaded(false)
      }
    }

    loadStack()

    return () => {
      // 프리로드 큐에서 제거 (진행 중이면 취소)
      cornerstonePreloadQueue.cancel(slotId)
      hybridCineAnimationManager.unregisterViewport(slotId)
    }
  }, [instance?.sopInstanceUid, isViewportReady, slotId, onReady, onError])

  // ========== Cine 재생 제어 ==========

  useEffect(() => {
    if (!instance || instance.numberOfFrames <= 1 || !isStackLoaded) {
      return
    }

    if (isPlaying && isVisible) {
      // 재생 시작
      hybridCineAnimationManager.registerSlot(slotId)
    } else {
      // 재생 중지
      hybridCineAnimationManager.unregisterSlot(slotId)
    }

    return () => {
      hybridCineAnimationManager.unregisterSlot(slotId)
    }
  }, [isPlaying, isVisible, instance, slotId, isStackLoaded])

  // ========== FPS 설정 동기화 ==========

  useEffect(() => {
    hybridCineAnimationManager.setFrameTime(globalFps)
  }, [globalFps])

  // ========== 렌더링 ==========

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        backgroundColor: 'black',
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
