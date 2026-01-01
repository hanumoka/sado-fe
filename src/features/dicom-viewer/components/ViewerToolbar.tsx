import {
  Maximize2,
  Move,
  Ruler,
  Triangle,
  Square,
  RotateCcw,
  Sun,
} from 'lucide-react';
import type { ViewerTool, WindowLevelPreset } from '../types/viewer';
import { DEFAULT_PRESETS } from '../types/viewer';

/**
 * ViewerToolbar.tsx
 *
 * DICOM Viewer 도구 모음
 *
 * 목적:
 * - 측정 도구 선택 (길이, 각도, ROI)
 * - 뷰 조작 도구 (확대, 이동, 초기화)
 * - Window/Level 프리셋
 */

interface ViewerToolbarProps {
  activeTool: ViewerTool;
  onToolChange: (tool: ViewerTool) => void;
  onPresetChange: (preset: WindowLevelPreset) => void;
}

export default function ViewerToolbar({
  activeTool,
  onToolChange,
  onPresetChange,
}: ViewerToolbarProps) {
  const tools: Array<{ name: ViewerTool; icon: any; label: string }> = [
    { name: 'WindowLevel', icon: Sun, label: '창/레벨' },
    { name: 'Zoom', icon: Maximize2, label: '확대' },
    { name: 'Pan', icon: Move, label: '이동' },
    { name: 'Length', icon: Ruler, label: '길이' },
    { name: 'Angle', icon: Triangle, label: '각도' },
    { name: 'Rectangle', icon: Square, label: 'ROI' },
    { name: 'Reset', icon: RotateCcw, label: '초기화' },
  ];

  return (
    <div className="bg-gray-800 text-white p-4">
      <div className="flex items-center justify-between">
        {/* 도구 버튼들 */}
        <div className="flex items-center gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.name;

            return (
              <button
                key={tool.name}
                onClick={() => onToolChange(tool.name)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md transition-colors
                  ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
                title={tool.label}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Window/Level 프리셋 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Window/Level:</span>
          <select
            onChange={(e) => {
              const preset = DEFAULT_PRESETS[parseInt(e.target.value)];
              if (preset) {
                onPresetChange(preset);
              }
            }}
            className="bg-gray-700 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">프리셋 선택</option>
            {DEFAULT_PRESETS.map((preset, index) => (
              <option key={index} value={index}>
                {preset.name} (W:{preset.windowWidth} C:{preset.windowCenter})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
