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
import { useCornerstoneMultiViewerStore } from '../stores'
import { initCornerstone } from '@/lib/cornerstone/initCornerstone'
import type { GridLayout } from '../types/multiSlotViewer'
import { CornerstoneSlot } from './CornerstoneSlot'
import { CornerstoneGlobalControls } from './CornerstoneGlobalControls'

const RENDERING_ENGINE_ID = 'cornerstoneMultiViewerEngine'

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
          console.log('[CornerstoneMultiViewer] RenderingEngine created')
        }
      } catch (error) {
        console.error('[CornerstoneMultiViewer] Initialization failed:', error)
      }
    }

    init()

    return () => {
      mounted = false
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy()
        renderingEngineRef.current = null
        console.log('[CornerstoneMultiViewer] RenderingEngine destroyed')
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

export { RENDERING_ENGINE_ID }
