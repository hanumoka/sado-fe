import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import type { Instance, ViewerTool, WindowLevelPreset } from '../types/viewer';

/**
 * DicomViewer.tsx
 *
 * DICOM 이미지 뷰어 컴포넌트
 *
 * 목적:
 * - DICOM 이미지 렌더링
 * - 다중 Instance 네비게이션
 * - 측정 도구 적용
 *
 * 현재: Mock 플레이스홀더 (실제 DICOM 파일 없음)
 * Week 6+: Cornerstone3D 통합 (WADO-RS로 DICOM 로드)
 */

interface DicomViewerProps {
  instances: Instance[];
  activeTool: ViewerTool;
  windowLevelPreset?: WindowLevelPreset;
}

export default function DicomViewer({
  instances,
  activeTool,
  windowLevelPreset,
}: DicomViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentInstance = instances[currentIndex];

  // Mock: 실제로는 Cornerstone3D 초기화
  useEffect(() => {
    if (!viewerRef.current) return;

    // TODO Week 6+: Cornerstone3D 초기화
    // import * as cornerstone3D from '@cornerstonejs/core';
    // const renderingEngine = new cornerstone3D.RenderingEngine('myRenderingEngine');
    // const viewport = renderingEngine.getViewport('CT_AXIAL');
    // viewport.setStack(imageIds);

    console.log('Viewer initialized with tool:', activeTool);
    console.log('Window/Level preset:', windowLevelPreset);
  }, [activeTool, windowLevelPreset]);

  // 이전 Instance로 이동
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 다음 Instance로 이동
  const handleNext = () => {
    if (currentIndex < instances.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, instances.length]);

  if (instances.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <p className="text-lg text-gray-400">이미지가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* DICOM 뷰어 영역 */}
      <div
        ref={viewerRef}
        className="w-full h-full flex items-center justify-center"
      >
        {/* Mock 플레이스홀더 - Week 6+에 실제 DICOM 렌더링 */}
        <div className="text-center text-white">
          <div className="bg-gray-800 rounded-lg p-12 inline-block">
            <ImageIcon className="h-32 w-32 mx-auto mb-6 text-gray-600" />
            <div className="space-y-2">
              <p className="text-2xl font-bold text-blue-500">
                DICOM Viewer Placeholder
              </p>
              <p className="text-gray-400">
                Instance {currentInstance.instanceNumber} /{' '}
                {instances.length}
              </p>
              <p className="text-sm text-gray-500">
                SOP Instance UID: {currentInstance.sopInstanceUid}
              </p>
              <p className="text-sm text-gray-500">
                Storage URI: {currentInstance.storageUri}
              </p>
              <p className="text-xs text-gray-600 mt-4">
                Week 6+ Cornerstone3D 통합 예정
              </p>
              <p className="text-xs text-gray-600">
                실제 DICOM 파일은 WADO-RS API를 통해 로드됩니다
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 컨트롤 */}
      {instances.length > 1 && (
        <>
          {/* 이전 버튼 */}
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 text-white p-3 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* 다음 버튼 */}
          <button
            onClick={handleNext}
            disabled={currentIndex === instances.length - 1}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-800 bg-opacity-75 hover:bg-opacity-100 text-white p-3 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* 인스턴스 카운터 */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-75 text-white px-4 py-2 rounded-full">
            <span className="text-sm font-medium">
              {currentIndex + 1} / {instances.length}
            </span>
          </div>
        </>
      )}

      {/* 활성 도구 표시 */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-75 text-white px-3 py-2 rounded-md">
        <p className="text-xs text-gray-400">활성 도구</p>
        <p className="text-sm font-medium">{activeTool}</p>
      </div>

      {/* Window/Level 정보 */}
      {windowLevelPreset && (
        <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-75 text-white px-3 py-2 rounded-md">
          <p className="text-xs text-gray-400">{windowLevelPreset.name}</p>
          <p className="text-sm font-medium">
            W: {windowLevelPreset.windowWidth} / C:{' '}
            {windowLevelPreset.windowCenter}
          </p>
        </div>
      )}
    </div>
  );
}
