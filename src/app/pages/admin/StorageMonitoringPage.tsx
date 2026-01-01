import { BarChart3 } from 'lucide-react';
import ComingSoonPage from './ComingSoonPage';

/**
 * StorageMonitoringPage.tsx
 *
 * 스토리지 모니터링 준비 중 페이지
 */
export default function StorageMonitoringPage() {
  return (
    <ComingSoonPage
      icon={BarChart3}
      title="스토리지 모니터링"
      description="스토리지 사용량 및 Tier 분포 모니터링"
      features={[
        '전체 스토리지 사용량 차트 (시계열)',
        'Tier별 분포 (Hot/Warm/Cold) 파이 차트',
        '파일 수 통계',
        '최근 업로드 추이',
        'Tier 전환 이력',
        '스토리지 증가 예측',
      ]}
      expectedWeek="Week 14-15"
      dependencies={[
        'GET /api/admin/metrics/storage - 스토리지 전체 통계',
        'GET /api/admin/metrics/tier-distribution - Tier 분포',
        'GET /api/admin/metrics/trends - 시간대별 추이',
        'GET /api/admin/metrics/tier-history - Tier 전환 이력',
      ]}
    />
  );
}
