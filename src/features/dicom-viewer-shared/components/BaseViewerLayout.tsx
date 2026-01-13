/**
 * BaseViewerLayout - 공유 뷰어 레이아웃 조합 컴포넌트
 *
 * 모든 DICOM 뷰어에서 공통으로 사용하는 레이아웃 구조:
 * - Header: 뒤로가기 + Series 정보 + 그리드 선택
 * - Main: 왼쪽(Viewer Grid 70%) + 오른쪽(Instance 목록 30%)
 * - Footer: Global Playback Controller
 *
 * Strategy Pattern을 통해 로더별 동작 주입
 */
import { ViewerHeader } from './ViewerHeader'
import { ViewerFooter } from './ViewerFooter'
import { InstanceSidebar } from './InstanceSidebar'
import { ViewerGrid } from './ViewerGrid'
import type {
  BaseInstanceInfo,
  GridLayout,
  InstanceFilter,
  ViewerLoaderStrategy,
} from '../types/viewerTypes'

/** BaseViewerLayout Props */
export interface BaseViewerLayoutProps<T extends BaseInstanceInfo> {
  // 로더 전략
  strategy: ViewerLoaderStrategy

  // Series 정보
  modality?: string
  seriesDescription?: string

  // 상태
  layout: GridLayout
  isInitialized: boolean
  isLoading: boolean
  error: Error | null
  selectedSlot: number

  // Instance 데이터
  filteredInstances: T[]
  instanceFilter: InstanceFilter
  playableCount: number
  totalCount: number

  // Store 상태 (FPS, Resolution)
  globalFps: number
  /** Resolution 선택 (512=PNG, 256=JPEG, 128=JPEG) */
  globalResolution?: number

  // 핸들러
  onLayoutChange: (layout: GridLayout) => void
  onSlotClick: (slotId: number) => void
  onThumbnailClick: (index: number) => void
  onFilterChange: (filter: InstanceFilter) => void
  onFpsChange: (fps: number) => void
  onResolutionChange?: (resolution: number) => void
  onPlayAll: () => void
  onPauseAll: () => void
  onStopAll: () => void
  onBack: () => void

  // 썸네일 이벤트
  onThumbnailLoad: (sopInstanceUid: string) => void
  onThumbnailError: (sopInstanceUid: string) => void

  // 슬롯 렌더링 (Render Prop)
  renderSlot: (slotId: number) => React.ReactNode

  // 추가 컨트롤 (선택적)
  extraControls?: React.ReactNode
}

export function BaseViewerLayout<T extends BaseInstanceInfo>({
  strategy,
  modality,
  seriesDescription,
  layout,
  isInitialized,
  isLoading,
  error,
  selectedSlot,
  filteredInstances,
  instanceFilter,
  playableCount,
  totalCount,
  globalFps,
  globalResolution,
  onLayoutChange,
  onSlotClick,
  onThumbnailClick,
  onFilterChange,
  onFpsChange,
  onResolutionChange,
  onPlayAll,
  onPauseAll,
  onStopAll,
  onBack,
  onThumbnailLoad,
  onThumbnailError,
  renderSlot,
  extraControls,
}: BaseViewerLayoutProps<T>) {
  const { accentColor, displayName } = strategy

  // 썸네일 URL 생성 함수
  const getThumbnailUrl = (instance: T): string => {
    return strategy.getThumbnailUrl(
      instance.studyInstanceUid,
      instance.seriesInstanceUid,
      instance.sopInstanceUid,
      1 // frame 1
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* Header */}
      <ViewerHeader
        modality={modality}
        seriesDescription={seriesDescription}
        displayName={displayName}
        accentColor={accentColor}
        isLoading={isLoading}
        isInitialized={isInitialized}
        layout={layout}
        onLayoutChange={onLayoutChange}
        onBack={onBack}
      />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* 왼쪽: Viewer Grid (flex-1 자동 확장) */}
        <div className="flex-1 h-full bg-black p-2">
          <ViewerGrid
            layout={layout}
            isInitialized={isInitialized}
            selectedSlot={selectedSlot}
            onSlotClick={onSlotClick}
            accentColor={accentColor}
            renderSlot={renderSlot}
          />
        </div>

        {/* 오른쪽: Instance Sidebar (고정 280px) */}
        <InstanceSidebar
          filteredInstances={filteredInstances}
          instanceFilter={instanceFilter}
          onFilterChange={onFilterChange}
          onThumbnailClick={onThumbnailClick}
          selectedSlot={selectedSlot}
          isLoading={isLoading}
          error={error}
          getThumbnailUrl={getThumbnailUrl}
          onThumbnailLoad={onThumbnailLoad}
          onThumbnailError={onThumbnailError}
          accentColor={accentColor}
          playableCount={playableCount}
          totalCount={totalCount}
        />
      </main>

      {/* Footer */}
      <ViewerFooter
        globalFps={globalFps}
        onFpsChange={onFpsChange}
        globalResolution={globalResolution}
        onResolutionChange={onResolutionChange}
        onPlayAll={onPlayAll}
        onPauseAll={onPauseAll}
        onStopAll={onStopAll}
        accentColor={accentColor}
        displayName={displayName}
        extraControls={extraControls}
      />
    </div>
  )
}
