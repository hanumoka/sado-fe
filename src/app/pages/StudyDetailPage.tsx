import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Eye } from 'lucide-react';
import { MOCK_STUDIES, MOCK_SERIES } from '@/lib/mockData';

/**
 * StudyDetailPage.tsx
 *
 * Study 상세 페이지
 *
 * 목적:
 * - Study 상세 정보 표시
 * - Series 목록 표시
 * - Series 클릭 → DICOM Viewer 이동
 */
export default function StudyDetailPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();

  // Mock 데이터에서 Study 찾기
  const study = MOCK_STUDIES.find((s) => s.id === studyId);

  // Study에 속한 Series 찾기
  const seriesList = MOCK_SERIES.filter((s) => s.studyId === studyId);

  const handleBack = () => {
    navigate(-1);
  };

  const handleViewSeries = (seriesId: string) => {
    navigate(`/viewer/${seriesId}`);
  };

  if (!study) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-600">Study를 찾을 수 없습니다</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">돌아가기</span>
          </button>
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Study 상세</h1>
            <p className="mt-1 text-sm text-gray-600">
              {study.modality} - {study.studyDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Study 정보 카드 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Study 정보
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">환자 이름</p>
            <p className="text-lg font-medium text-gray-900">
              {study.patientName}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Study Instance UID</p>
            <p className="text-sm font-mono text-gray-900 truncate">
              {study.studyInstanceUid}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">검사 날짜</p>
            <p className="text-lg font-medium text-gray-900">
              {study.studyDate}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">검사 시간</p>
            <p className="text-lg font-medium text-gray-900">
              {study.studyTime}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Modality</p>
            <p className="text-lg font-medium text-gray-900">
              {study.modality}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Study 설명</p>
            <p className="text-lg font-medium text-gray-900">
              {study.studyDescription}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Series 수</p>
            <p className="text-lg font-medium text-gray-900">
              {study.seriesCount}개
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Instance 수</p>
            <p className="text-lg font-medium text-gray-900">
              {study.instancesCount}개
            </p>
          </div>
        </div>
      </div>

      {/* Series 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Series 목록 ({seriesList.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Series를 클릭하면 DICOM Viewer로 이동합니다
          </p>
        </div>

        {seriesList.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Series가 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {seriesList.map((series) => (
              <div
                key={series.id}
                onClick={() => handleViewSeries(series.id)}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {series.modality}
                      </span>
                      <span className="text-sm text-gray-600">
                        Series #{series.seriesNumber}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-gray-900">
                      {series.seriesDescription}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 font-mono">
                      {series.seriesInstanceUid}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {series.instancesCount}개 이미지
                    </p>
                  </div>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewSeries(series.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-medium">뷰어 열기</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
