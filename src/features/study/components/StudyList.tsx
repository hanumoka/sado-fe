import { useNavigate } from 'react-router-dom';
import type { Study } from '../types/study';

/**
 * StudyList.tsx
 *
 * Study 목록 테이블 컴포넌트
 *
 * 목적:
 * - Study 데이터를 테이블로 표시
 * - 클릭 시 Study 상세 페이지로 이동
 * - 빈 상태 처리
 */

interface StudyListProps {
  studies: Study[];
}

export default function StudyList({ studies }: StudyListProps) {
  const navigate = useNavigate();

  const handleRowClick = (studyId: string) => {
    // Week 4-5에서 구현 예정
    navigate(`/studies/${studyId}`);
  };

  // 빈 상태
  if (studies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 text-lg">검색 결과가 없습니다</p>
        <p className="text-gray-400 text-sm mt-2">
          다른 검색 조건으로 시도해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* 테이블 헤더 */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                환자 이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                검사 날짜
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                검사 시간
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modality
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Study 설명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Series 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instance 수
              </th>
            </tr>
          </thead>

          {/* 테이블 바디 */}
          <tbody className="bg-white divide-y divide-gray-200">
            {studies.map((study) => (
              <tr
                key={study.id}
                onClick={() => handleRowClick(study.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {study.patientName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {study.studyDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {study.studyTime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {study.modality}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {study.studyDescription}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {study.seriesCount}개
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {study.instancesCount}개
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 결과 수 표시 */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-sm text-gray-700">
          총 <span className="font-medium">{studies.length}</span>개의 Study
        </p>
      </div>
    </div>
  );
}
