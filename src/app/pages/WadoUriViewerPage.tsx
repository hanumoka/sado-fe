import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * WADO-URI Viewer Page (POC)
 *
 * WADO-URI (전통적 HTTP GET) 방식으로 DICOM 이미지를 로드하는 뷰어
 * - URL 쿼리 파라미터로 DICOM 객체 요청
 * - 레거시 PACS 시스템과의 호환성
 *
 * 라우트: /viewer/wado-uri/:studyInstanceUid/:seriesInstanceUid
 */
export default function WadoUriViewerPage() {
  const { studyInstanceUid, seriesInstanceUid } = useParams<{
    studyInstanceUid: string
    seriesInstanceUid: string
  }>()
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">WADO-URI Viewer (POC)</h1>
            <p className="text-sm text-gray-400">Legacy WADO + Query Parameters</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="text-center">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🔗</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">WADO-URI POC</h2>
            <p className="text-gray-400">구현 예정</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto text-left">
            <h3 className="font-semibold mb-3 text-green-400">구현 계획</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• URL 쿼리 파라미터 방식 요청</li>
              <li>• ?requestType=WADO&studyUID=...&seriesUID=...</li>
              <li>• 레거시 PACS 호환</li>
              <li>• 단일 프레임 요청에 최적화</li>
            </ul>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                Study: {studyInstanceUid?.substring(0, 20)}...
              </p>
              <p className="text-xs text-gray-500">
                Series: {seriesInstanceUid?.substring(0, 20)}...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
