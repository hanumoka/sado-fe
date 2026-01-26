# MiniPACS Admin + User 기능 정책

**작성일**: 2025-12-31
**버전**: 1.0
**목적**: sado_fe 프로젝트의 전체 기능 범위, 아키텍처, 일정 정의

---

## 📌 문서 개요

이 문서는 **sado_fe 프로젝트의 핵심 기능 정책**을 정의합니다.
사용자님이 정의한 5가지 주요 기능과 BE 계획을 통합하여, 실현 가능한 FE 구현 계획을 수립합니다.

**핵심 원칙**:
- **Phase 기반 개발**: Week 1-8 (Core PACS), Week 9-16 (Admin 기능)
- **Mock 우선 개발**: BE API 없이도 FE 작업 가능
- **BE-FE 동기화 포인트 명확화**: Week 6-7, 11-12, 14-15
- **완성 목표**: Week 18 (2주 버퍼 포함)

---

## 1. 프로젝트 목적 및 배경

### 1.1 프로젝트 목적

**sado_fe는 MiniPACS의 관리자 + 일반 사용자 통합 웹 페이지입니다.**

- **일반 사용자 (의사/간호사)**: DICOM 업로드, 환자/Study 조회, DICOM 뷰어
- **IT 관리자**: SeaweedFS 파일시스템 관리, 스토리지 모니터링, Hot/Warm/Cold 계층화

**왜 통합 페이지인가?**
- 단일 애플리케이션으로 운영 효율성 극대화
- 역할 기반 접근 제어 (RBAC)로 페르소나 분리
- 일관된 UX/UI

### 1.2 사용자 페르소나

#### Persona A: 일반 사용자 (의사/간호사)

**목표**: DICOM 이미지 조회 및 진단 보조

**주요 작업**:
- DICOM 파일 업로드 (로컬 워크스테이션에서)
- Patient/Study 검색
- DICOM 이미지 뷰어로 렌더링 (Cornerstone3D)
- 멀티프레임 재생 (심초음파 등)

**사용 화면**:
- Dashboard
- Upload Page
- Patient List Page
- Study Detail Page
- DICOM Viewer Page

**권한**: `ROLE_USER`

#### Persona B: IT 관리자

**목표**: MiniPACS 시스템 관리 및 모니터링

**주요 작업**:
- SeaweedFS Volume/Filer 상태 모니터링
- 스토리지 사용량 추적
- Hot/Warm/Cold Tier 정책 관리
- 파일 메타데이터 조회/수정

**사용 화면**:
- Admin Dashboard
- SeaweedFS Management Page
- Storage Monitoring Page
- Tiering Management Page

**권한**: `ROLE_ADMIN`

### 1.3 배경 및 문제 정의

**현황**:
- BE (sado_be/sado-minipacs)는 Week 4-5에 기본 DICOM 업로드/저장 완료
- FE (sado_fe)는 스켈레톤만 존재 (Button 컴포넌트만)
- **DICOMWeb API (WADO-RS, QIDO-RS) 0% 구현** ⚠️
- **관리자 페이지 개념이 BE 계획에 없음** ⚠️

**문제**:
1. FE 뷰어 렌더링 불가능 (WADO-RS 필수)
2. 파일시스템 관리 기능 BE API 없음
3. Hot/Warm/Cold 계층화 로직 미구현

**해결책**:
1. Week 6-7에 DICOMWeb API 긴급 구현 (사용자 승인됨)
2. Week 11-16에 Admin 기능 BE API 추가 (사용자 승인됨)
3. FE는 Mock 데이터로 선행 개발, API 준비 시 전환

---

## 2. Phase별 기능 구분

### Phase 1: Core PACS (Week 1-8) - 일반 사용자

**목표**: Week 8 POC 완성 - 동작하는 DICOM 뷰어

| 기능 | 화면 | BE API | Mock | 우선순위 |
|-----|------|--------|------|---------|
| **1. DICOM 업로드** | UploadPage | `POST /api/instances/upload` | ✅ | P0 |
| **2. Patient 조회** | PatientListPage | `GET /api/patients` | ✅ | P0 |
| **3. Study 조회** | StudyListPage | `GET /qido-rs/studies` | ✅ | P0 |
| **4. Study 상세** | StudyDetailPage | `GET /qido-rs/studies/{uid}` | ✅ | P0 |
| **5. DICOM 뷰어** | DicomViewerPage | `GET /wado-rs/.../instances/{uid}` | ⚠️ | P0 |

**Week 8 POC 완성 기준**:
- ✅ DICOM 파일을 업로드하면 SeaweedFS에 저장
- ✅ Patient List에서 환자 검색 및 클릭
- ✅ Study Detail에서 Series/Instance 확인
- ✅ DICOM Viewer에서 이미지 렌더링 (Cornerstone3D)
- ✅ `docker-compose up`으로 전체 시스템 실행

**Mock 전환 시점**:
- Week 1-5: 100% Mock 데이터
- Week 6-7: Real API 전환 (DICOMWeb 완료 후)
- Week 8: E2E 테스트 및 버그 수정

---

### Phase 2: Admin 기능 (Week 9-16) - IT 관리자

**목표**: Week 16 Admin 기능 완성 - 파일시스템 관리/모니터링/계층화

| 기능 | 화면 | BE API | Mock | 우선순위 |
|-----|------|--------|------|---------|
| **6. SeaweedFS 관리** | SeaweedFSManagePage | `GET /api/admin/seaweedfs/*` | ❌ | P1 |
| **7. 스토리지 모니터링** | StorageMonitoringPage | `GET /api/admin/metrics/storage` | ⚠️ | P1 |
| **8. Tier 관리** | TieringManagePage | `POST /api/admin/files/{id}/tier` | ❌ | P1 |

**Week 16 완성 기준**:
- ✅ SeaweedFS Volume 상태 확인 (디스크 사용량, Replication)
- ✅ 스토리지 사용량 차트 (Tier별 분포, 시간대별 증가 추이)
- ✅ Hot/Warm/Cold Tier 수동 전환
- ✅ Tiering 정책 설정 (자동 전환 규칙)

**BE 의존성**:
- Week 11-12: SeaweedFS Admin API 구현 (BE)
- Week 14-15: Storage Metrics API 구현 (BE)
- Week 14-16: Storage Tier 로직 구현 (BE)

---

## 3. 필수 화면 (8개)

### Phase 1: 일반 사용자 화면 (5개)

#### 3.1 Dashboard (`/`)

**목적**: 전체 시스템 상태 요약

**주요 컴포넌트**:
- 총 환자 수, Study 수, 스토리지 사용량
- 최근 업로드된 DICOM 목록 (5개)
- 시스템 Health 상태 (MySQL, SeaweedFS, BE API)

**Mock 데이터**: `MOCK_DASHBOARD_STATS`

**BE API**: `GET /api/dashboard/stats` (Phase 2에서 구현 가능)

---

#### 3.2 Upload Page (`/upload`)

**목적**: DICOM 파일 업로드

**주요 컴포넌트**:
- `UploadDropzone`: 드래그 앤 드롭 파일 업로드
- `UploadProgress`: 진행률 표시 (파일별)
- `UploadResultList`: 성공/실패 결과 목록

**기능**:
- 단일 파일 업로드 (Phase 1)
- 멀티파일 배치 업로드 (Phase 1, FE에서 순회)
- 폴더 단위 업로드 (Phase 2 또는 제외)

**BE API**: `POST /api/instances/upload` (이미 구현됨)

**Mock 전환**: Week 4-5에 Real API 연동

---

#### 3.3 Patient List Page (`/patients`)

**목적**: 환자 목록 조회 및 검색

**주요 컴포넌트**:
- `PatientTable`: 페이지네이션 테이블
- `PatientSearchForm`: 환자 ID, 이름, 날짜 필터
- `PatientRow`: 환자 클릭 시 Study List로 이동

**테이블 컬럼**:
- Patient ID
- Patient Name
- Age
- Gender
- Studies Count
- Last Study Date

**BE API**: `GET /api/patients?page=0&size=20` (기존) → `GET /qido-rs/studies?PatientName={name}` (Week 6-7)

**Mock 데이터**: `MOCK_PATIENTS`

---

#### 3.4 Study Detail Page (`/studies/:id`)

**목적**: 특정 Study의 Series/Instance 조회

**주요 컴포넌트**:
- `StudyMetadata`: Study 메타데이터 (Modality, Date, Description)
- `SeriesTable`: Series 목록 (Series Number, Modality, Instances Count)
- `InstanceTable`: Instance 목록 (SOP Instance UID, Frame 수)
- `ViewerButton`: DICOM Viewer로 이동

**BE API**: `GET /qido-rs/studies/{studyUID}/series` (Week 6-7)

**Mock 데이터**: `MOCK_STUDIES`, `MOCK_SERIES`, `MOCK_INSTANCES`

---

#### 3.5 DICOM Viewer Page (`/viewer/:seriesId`)

**목적**: DICOM 이미지 렌더링 및 조작

**주요 컴포넌트**:
- `DicomViewer`: Cornerstone3D 캔버스
- `ViewerToolbar`: Pan, Zoom, Window/Level, Cine Play 버튼
- `FrameNavigation`: 프레임 네비게이션 (멀티프레임용)
- `SeriesSelector`: 동일 Study 내 다른 Series 전환

**Cornerstone3D 기능**:
- DICOM 이미지 로드 (WADO-RS URL)
- Window/Level 조정 (WW/WC)
- Zoom, Pan
- Cine Play (멀티프레임)

**BE API**: `GET /wado-rs/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}` (Week 6-7)

**Mock 전환**: Week 7-8 (DICOMWeb 준비 후)

---

### Phase 2: IT 관리자 화면 (3개)

#### 3.6 SeaweedFS Management Page (`/admin/seaweedfs`)

**목적**: SeaweedFS 파일시스템 관리

**주요 컴포넌트**:
- `VolumeStatusCard`: Volume 상태 (디스크 사용량, Replication)
- `FilerBrowser`: Filer 디렉토리 브라우저 (파일 목록, 메타데이터)
- `ClusterHealthIndicator`: Master, Volume, Filer Health 상태

**기능**:
- Volume 디스크 사용량 모니터링
- Filer 디렉토리 목록 조회 (`/minipacs/studies/...`)
- 파일 메타데이터 조회 (TTL, Replication 설정)

**BE API**: `GET /api/admin/seaweedfs/volumes`, `GET /api/admin/seaweedfs/filer/ls` (Week 11-12)

---

#### 3.7 Storage Monitoring Page (`/admin/storage-monitoring`)

**목적**: 스토리지 사용량 모니터링

**주요 컴포넌트**:
- `StorageMetricsCard`: 총 파일 수, 총 크기, Tier별 분포
- `TierDistributionPieChart`: Tier별 파일 분포 (HOT, WARM, COLD)
- `StorageTrendsLineChart`: 시간대별 스토리지 사용량 증가 추이

**차트 라이브러리**: Recharts

**BE API**: `GET /api/admin/metrics/storage`, `GET /api/admin/metrics/storage/trends` (Week 14-15)

---

#### 3.8 Tiering Management Page (`/admin/tiering`)

**목적**: Hot/Warm/Cold 계층화 관리

**주요 컴포넌트**:
- `TieringPolicyForm`: 자동 전환 규칙 설정 (HOT→WARM 30일, WARM→COLD 1년)
- `FileListWithTier`: Tier별 파일 목록 테이블
- `ChangeTierButton`: 수동 Tier 변경

**기능**:
- Tier 수동 변경 (HOT ↔ WARM ↔ COLD)
- Tiering 정책 조회/수정
- Tier별 파일 필터링

**BE API**: `POST /api/admin/files/{id}/tier`, `GET /api/admin/tiering/policy` (Week 14-16)

---

## 4. Navigation 구조

### 4.1 Router 구조

```typescript
// app/Router.tsx
<Routes>
  <Route path="/" element={<Layout />}>
    {/* 일반 사용자 */}
    <Route index element={<Dashboard />} />
    <Route path="upload" element={<UploadPage />} />
    <Route path="patients" element={<PatientListPage />} />
    <Route path="studies/:id" element={<StudyDetailPage />} />
    <Route path="viewer/:seriesId" element={<DicomViewerPage />} />

    {/* IT 관리자 */}
    <Route path="admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="seaweedfs" element={<SeaweedFSManagePage />} />
      <Route path="storage-monitoring" element={<StorageMonitoringPage />} />
      <Route path="tiering" element={<TieringManagePage />} />
    </Route>
  </Route>
</Routes>
```

### 4.2 Sidebar 메뉴

**일반 사용자 메뉴**:
- Dashboard
- Upload DICOM
- Patients
- Studies

**IT 관리자 메뉴** (권한 필요):
- Admin Dashboard
- SeaweedFS Management
- Storage Monitoring
- Tiering Management

---

## 5. BE-FE 동기화 포인트

### 5.1 Critical 동기화 (Week 6-7) ⚠️

**목적**: DICOMWeb API 준비 (FE 뷰어 전제 조건)

| Week | BE 작업 | FE 작업 | 차단 여부 |
|------|---------|---------|---------|
| **Week 6** | WADO-RS 구현 (1일) | Mock → Real API 전환 준비 | ✅ Blocking |
| **Week 7** | QIDO-RS 구현 (2일) | DICOM Viewer 통합 | ✅ Blocking |

**BE API**:
```
GET /wado-rs/studies/{studyUID}/series/{seriesUID}/instances/{instanceUID}
GET /qido-rs/studies?PatientName={name}
GET /qido-rs/studies/{studyUID}/series
```

**FE 전환**:
```typescript
// Before (Mock)
const { data: instances } = useQuery({
  queryKey: ['instances', seriesId],
  queryFn: async () => MOCK_INSTANCES
});

// After (Real API)
const { data: instances } = useQuery({
  queryKey: ['instances', seriesId],
  queryFn: async () => api.get(`/qido-rs/studies/${studyUID}/series/${seriesUID}/instances`)
});
```

---

### 5.2 Admin 동기화 1 (Week 11-12)

**목적**: SeaweedFS Admin API 준비

| Week | BE 작업 | FE 작업 | 차단 여부 |
|------|---------|---------|---------|
| **Week 11-12** | SeaweedFS Admin API (2-3주) | Admin 라우팅 준비, Mock UI | ⚠️ 부분 차단 |

**BE API**:
```
GET /api/admin/seaweedfs/volumes
GET /api/admin/seaweedfs/filer/ls?path=/minipacs
GET /api/admin/seaweedfs/cluster/status
```

**FE 작업** (BE 준비 전):
- Admin Layout 구현
- Volume Status Card UI (Mock 데이터)
- Filer Browser UI (Mock 디렉토리)

---

### 5.3 Admin 동기화 2 (Week 14-15)

**목적**: Storage Metrics + Tier 로직 준비

| Week | BE 작업 | FE 작업 | 차단 여부 |
|------|---------|---------|---------|
| **Week 14-15** | Metrics API + Tier Scheduler (3-4주) | 모니터링/Tier UI | ⚠️ 부분 차단 |

**BE API**:
```
GET /api/admin/metrics/storage
GET /api/admin/metrics/storage/trends?period=7d
POST /api/admin/files/{id}/tier
```

**FE 작업** (BE 준비 전):
- Recharts 차트 컴포넌트 (Mock 데이터)
- Tier 정책 폼 UI

---

## 6. Mock 데이터 구조

### 6.1 MOCK_PATIENTS

```typescript
// lib/mockData.ts
export const MOCK_PATIENTS = [
  {
    id: 'PAT-001',
    dicomPatientId: 'patient001',
    name: 'John Doe',
    age: 45,
    gender: 'M',
    issuer: 'HOSPITAL_A',
    studiesCount: 3,
    lastStudyDate: '2025-12-25',
  },
  {
    id: 'PAT-002',
    dicomPatientId: 'patient002',
    name: 'Jane Smith',
    age: 32,
    gender: 'F',
    issuer: 'HOSPITAL_A',
    studiesCount: 1,
    lastStudyDate: '2025-12-30',
  },
  // ... 총 10개 샘플
];
```

### 6.2 MOCK_STUDIES

```typescript
export const MOCK_STUDIES = [
  {
    id: 'STD-001',
    studyInstanceUid: '1.2.840.113619.2.55.3.4',
    patientId: 'PAT-001',
    studyDate: '2025-12-25',
    modality: 'US',
    description: 'Cardiac Ultrasound',
    seriesCount: 2,
  },
  // ... 샘플
];
```

### 6.3 MOCK_SERIES

```typescript
export const MOCK_SERIES = [
  {
    id: 'SER-001',
    seriesInstanceUid: '1.2.840.113619.2.55.3.5',
    studyId: 'STD-001',
    seriesNumber: 1,
    modality: 'US',
    instancesCount: 120,
  },
  // ... 샘플
];
```

### 6.4 MOCK_INSTANCES

```typescript
export const MOCK_INSTANCES = [
  {
    id: 'INS-001',
    sopInstanceUid: '1.2.840.113619.2.55.3.6',
    seriesId: 'SER-001',
    studyUID: '1.2.840.113619.2.55.3.4',
    seriesUID: '1.2.840.113619.2.55.3.5',
    wadoUrl: 'http://localhost:10201/wado-rs/studies/1.2.840.113619.2.55.3.4/series/1.2.840.113619.2.55.3.5/instances/1.2.840.113619.2.55.3.6',
    frameNumber: 1,
  },
  // ... 샘플 (120개 프레임)
];
```

### 6.5 MOCK_STORAGE_METRICS

```typescript
export const MOCK_STORAGE_METRICS = {
  totalFiles: 12345,
  totalSize: '123GB',
  tierDistribution: {
    HOT: 5000,
    WARM: 5000,
    COLD: 2345,
  },
  trends: [
    { date: '2025-12-24', size: 100 },
    { date: '2025-12-25', size: 105 },
    { date: '2025-12-26', size: 110 },
    // ... 7일치 데이터
  ],
};
```

---

## 7. 아키텍처 결정

### 7.1 라우팅

**선택**: React Router v6

**이유**:
- React 생태계 표준
- Nested Routes 지원 (Admin Layout 분리)
- URL 기반 상태 관리

**설치**:
```bash
npm install react-router-dom
npm install -D @types/react-router-dom
```

---

### 7.2 상태 관리

**선택**: Zustand (Client State) + TanStack Query (Server State)

**이유**:
- Zustand: 간단한 전역 상태 (auth, UI)
- TanStack Query: 서버 상태 캐싱, 자동 Refetch

**설치**:
```bash
npm install zustand @tanstack/react-query
```

**예시**:
```typescript
// stores/authStore.ts
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}));
```

```typescript
// features/patient/hooks/usePatients.ts
import { useQuery } from '@tanstack/react-query';

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      // Phase 1: Mock
      return MOCK_PATIENTS;

      // Phase 2: Real API
      // return api.get('/api/patients');
    },
    staleTime: 1000 * 60 * 5, // 5분 캐싱
  });
}
```

---

### 7.3 컴포넌트 구조

**선택**: Feature-based Structure

**이유**:
- 도메인별 응집력 향상
- 확장 용이

**디렉토리 구조**:
```
src/
├── app/
│   ├── Router.tsx
│   └── pages/
│       ├── Dashboard.tsx
│       ├── UploadPage.tsx
│       ├── PatientListPage.tsx
│       └── admin/
│           ├── AdminDashboard.tsx
│           ├── SeaweedFSManagePage.tsx
│           └── ...
├── features/
│   ├── patient/
│   │   ├── components/
│   │   │   ├── PatientList.tsx
│   │   │   ├── PatientSearchForm.tsx
│   │   │   └── PatientRow.tsx
│   │   ├── hooks/
│   │   │   └── usePatients.ts
│   │   └── types/
│   │       └── patient.ts
│   ├── study/
│   ├── upload/
│   ├── dicom-viewer/
│   └── admin/
│       ├── seaweedfs/
│       ├── monitoring/
│       └── tiering/
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── AdminLayout.tsx
│   └── ui/
│       ├── Button.tsx (shadcn/ui)
│       ├── Table.tsx
│       └── ...
├── stores/
│   ├── authStore.ts
│   └── uiStore.ts
└── lib/
    ├── api.ts
    ├── queryClient.ts
    └── mockData.ts
```

---

### 7.4 API 클라이언트

**선택**: Fetch Wrapper with Auth

**이유**:
- 간단한 설정
- Authorization 헤더 자동 추가

**예시**:
```typescript
// lib/api.ts
import { useAuthStore } from '@/stores/authStore';

export const api = {
  get: async (url: string) => {
    const token = useAuthStore.getState().token;

    const response = await fetch(`http://localhost:10200${url}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  },

  post: async (url: string, data: any) => {
    const token = useAuthStore.getState().token;

    const response = await fetch(`http://localhost:10200${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  },
};
```

---

### 7.5 스타일링

**선택**: Tailwind CSS + shadcn/ui

**이유**:
- 이미 설정 완료
- 유틸리티 우선 CSS
- shadcn/ui로 재사용 가능한 컴포넌트

**설치**: 이미 완료

---

### 7.6 DICOM 뷰어

**선택**: Cornerstone3D

**이유**:
- DICOM 표준 지원
- WADO-RS 통합
- 멀티프레임 지원

**설치**:
```bash
npm install @cornerstonejs/core @cornerstonejs/tools
```

**예시**:
```typescript
// features/dicom-viewer/hooks/useCornerstone.ts
import * as cornerstone from '@cornerstonejs/core';

export function useCornerstone(seriesId: string) {
  const { data: instances } = useInstances(seriesId);

  useEffect(() => {
    if (!instances?.length) return;

    // WADO-RS URL 생성
    const imageIds = instances.map(inst => inst.wadoUrl);

    // Cornerstone 초기화
    cornerstone.init();

    // 이미지 로드
    cornerstone.loadImage(imageIds[0]).then(image => {
      cornerstone.displayImage(canvasRef.current, image);
    });

    return () => {
      cornerstone.disable(canvasRef.current);
    };
  }, [instances]);
}
```

---

## 8. 일정 및 완성 기준

### 8.1 전체 일정

| Phase | Week | 목표 | 완성도 |
|-------|------|------|--------|
| **Phase 1 (Core PACS)** | Week 1-8 | Week 8 POC 완성 | 100% User 기능 |
| **Phase 2 (Admin)** | Week 9-16 | Week 16 Admin 완성 | 100% Admin 기능 |
| **버퍼** | Week 17-18 | 통합 테스트, 버그 수정 | - |

### 8.2 Week 8 POC 완성 기준

**Success Criteria**:
- ✅ DICOM 파일 업로드 → SeaweedFS 저장 → DB 메타데이터 저장
- ✅ Patient List에서 검색 및 클릭 → Study Detail 이동
- ✅ Study Detail에서 Series 확인 → DICOM Viewer 이동
- ✅ DICOM Viewer에서 이미지 렌더링 (Cornerstone3D + WADO-RS)
- ✅ `docker-compose up`으로 전체 시스템 실행 (BE + FE + MySQL + SeaweedFS)

**제외 기능** (Week 9+ 이후):
- Admin 기능 (파일시스템 관리, 모니터링, 계층화)
- 권한 관리 (Keycloak은 Week 12+)
- 폴더 단위 업로드 (선택)

### 8.3 Week 16 완성 기준

**Success Criteria**:
- ✅ SeaweedFS Volume 상태 모니터링
- ✅ 스토리지 사용량 차트 (Tier별 분포)
- ✅ Hot/Warm/Cold Tier 수동 전환
- ✅ Tiering 정책 설정
- ✅ RBAC 권한 분리 (User vs Admin)

### 8.4 Week 18 최종 완성 기준

**Success Criteria**:
- ✅ 모든 기능 통합 테스트 완료
- ✅ 주요 버그 수정
- ✅ 프로덕션 배포 가능 상태
- ✅ 사용자 매뉴얼 작성 (선택)

---

## 9. 리스크 및 완화 전략

### 9.1 DICOMWeb API 미구현 (Critical) ⚠️

**리스크**: Week 6-7에 DICOMWeb API가 완성되지 않으면 Week 8 POC 실패

**완화 전략**:
- BE 팀에 P0 우선순위 전달 (사용자 승인됨)
- FE는 Mock 데이터로 UI 선행 개발
- WADO-RS Stub API 사용 (임시 JSON 응답)

### 9.2 BE-FE 동기화 지연

**리스크**: Week 11-12, 14-15에 BE API 지연 시 FE Admin 기능 차단

**완화 전략**:
- Admin UI를 Mock 데이터로 선행 개발
- BE API Spec 사전 합의 (OpenAPI 문서)
- 주간 BE-FE 동기화 미팅

### 9.3 일정 초과

**리스크**: Week 16 완성 불가능 (Week 18-20 예상)

**완화 전략**:
- Week 17-18 버퍼 기간 확보
- Phase 2 기능 우선순위 재조정 (필수 vs 선택)
- MVP 범위 재정의 (Week 8 POC 최우선)

---

## 10. 다음 단계

### 10.1 즉시 작업 (Week 1-2)

1. ✅ FE 기능 정책 문서 작성 완료 (이 문서)
2. **다음**: FE 구현 가이드 작성
   - `01_프로젝트_초기_설정_가이드.md`
   - `02_Layout_구현_가이드.md`
3. **다음**: FE CURRENT_CONTEXT.md 업데이트

### 10.2 사용자 작업 (Week 1-2)

1. **프로젝트 초기 설정** (가이드 참조)
   - 패키지 설치
   - Router, Zustand, TanStack Query 설정
   - Mock 데이터 생성
2. **Layout 구현** (가이드 참조)
   - Header, Sidebar, MainContent
   - Navigation 링크

### 10.3 BE 팀 전달 사항 (긴급)

**다른 Claude (BE 담당)**에게 전달:
1. **Week 6-7 DICOMWeb API 긴급 구현 요청 (P0)**
   - WADO-RS: 1일
   - QIDO-RS: 2일
2. **Week 11-12 SeaweedFS Admin API 추가 요청**
3. **Week 14-16 Storage Tier 로직 추가 요청**
4. **BE 문서 업데이트**
   - PROGRESS.md
   - CURRENT_CONTEXT.md
   - 신규: `13-5_DICOMWeb_API_설계.md`

---

## 11. 참조 문서

| 문서 | 경로 | 목적 |
|------|------|------|
| **플랜 파일** | `C:\Users\amagr\.claude\plans\snuggly-prancing-prism.md` | 전체 구현 계획 |
| **BE 최종 구현 계획** | `sado_docs/be/core/07_최종_구현_계획.md` | BE Week 1-16 계획 |
| **BE PROGRESS** | `sado_docs/be/tracking/PROGRESS.md` | BE 진행 상황 |
| **FE CURRENT_CONTEXT** | `sado_docs/fe/tracking/CURRENT_CONTEXT.md` | FE 현재 상태 |
| **PORT_MAPPING** | `sado_docs/PORT_MAPPING.md` | 포트 매핑 정보 |

---

**작성 완료**: 2025-12-31
**다음 단계**: FE 구현 가이드 작성 (Week 1-2 우선)
