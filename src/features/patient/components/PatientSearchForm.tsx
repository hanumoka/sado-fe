import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PatientSearchParams } from '../types/patient';

/**
 * PatientSearchForm.tsx
 *
 * 환자 검색 폼 컴포넌트
 *
 * 목적:
 * - 이름 검색 입력
 * - 성별 필터 선택
 * - 검색 실행 및 초기화
 */

interface PatientSearchFormProps {
  onSearch: (params: PatientSearchParams) => void;
}

export default function PatientSearchForm({
                                            onSearch,
                                          }: PatientSearchFormProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'ALL'>('ALL');

  // 검색 실행
  const handleSearch = () => {
    onSearch({
      name: name || undefined,
      gender: gender === 'ALL' ? undefined : gender,
    });
  };

  // 초기화
  const handleReset = () => {
    setName('');
    setGender('ALL');
    onSearch({});
  };

  // Enter 키 이벤트
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex flex-wrap items-end gap-4">
        {/* 이름 검색 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            환자 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="이름을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 성별 필터 */}
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            성별
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'ALL')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체</option>
            <option value="M">남성</option>
            <option value="F">여성</option>
          </select>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex gap-2">
          {/* 초기화 버튼 */}
          <Button variant="outline" onClick={handleReset}>
            <X className="h-4 w-4 mr-2" />
            초기화
          </Button>

          {/* 검색 버튼 */}
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            검색
          </Button>
        </div>
      </div>
    </div>
  );
}
