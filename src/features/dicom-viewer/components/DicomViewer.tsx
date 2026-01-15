import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Image as ImageIcon, Loader2 } from 'lucide-react'
import ViewerOverlay from './ViewerOverlay'
import {
  initCornerstone,
  isInitialized,
  cornerstone,
  cornerstoneTools,
} from '@/lib/cornerstone'
import { getWadoUriUrl } from '@/lib/services'
import type {
  ViewerTool,
  WindowLevelPreset,
  ViewerSeries,
  ViewerInstance,
} from '../types/viewer'

// 디버그 로그 플래그 (프로덕션에서는 false)
const DEBUG_VIEWER = false

/**
 * DicomViewer.tsx
 *
 * Cornerstone3D 기반 DICOM 이미지 뷰어 컴포넌트 (2x2 멀티 viewport)
 *
 * 기능:
 * - Cornerstone3D로 실제 DICOM 이미지 렌더링
 * - 2x2 그리드로 연속된 4개 Instance 동시 표시
 * - 다중 Instance 네비게이션 (Stack)
 * - 키보드 단축키 지원
 * - 확대/축소, Window/Level 조정
 */

interface DicomViewerProps {
  instances: ViewerInstance[]
  series?: ViewerSeries | null
  activeTool: ViewerTool
  windowLevelPreset?: WindowLevelPreset
}

const RENDERING_ENGINE_ID = 'dicomViewerRenderingEngine'
const VIEWPORT_IDS = ['viewport-0', 'viewport-1', 'viewport-2', 'viewport-3']
const TOOL_GROUP_ID = 'dicomViewerToolGroup'

/**
 * IStackViewport 타입 가드
 */
function isStackViewport(
  viewport: unknown
): viewport is cornerstone.Types.IStackViewport {
  return (
    viewport !== null &&
    typeof viewport === 'object' &&
    'setStack' in viewport &&
    'setImageIdIndex' in viewport &&
    typeof (viewport as any).setStack === 'function'
  )
}

export default function DicomViewer({
  instances,
  series,
  activeTool,
  windowLevelPreset,
}: DicomViewerProps) {
  const viewportRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])
  const [currentBaseIndex, setCurrentBaseIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cornerstoneReady, setCornerstoneReady] = useState(false)

  const renderingEngineRef = useRef<cornerstone.RenderingEngine | null>(null)
  const toolGroupRef = useRef<ReturnType<
    typeof cornerstoneTools.ToolGroupManager.getToolGroup
  > | null>(null)
  const instancesLengthRef = useRef(instances.length)

  instancesLengthRef.current = instances.length

  useEffect(() => {
    let mounted = true

    async function init() {
      if (!isInitialized()) {
        try {
          await initCornerstone()
        } catch (error) {
          console.error('[DicomViewer] Failed to initialize Cornerstone:', error)
          if (mounted) {
            setLoadError('DICOM 뷰어 초기화에 실패했습니다.')
            setIsLoading(false)
          }
          return
        }
      }
      if (mounted) {
        setCornerstoneReady(true)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  const loadImageStack = useCallback(async () => {
    if (!series || instances.length === 0 || !renderingEngineRef.current) return

    try {
      setIsLoading(true)

      const allImageIds = instances.map((instance) => {
        const wadoUrl = getWadoUriUrl(
          series.studyInstanceUid,
          series.seriesInstanceUid,
          instance.sopInstanceUid
        )
        // Vite 프록시를 통해 /dicomweb → http://localhost:10201 로 전달 (CORS 방지)
        return `wadouri:${wadoUrl}`
      })

      if (DEBUG_VIEWER) console.log('[DicomViewer] Loading 2x2 grid with', allImageIds.length, 'total images')

      for (let i = 0; i < VIEWPORT_IDS.length; i++) {
        const viewport = renderingEngineRef.current.getViewport(VIEWPORT_IDS[i])

        if (!isStackViewport(viewport)) {
          throw new Error(`Invalid viewport type: expected IStackViewport for ${VIEWPORT_IDS[i]}`)
        }

        const imageIndex = currentBaseIndex + i

        if (imageIndex < allImageIds.length) {
          await viewport.setStack(allImageIds, imageIndex)
          viewport.render()
        } else {
          console.log(`[DicomViewer] Viewport ${i} has no image (index ${imageIndex})`)
        }
      }

      if (DEBUG_VIEWER) console.log('[DicomViewer] 2x2 grid loaded successfully')

      setIsLoading(false)
      setLoadError(null)
    } catch (error) {
      console.error('[DicomViewer] Failed to load image stack:', error)
      setLoadError('DICOM 이미지 로드에 실패했습니다.')
      setIsLoading(false)
    }
  }, [series, instances, currentBaseIndex])

  useEffect(() => {
    if (!cornerstoneReady || !viewportRefs.current.every(ref => ref) || instances.length === 0) return

    async function setupViewer() {
      try {
        setIsLoading(true)
        setLoadError(null)

        let renderingEngine = cornerstone.getRenderingEngine(RENDERING_ENGINE_ID)
        if (!renderingEngine) {
          renderingEngine = new cornerstone.RenderingEngine(RENDERING_ENGINE_ID)
        }
        renderingEngineRef.current = renderingEngine

        const viewportInputs: cornerstone.Types.PublicViewportInput[] = VIEWPORT_IDS.map((id, index) => ({
          viewportId: id,
          type: cornerstone.Enums.ViewportType.STACK,
          element: viewportRefs.current[index]!,
          defaultOptions: {
            background: [0, 0, 0] as cornerstone.Types.Point3,
          },
        }))

        viewportInputs.forEach(viewportInput => {
          renderingEngine.enableElement(viewportInput)
        })

        let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
        if (!toolGroup) {
          toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID)
        }

        if (toolGroup) {
          VIEWPORT_IDS.forEach(id => {
            toolGroup!.addViewport(id, RENDERING_ENGINE_ID)
          })

          const toolsToAdd = [
            { tool: cornerstoneTools.WindowLevelTool, name: 'WindowLevel' },
            { tool: cornerstoneTools.PanTool, name: 'Pan' },
            { tool: cornerstoneTools.ZoomTool, name: 'Zoom' },
            { tool: cornerstoneTools.StackScrollTool, name: 'StackScroll' },
          ]

          toolsToAdd.forEach(({ name }) => {
            try {
              toolGroup!.addTool(name)
            } catch {
            }
          })

          toolGroup.setToolActive('WindowLevel', {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
          })
          toolGroup.setToolActive('Pan', {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
          })
          toolGroup.setToolActive('Zoom', {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
          })
          toolGroup.setToolActive('StackScroll', {
            bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
          })

          toolGroupRef.current = toolGroup
        }

        await loadImageStack()
      } catch (error) {
        console.error('[DicomViewer] Setup failed:', error)
        setLoadError('DICOM 뷰어 설정에 실패했습니다.')
        setIsLoading(false)
      }
    }

    setupViewer()

    return () => {
      if (renderingEngineRef.current) {
        try {
          VIEWPORT_IDS.forEach(id => {
            renderingEngineRef.current!.disableElement(id)
          })
        } catch {
        }
      }
    }
  }, [cornerstoneReady, instances.length, loadImageStack])

  useEffect(() => {
    if (!renderingEngineRef.current || isLoading) return
    loadImageStack()
  }, [currentBaseIndex, loadImageStack, isLoading])

  useEffect(() => {
    if (!toolGroupRef.current) return

    const toolGroup = toolGroupRef.current
    const toolName = mapViewerToolToCornerstone(activeTool)

    if (toolName) {
      try {
        toolGroup.setToolPassive('WindowLevel')
        toolGroup.setToolPassive('Pan')
        toolGroup.setToolPassive('Zoom')
      } catch {
      }

      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
      })
    }
  }, [activeTool])

  useEffect(() => {
    if (!windowLevelPreset || !renderingEngineRef.current) return

    VIEWPORT_IDS.forEach(id => {
      const viewport = renderingEngineRef.current!.getViewport(id)

      if (!isStackViewport(viewport)) {
        return
      }

      const { windowWidth, windowCenter } = windowLevelPreset
      viewport.setProperties({
        voiRange: {
          lower: windowCenter - windowWidth / 2,
          upper: windowCenter + windowWidth / 2
        }
      })
      viewport.render()
    })
  }, [windowLevelPreset])

  const handlePrevious = useCallback(() => {
    setCurrentBaseIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentBaseIndex((prev) => Math.min(instancesLengthRef.current - 1, prev + 1))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious()
          break
        case 'ArrowRight':
          handleNext()
          break
        case 'Home':
          setCurrentBaseIndex(0)
          break
        case 'End':
          setCurrentBaseIndex(Math.max(0, instancesLengthRef.current - 1))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevious, handleNext])

  if (instances.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <p className="text-lg text-gray-400">이미지가 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full p-1">
        {VIEWPORT_IDS.map((id, index) => {
          const imageIndex = currentBaseIndex + index
          const instance = instances[imageIndex]

          return (
            <div key={id} className="relative bg-black border border-gray-700">
              <div
                ref={(el) => { viewportRefs.current[index] = el }}
                className="w-full h-full"
                style={{ minHeight: '200px' }}
              />

              {instance && (
                <ViewerOverlay
                  series={series}
                  instance={instance}
                  currentIndex={imageIndex}
                  totalInstances={instances.length}
                  activeTool={activeTool}
                  windowLevelPreset={windowLevelPreset}
                  compact={true}
                />
              )}

              {!instance && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-600">No Image</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-lg">DICOM 이미지를 불러오는 중...</p>
          </div>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white max-w-md px-4">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <p className="text-lg text-red-400 mb-2">오류 발생</p>
            <p className="text-gray-400 text-sm">{loadError}</p>
          </div>
        </div>
      )}

      {instances.length > 1 && !isLoading && (
        <>
          <button
            onClick={handlePrevious}
            disabled={currentBaseIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentBaseIndex >= instances.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-md text-sm z-10">
        Showing {currentBaseIndex + 1}-{Math.min(currentBaseIndex + 4, instances.length)} of {instances.length}
      </div>
    </div>
  )
}

function mapViewerToolToCornerstone(tool: ViewerTool): string | null {
  switch (tool) {
    case 'WindowLevel':
      return 'WindowLevel'
    case 'Zoom':
      return 'Zoom'
    case 'Pan':
      return 'Pan'
    default:
      return null
  }
}
