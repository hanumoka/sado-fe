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

/**
 * DicomViewer.tsx
 *
 * Cornerstone3D 기반 DICOM 이미지 뷰어 컴포넌트
 *
 * 기능:
 * - Cornerstone3D로 실제 DICOM 이미지 렌더링
 * - WADO-RS/WADO-URI로 DICOM 파일 로드
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
const VIEWPORT_ID = 'dicomViewerViewport'
const TOOL_GROUP_ID = 'dicomViewerToolGroup'

export default function DicomViewer({
  instances,
  series,
  activeTool,
  windowLevelPreset,
}: DicomViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cornerstoneReady, setCornerstoneReady] = useState(false)

  const renderingEngineRef = useRef<cornerstone.RenderingEngine | null>(null)
  const toolGroupRef = useRef<ReturnType<
    typeof cornerstoneTools.ToolGroupManager.getToolGroup
  > | null>(null)

  const currentInstance = instances[currentIndex]

  // Cornerstone3D 초기화
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

  // Rendering Engine 및 Viewport 설정
  useEffect(() => {
    if (!cornerstoneReady || !viewerRef.current || instances.length === 0) return

    const element = viewerRef.current

    async function setupViewer() {
      try {
        setIsLoading(true)
        setLoadError(null)

        // RenderingEngine 생성
        let renderingEngine = cornerstone.getRenderingEngine(RENDERING_ENGINE_ID)
        if (!renderingEngine) {
          renderingEngine = new cornerstone.RenderingEngine(RENDERING_ENGINE_ID)
        }
        renderingEngineRef.current = renderingEngine

        // Viewport 설정
        const viewportInput: cornerstone.Types.PublicViewportInput = {
          viewportId: VIEWPORT_ID,
          type: cornerstone.Enums.ViewportType.STACK,
          element,
          defaultOptions: {
            background: [0, 0, 0] as cornerstone.Types.Point3,
          },
        }

        renderingEngine.enableElement(viewportInput)

        // Tool Group 설정
        let toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
        if (!toolGroup) {
          toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID)
        }

        if (toolGroup) {
          toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID)

          // 도구 설정
          const toolsToAdd = [
            { tool: cornerstoneTools.WindowLevelTool, name: 'WindowLevel' },
            { tool: cornerstoneTools.PanTool, name: 'Pan' },
            { tool: cornerstoneTools.ZoomTool, name: 'Zoom' },
            { tool: cornerstoneTools.StackScrollTool, name: 'StackScroll' },
            { tool: cornerstoneTools.LengthTool, name: 'Length' },
          ]

          toolsToAdd.forEach(({ name }) => {
            try {
              toolGroup!.addTool(name)
            } catch {
              // 이미 추가된 도구면 무시
            }
          })

          // 기본 도구 활성화
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

        // 이미지 스택 로드
        await loadImageStack()
      } catch (error) {
        console.error('[DicomViewer] Setup failed:', error)
        setLoadError('DICOM 뷰어 설정에 실패했습니다.')
        setIsLoading(false)
      }
    }

    setupViewer()

    // Cleanup
    return () => {
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.disableElement(VIEWPORT_ID)
        } catch {
          // 무시
        }
      }
    }
  }, [cornerstoneReady, instances.length])

  // 이미지 스택 로드
  const loadImageStack = useCallback(async () => {
    if (!series || instances.length === 0 || !renderingEngineRef.current) return

    try {
      setIsLoading(true)

      // WADO-URI 형식의 이미지 URL 생성
      const imageIds = instances.map((instance) => {
        // wadouri 스키마로 WADO-URI URL 생성
        const wadoUrl = getWadoUriUrl(
          series.studyInstanceUid,
          series.seriesInstanceUid,
          instance.sopInstanceUid
        )
        return `wadouri:${window.location.origin}${wadoUrl}`
      })

      console.log('[DicomViewer] Loading image stack:', imageIds.length, 'images')

      // Viewport에 이미지 스택 설정
      const viewport = renderingEngineRef.current.getViewport(
        VIEWPORT_ID
      ) as cornerstone.Types.IStackViewport

      if (viewport) {
        await viewport.setStack(imageIds, currentIndex)
        viewport.render()
        console.log('[DicomViewer] Image stack loaded successfully')
      }

      setIsLoading(false)
      setLoadError(null)
    } catch (error) {
      console.error('[DicomViewer] Failed to load image stack:', error)
      setLoadError('DICOM 이미지 로드에 실패했습니다. 백엔드 서버를 확인하세요.')
      setIsLoading(false)
    }
  }, [series, instances, currentIndex])

  // 이미지 인덱스 변경 시 Viewport 업데이트
  useEffect(() => {
    if (!renderingEngineRef.current || isLoading) return

    const viewport = renderingEngineRef.current.getViewport(
      VIEWPORT_ID
    ) as cornerstone.Types.IStackViewport

    if (viewport) {
      try {
        viewport.setImageIdIndex(currentIndex)
        viewport.render()
      } catch (error) {
        console.warn('[DicomViewer] Failed to set image index:', error)
      }
    }
  }, [currentIndex, isLoading])

  // 도구 변경 처리
  useEffect(() => {
    if (!toolGroupRef.current) return

    const toolGroup = toolGroupRef.current
    const toolName = mapViewerToolToCornerstone(activeTool)

    if (toolName) {
      // 기존 Primary 도구 비활성화
      try {
        toolGroup.setToolPassive('WindowLevel')
        toolGroup.setToolPassive('Pan')
        toolGroup.setToolPassive('Zoom')
        toolGroup.setToolPassive('Length')
      } catch {
        // 무시
      }

      // 새 도구 활성화
      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
      })
    }
  }, [activeTool])

  // Window/Level 프리셋 적용
  useEffect(() => {
    if (!windowLevelPreset || !renderingEngineRef.current) return

    const viewport = renderingEngineRef.current.getViewport(
      VIEWPORT_ID
    ) as cornerstone.Types.IStackViewport

    if (viewport) {
      const { windowWidth, windowCenter } = windowLevelPreset
      viewport.setProperties({ voiRange: { lower: windowCenter - windowWidth / 2, upper: windowCenter + windowWidth / 2 } })
      viewport.render()
    }
  }, [windowLevelPreset])

  // 이전 Instance로 이동
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  // 다음 Instance로 이동
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < instances.length - 1 ? prev + 1 : prev))
  }, [instances.length])

  // 키보드 네비게이션
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
          setCurrentIndex(0)
          break
        case 'End':
          setCurrentIndex(instances.length - 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevious, handleNext, instances.length])

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
      {/* Cornerstone3D 렌더링 영역 */}
      <div
        ref={viewerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-lg">DICOM 이미지를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white max-w-md px-4">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <p className="text-lg text-red-400 mb-2">오류 발생</p>
            <p className="text-gray-400 text-sm">{loadError}</p>
            <p className="text-gray-500 text-xs mt-4">
              Mock 모드에서는 실제 DICOM 이미지가 없으므로 렌더링되지 않습니다.
              <br />
              백엔드에 DICOM 파일을 업로드한 후 다시 시도하세요.
            </p>
          </div>
        </div>
      )}

      {/* 네비게이션 컨트롤 */}
      {instances.length > 1 && !isLoading && (
        <>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === instances.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* 오버레이 정보 */}
      <ViewerOverlay
        series={series}
        instance={currentInstance}
        currentIndex={currentIndex}
        totalInstances={instances.length}
        activeTool={activeTool}
        windowLevelPreset={windowLevelPreset}
      />
    </div>
  )
}

/**
 * ViewerTool을 Cornerstone 도구 이름으로 매핑
 */
function mapViewerToolToCornerstone(tool: ViewerTool): string | null {
  switch (tool) {
    case 'WindowLevel':
      return 'WindowLevel'
    case 'Zoom':
      return 'Zoom'
    case 'Pan':
      return 'Pan'
    case 'Length':
      return 'Length'
    default:
      return null
  }
}
