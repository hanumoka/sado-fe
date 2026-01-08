import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * WADO-RS Viewer Page (POC)
 *
 * WADO-RS (RESTful) 방식으로 DICOM 이미지를 로드하는 뷰어
 * - 바이너리 DICOM 데이터를 직접 받아서 클라이언트에서 디코딩
 * - Cornerstone.js dicomImageLoader 사용
 *
 * 라우트: /viewer/wado-rs/:studyInstanceUid/:seriesInstanceUid
 */
export default function WadoRsViewerPage() {
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
            <h1 className="text-lg font-semibold">WADO-RS Viewer (POC)</h1>
            <p className="text-sm text-gray-400">Binary DICOM + Client-side Decoding</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="text-center">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🔬</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">WADO-RS POC</h2>
            <p className="text-gray-400">구현 예정</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto text-left">
            <h3 className="font-semibold mb-3 text-blue-400">구현 계획</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• DICOM 바이너리 데이터 직접 로드</li>
              <li>• cornerstoneDICOMImageLoader 사용</li>
              <li>• 클라이언트 사이드 디코딩</li>
              <li>• Window/Level 조정 가능</li>
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
