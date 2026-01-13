/**
 * CornerstoneMultiViewer - Cornerstone.js 기반 멀티 슬롯 DICOM 뷰어
 *
 * 단일 RenderingEngine에 여러 Viewport를 등록하여 효율적인 GPU 사용
 * 1x1, 2x2, 3x3 그리드 레이아웃 지원
 *
 * mini-pacs-poc 참고
 */
import { useEffect, useRef } from 'react'
import { RenderingEngine } from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import { useCornerstoneMultiViewerStore } from '../stores'
import { initCornerstone } from '@/lib/cornerstone/initCornerstone'
import type { GridLayout } from '../types/multiSlotViewer'
import { CornerstoneSlot } from './CornerstoneSlot'
import { CornerstoneGlobalControls } from './CornerstoneGlobalControls'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_VIEWER = false

const RENDERING_ENGINE_ID = 'cornerstoneMultiViewerEngine'
const TOOL_GROUP_ID = 'cornerstoneMultiViewerToolGroup'

interface CornerstoneMultiViewerProps {
  className?: string
}

/**
 * 레이아웃에 따른 CSS Grid 클래스 반환
 */
function getGridClass(layout: GridLayout): string {
  switch (layout) {
    case '1x1':
      return 'grid-cols-1 grid-rows-1'
    case '2x2':
      return 'grid-cols-2 grid-rows-2'
    case '3x3':
      return 'grid-cols-3 grid-rows-3'
    case '4x4':
      return 'grid-cols-4 grid-rows-4'
    case '5x5':
      return 'grid-cols-5 grid-rows-5'
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = layout
      return _exhaustive
  }
}

/**
 * 레이아웃에 따른 슬롯 ID 배열 반환
 */
function getSlotIds(layout: GridLayout): number[] {
  switch (layout) {
    case '1x1':
      return [0]
    case '2x2':
      return [0, 1, 2, 3]
    case '3x3':
      return [0, 1, 2, 3, 4, 5, 6, 7, 8]
    case '4x4':
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    case '5x5':
      return Array.from({ length: 25 }, (_, i) => i)
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = layout
      return _exhaustive
  }
}

export function CornerstoneMultiViewer({ className = '' }: CornerstoneMultiViewerProps) {
  const renderingEngineRef = useRef<RenderingEngine | null>(null)
  const { layout } = useCornerstoneMultiViewerStore()
  const slotIds = getSlotIds(layout)

  // ==================== Cornerstone 초기화 및 RenderingEngine 생성 ====================

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // Cornerstone Core + Tools 초기화
        await initCornerstone()

        if (mounted && !renderingEngineRef.current) {
          renderingEngineRef.current = new RenderingEngine(RENDERING_ENGINE_ID)
          if (DEBUG_VIEWER) console.log('[CornerstoneMultiViewer] RenderingEngine created')

          // ToolGroup 생성 및 도구 활성화
          let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
          if (!toolGroup) {
            toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID)
            if (DEBUG_VIEWER) console.log('[CornerstoneMultiViewer] ToolGroup created')
          }

          if (toolGroup) {
            // ToolGroup에 도구 추가
            try {
              toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName)
              toolGroup.addTool(cornerstoneTools.PanTool.toolName)
              toolGroup.addTool(cornerstoneTools.ZoomTool.toolName)
            } catch (e) {
              // 이미 추가된 경우 무시
            }

            // 마우스 바인딩과 함께 도구 활성화
            toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }]
            })
            toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }]
            })
            toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
              bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }]
            })
            if (DEBUG_VIEWER) console.log('[CornerstoneMultiViewer] Tools activated: WindowLevel(left), Pan(middle), Zoom(right)')
          }
        }
      } catch (error) {
        console.error('[CornerstoneMultiViewer] Initialization failed:', error)
      }
    }

    init()

    return () => {
      mounted = false
      // ToolGroup 제거
      try {
        cornerstoneTools.ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID)
        if (DEBUG_VIEWER) console.log('[CornerstoneMultiViewer] ToolGroup destroyed')
      } catch (e) {
        // 이미 제거된 경우 무시
      }
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy()
        renderingEngineRef.current = null
        if (DEBUG_VIEWER) console.log('[CornerstoneMultiViewer] RenderingEngine destroyed')
      }
    }
  }, [])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 전체 컨트롤 */}
      <CornerstoneGlobalControls />

      {/* 그리드 뷰어 */}
      <div className={`grid gap-2 flex-1 p-2 bg-gray-900 ${getGridClass(layout)}`}>
        {slotIds.map((slotId) => (
          <CornerstoneSlot
            key={slotId}
            slotId={slotId}
            renderingEngineId={RENDERING_ENGINE_ID}
          />
        ))}
      </div>
    </div>
  )
}

export { RENDERING_ENGINE_ID, TOOL_GROUP_ID }
