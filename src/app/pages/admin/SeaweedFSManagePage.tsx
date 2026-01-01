import { Layers } from 'lucide-react';
import ComingSoonPage from './ComingSoonPage';

/**
 * SeaweedFSManagePage.tsx
 *
 * SeaweedFS 파일시스템 관리 준비 중 페이지
 */
export default function SeaweedFSManagePage() {
  return (
    <ComingSoonPage
      icon={Layers}
      title="파일시스템 관리"
      description="SeaweedFS 클러스터 및 Volume 관리"
      features={[
        'Volume 상태 모니터링 (사용량, Replication)',
        'Filer 디렉토리 브라우저',
        'Volume 추가/삭제',
        'Replication 설정',
        'Master/Volume/Filer 노드 상태',
        '클러스터 Health 체크',
      ]}
      expectedWeek="Week 11-13"
      dependencies={[
        'GET /api/admin/seaweedfs/volumes - Volume 목록 조회',
        'GET /api/admin/seaweedfs/filer/ls - Filer 디렉토리 조회',
        'GET /api/admin/seaweedfs/cluster - 클러스터 상태',
        'POST /api/admin/seaweedfs/volumes - Volume 생성',
        'DELETE /api/admin/seaweedfs/volumes/:id - Volume 삭제',
      ]}
    />
  );
}
