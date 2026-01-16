/**
 * SeaweedFS 관련 타입 정의
 */

/** Filer 디렉토리/파일 엔트리 */
export interface FilerEntry {
  /** 파일/디렉토리 이름 */
  name: string
  /** 디렉토리 여부 */
  isDirectory: boolean
  /** 파일 크기 (bytes), 디렉토리는 null */
  size: number | null
  /** 수정 시간 (ISO 8601) */
  modifiedTime: string | null
  /** MIME 타입 */
  mimeType: string | null
  /** 전체 경로 */
  fullPath: string
}

// ============================================================
// Cluster 상태 관련 타입
// ============================================================

/** Cluster Health 상태 */
export type ClusterHealthStatus = 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL'

/** 노드 상태 */
export type NodeStatus = 'UP' | 'DOWN'

/** Master 노드 정보 */
export interface MasterNode {
  /** 노드 이름 (설정에서 지정) */
  name: string
  /** Master 주소 */
  address: string
  /** Leader 여부 */
  isLeader: boolean
  /** 현재 Leader 주소 */
  leader?: string
  /** 노드 상태 */
  status: NodeStatus
  /** 에러 메시지 (DOWN 상태일 경우) */
  errorMessage?: string
  /** 마지막 상태 체크 시간 (ISO 8601) */
  lastChecked: string
}

/** Volume Server 노드 정보 */
export interface VolumeServerNode {
  /** 노드 이름 (설정에서 지정) */
  name: string
  /** Volume Server 주소 */
  address: string
  /** Volume 수 */
  volumeCount: number
  /** 전체 디스크 용량 (bytes) */
  totalDiskSpace: number
  /** 사용 중인 디스크 크기 (bytes) */
  usedDiskSize: number
  /** 여유 디스크 크기 (bytes) */
  freeDiskSize: number
  /** 노드 상태 */
  status: NodeStatus
  /** 에러 메시지 (DOWN 상태일 경우) */
  errorMessage?: string
  /** 마지막 상태 체크 시간 (ISO 8601) */
  lastChecked: string
}

/** Filer 노드 정보 */
export interface FilerNode {
  /** 노드 이름 (설정에서 지정) */
  name: string
  /** Filer 주소 */
  address: string
  /** 노드 상태 */
  status: NodeStatus
  /** 에러 메시지 (DOWN 상태일 경우) */
  errorMessage?: string
  /** 마지막 상태 체크 시간 (ISO 8601) */
  lastChecked: string
}

/** 클러스터 통계 요약 */
export interface ClusterStats {
  /** 전체 Volume 수 */
  totalVolumeCount: number
  /** 전체 파일 수 */
  totalFileCount: number
  /** 전체 사용 용량 (bytes) */
  totalUsedSpace: number
  /** 전체 용량 (bytes) */
  totalCapacity: number
}

/** Cluster 상태 응답 */
export interface ClusterStatus {
  /** 클러스터 Health 상태 */
  health: ClusterHealthStatus
  /** Master 노드 목록 */
  masters: MasterNode[]
  /** Volume Server 노드 목록 */
  volumeServers: VolumeServerNode[]
  /** Filer 노드 목록 */
  filers: FilerNode[]
  /** 클러스터 통계 요약 */
  clusterStats?: ClusterStats
  /** 전체 Volume 수 (하위 호환성) */
  totalVolumes: number
  /** 전체 파일 수 (하위 호환성) */
  totalFiles: number
  /** 전체 사용 용량 (하위 호환성) */
  totalUsedSize: number
  /** 전체 여유 용량 (하위 호환성) */
  totalFreeSize: number
  /** 전체 용량 (하위 호환성) */
  totalCapacity: number
}

// ============================================================
// Volume 관련 타입
// ============================================================

/** Volume 정보 */
export interface VolumeInfo {
  id: number
  size: number
  collection: string
  replication: string
  status: string
  fileCount: number
  usedSize: number
  serverUrl: string
}

/** Volume 생성 요청 */
export interface CreateVolumeRequest {
  count: number
  collection?: string
  replication?: string
  ttl?: string
  dataCenter?: string
}
