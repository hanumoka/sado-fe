import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Code } from 'lucide-react';

/**
 * ComingSoonPage.tsx
 *
 * Admin 기능 준비 중 페이지 (공통 컴포넌트)
 *
 * 목적:
 * - Admin 기능이 아직 구현되지 않았음을 안내
 * - 예정 Week 정보 표시
 * - 기능 설명 제공
 */

interface ComingSoonPageProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  features: string[];
  expectedWeek: string;
  dependencies?: string[];
}

export default function ComingSoonPage({
  icon: Icon,
  title,
  description,
  features,
  expectedWeek,
  dependencies = [],
}: ComingSoonPageProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* 메인 카드 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* 아이콘 및 제목 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <Icon className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-lg text-gray-600">{description}</p>
          </div>

          {/* 준비 중 메시지 */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  준비 중 (Coming Soon)
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  이 기능은 <span className="font-semibold">{expectedWeek}</span>에 구현 예정입니다
                </p>
              </div>
            </div>
          </div>

          {/* 예정 기능 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              예정 기능
            </h2>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3"></span>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 의존성 */}
          {dependencies.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                필요한 BE 작업
              </h2>
              <ul className="space-y-2">
                {dependencies.map((dep, index) => (
                  <li key={index} className="flex items-start">
                    <Code className="h-4 w-4 text-gray-500 mt-1 mr-2" />
                    <span className="text-sm text-gray-600">{dep}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 돌아가기 버튼 */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard로 돌아가기
            </button>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>현재 POC는 Phase 1 (Core PACS) 기능만 구현되어 있습니다.</p>
          <p className="mt-1">Phase 2 (Admin) 기능은 Week 11-16에 구현 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}
