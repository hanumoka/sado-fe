import { Settings } from 'lucide-react';
import ComingSoonPage from './ComingSoonPage';

/**
 * AdminDashboardPage.tsx
 *
 * Admin 대시보드 준비 중 페이지
 */
export default function AdminDashboardPage() {
  return (
    <ComingSoonPage
      icon={Settings}
      title="Admin 대시보드"
      description="시스템 전체 상태 및 관리 기능 총괄"
      features={[
        '시스템 전체 상태 모니터링',
        'SeaweedFS 클러스터 상태',
        '스토리지 사용량 차트',
        '최근 활동 로그',
        '빠른 작업 버튼 (Tier 전환, Volume 관리 등)',
      ]}
      expectedWeek="Week 11-13"
      dependencies={[
        'GET /api/admin/dashboard - 전체 상태 조회',
        'GET /api/admin/seaweedfs/status - SeaweedFS 상태',
        'GET /api/admin/metrics/summary - 요약 통계',
      ]}
    />
  );
}
