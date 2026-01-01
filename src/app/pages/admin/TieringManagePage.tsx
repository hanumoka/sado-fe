import { Layers } from 'lucide-react';
import ComingSoonPage from './ComingSoonPage';

/**
 * TieringManagePage.tsx
 *
 * Storage Tier 관리 준비 중 페이지
 */
export default function TieringManagePage() {
  return (
    <ComingSoonPage
      icon={Layers}
      title="Tier 관리"
      description="Hot/Warm/Cold Storage Tier 관리 및 자동 전환 설정"
      features={[
        'Tier별 파일 목록 (Hot/Warm/Cold)',
        '수동 Tier 전환 (파일 선택 → Tier 변경)',
        '자동 Tier 전환 정책 설정',
        'Tier 전환 규칙 (30일 → Warm, 1년 → Cold)',
        'Tier 전환 스케줄러 설정',
        'Tier 전환 이력 조회',
      ]}
      expectedWeek="Week 15-16"
      dependencies={[
        'GET /api/admin/files?tier={tier} - Tier별 파일 목록',
        'POST /api/admin/files/:id/tier - 수동 Tier 전환',
        'GET /api/admin/tiering/policy - Tier 정책 조회',
        'PUT /api/admin/tiering/policy - Tier 정책 설정',
        'GET /api/admin/tiering/history - Tier 전환 이력',
        'FileAccessLog 추적 (BE Entity 추가 필요)',
      ]}
    />
  );
}
