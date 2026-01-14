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
export type ClusterHealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN'

/** Master 노드 정보 */
export interface MasterNode {
  address: string
  isLeader: boolean
  status: string
}

/** Volume Server 노드 정보 */
export interface VolumeServerNode {
  address: string
  volumeCount: number
  usedDiskSize: number
  freeDiskSize: number
  status: string
}

/** Filer 노드 정보 */
export interface FilerNode {
  address: string
  status: string
}

/** Cluster 상태 응답 */
export interface ClusterStatus {
  health: ClusterHealthStatus
  masters: MasterNode[]
  volumeServers: VolumeServerNode[]
  filers: FilerNode[]
  totalVolumes: number
  totalFiles: number
  totalUsedSize: number
  totalFreeSize: number
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
