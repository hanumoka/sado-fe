# Week 2-3: Patient List 구현 가이드

> **작성일**: 2025-12-31
> **목표**: 환자 목록 조회 및 검색 기능 구현
> **소요 시간**: 2-3일
> **BE 의존성**: 없음 (Mock 데이터 사용)

---

## 📋 목차

1. [개요](#개요)
2. [완성 목표](#완성-목표)
3. [구현할 컴포넌트](#구현할-컴포넌트)
4. [타입 정의](#타입-정의)
5. [Custom Hook 구현](#custom-hook-구현)
6. [컴포넌트 구현](#컴포넌트-구현)
7. [페이지 통합](#페이지-통합)
8. [라우터 연결](#라우터-연결)
9. [테스트](#테스트)
10. [다음 단계](#다음-단계)

---

## 개요

### 목적

환자 목록을 조회하고 검색할 수 있는 UI를 구현합니다. 이 기능은 PACS의 가장 기본적인 기능으로, 의사나 간호사가 환자를 찾아 해당 환자의 DICOM Study를 조회하는 시작점입니다.

### 왜 이 기능이 필요한가?

PACS 시스템에서 의료진은:
1. **환자 검색**: 이름, ID, 성별 등으로 환자를 빠르게 찾아야 합니다
2. **환자 정보 확인**: 환자의 기본 정보와 Study 개수를 확인합니다
3. **Study 조회**: 환자를 클릭하여 해당 환자의 DICOM Study 목록으로 이동합니다

### Week 2-3에서 구현할 내용

- ✅ 환자 목록 테이블 (PatientList)
- ✅ 검색 폼 (PatientSearchForm)
- ✅ TanStack Query Hook (usePatients)
- ✅ 페이지 통합 (PatientListPage)
- ✅ 라우터 연결

---

## 완성 목표

### UI 구성

```
┌─────────────────────────────────────────────────────────┐
│ 환자 목록                                                │
├─────────────────────────────────────────────────────────┤
│ [이름 검색] [성별 ▼] [초기화] [검색]                      │
├─────────────────────────────────────────────────────────┤
│ ID       │ 이름          │ 나이 │ 성별 │ Study 수 │ 최근 │
│──────────┼───────────────┼──────┼──────┼──────────┼──────│
│ PAT-001  │ John Doe      │ 45   │ M    │ 3        │ 12/25│
│ PAT-002  │ Jane Smith    │ 32   │ F    │ 2        │ 12/20│
│ PAT-003  │ Mike Johnson  │ 58   │ M    │ 5        │ 12/15│
│ ...      │ ...           │ ...  │ ...  │ ...      │ ...  │
└─────────────────────────────────────────────────────────┘
```

### 기능 요구사항

1. **목록 표시**: mockData에서 환자 목록을 가져와 테이블로 표시
2. **검색**: 이름, 성별로 필터링
3. **클릭 이벤트**: 환자 클릭 시 Study List 페이지로 이동 (Week 3-4 구현)
4. **로딩 상태**: TanStack Query로 로딩 표시
5. **에러 처리**: 에러 발생 시 메시지 표시

---

## 구현할 컴포넌트

### 폴더 구조

```
src/features/patient/
├── components/
│   ├── PatientList.tsx           # 환자 목록 테이블
│   └── PatientSearchForm.tsx     # 검색 폼
├── hooks/
│   └── usePatients.ts            # TanStack Query Hook
└── types/
    └── patient.ts                # Patient 타입 정의

src/app/pages/
└── PatientListPage.tsx           # 페이지 통합
```

---

## 타입 정의

### 1. Patient 타입

**파일**: `src/features/patient/types/patient.ts`

```typescript
/**
 * patient.ts
 *
 * Patient 관련 타입 정의
 */

export interface Patient {
  id: string;                 // 내부 ID (PAT-001)
  dicomPatientId: string;     // DICOM Patient ID
  name: string;               // 환자 이름
  age: number;                // 나이
  gender: 'M' | 'F';          // 성별
  issuer: string;             // 발급 기관
  studiesCount: number;       // Study 개수
  lastStudyDate: string;      // 최근 Study 날짜 (YYYY-MM-DD)
}

export interface PatientSearchParams {
  name?: string;              // 이름 검색
  gender?: 'M' | 'F' | 'ALL'; // 성별 필터
}
```

**설명**:
- `Patient`: mockData.ts의 Patient 인터페이스와 동일
- `PatientSearchParams`: 검색 파라미터 (선택적)

---

## Custom Hook 구현

### 1. usePatients Hook

**파일**: `src/features/patient/hooks/usePatients.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { MOCK_PATIENTS, Patient } from '@/lib/mockData';
import { PatientSearchParams } from '../types/patient';

/**
 * usePatients.ts
 *
 * TanStack Query를 사용한 환자 목록 조회 Hook
 *
 * Week 1-5: Mock 데이터 사용
 * Week 6+: Real API로 전환 (api.get('/api/patients'))
 */

/**
 * 환자 목록 조회 함수
 *
 * 현재: Mock 데이터 필터링
 * 향후: api.get<Patient[]>('/api/patients', { params: searchParams })
 */
const fetchPatients = async (
  searchParams?: PatientSearchParams
): Promise<Patient[]> => {
  // Mock 데이터 필터링
  let patients = [...MOCK_PATIENTS];

  // 이름 필터링
  if (searchParams?.name) {
    const searchName = searchParams.name.toLowerCase();
    patients = patients.filter((p) =>
      p.name.toLowerCase().includes(searchName)
    );
  }

  // 성별 필터링
  if (searchParams?.gender && searchParams.gender !== 'ALL') {
    patients = patients.filter((p) => p.gender === searchParams.gender);
  }

  // API 지연 시뮬레이션 (500ms)
  await new Promise((resolve) => setTimeout(resolve, 500));

  return patients;
};

/**
 * usePatients Hook
 *
 * @param searchParams - 검색 파라미터 (선택적)
 * @returns TanStack Query 결과 (data, isLoading, error, refetch)
 */
export function usePatients(searchParams?: PatientSearchParams) {
  return useQuery({
    queryKey: ['patients', searchParams], // searchParams 변경 시 자동 refetch
    queryFn: () => fetchPatients(searchParams),
    staleTime: 1000 * 60 * 5, // 5분 (queryClient 기본값)
  });
}
```

**설명**:
- `fetchPatients`: Mock 데이터를 필터링하여 반환 (Week 6+에는 api.get으로 대체)
- `useQuery`: TanStack Query Hook
  - `queryKey`: 캐시 키 (searchParams 변경 시 자동 refetch)
  - `queryFn`: 데이터 fetch 함수
  - `staleTime`: 5분간 캐시 유지

**사용 예시**:
```typescript
const { data, isLoading, error, refetch } = usePatients({ name: 'John', gender: 'M' });
```

---

## 컴포넌트 구현

### 1. PatientSearchForm 컴포넌트

**파일**: `src/features/patient/components/PatientSearchForm.tsx`

```typescript
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientSearchParams } from '../types/patient';

/**
 * PatientSearchForm.tsx
 *
 * 환자 검색 폼
 *
 * 기능:
 * 1. 이름 검색 (입력)
 * 2. 성별 필터 (드롭다운)
 * 3. 검색 버튼
 * 4. 초기화 버튼
 */

interface PatientSearchFormProps {
  onSearch: (params: PatientSearchParams) => void;
}

export default function PatientSearchForm({
  onSearch,
}: PatientSearchFormProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'ALL'>('ALL');

  const handleSearch = () => {
    onSearch({
      name: name || undefined,
      gender: gender === 'ALL' ? undefined : gender,
    });
  };

  const handleReset = () => {
    setName('');
    setGender('ALL');
    onSearch({});
  };

  // Enter 키 이벤트
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex flex-wrap items-end gap-4">
        {/* 이름 검색 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            환자 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="이름을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 성별 필터 */}
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            성별
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'ALL')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체</option>
            <option value="M">남성</option>
            <option value="F">여성</option>
          </select>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex gap-2">
          {/* 초기화 버튼 */}
          <Button variant="outline" onClick={handleReset}>
            <X className="h-4 w-4 mr-2" />
            초기화
          </Button>

          {/* 검색 버튼 */}
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            검색
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**설명**:
- `useState`: 이름, 성별 상태 관리
- `onSearch`: 부모 컴포넌트로 검색 파라미터 전달
- `handleKeyPress`: Enter 키로 검색
- Tailwind CSS: 반응형 레이아웃 (flex-wrap)

---

### 2. PatientList 컴포넌트

**파일**: `src/features/patient/components/PatientList.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { Patient } from '@/lib/mockData';

/**
 * PatientList.tsx
 *
 * 환자 목록 테이블
 *
 * 기능:
 * 1. 환자 목록 표시 (테이블)
 * 2. 클릭 시 Study List로 이동 (Week 3-4 구현)
 * 3. 빈 상태 처리
 */

interface PatientListProps {
  patients: Patient[];
}

export default function PatientList({ patients }: PatientListProps) {
  const navigate = useNavigate();

  const handleRowClick = (patientId: string) => {
    // Week 3-4에서 구현 예정
    navigate(`/studies?patientId=${patientId}`);
  };

  // 빈 상태
  if (patients.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 text-lg">검색 결과가 없습니다</p>
        <p className="text-gray-400 text-sm mt-2">
          다른 검색 조건으로 시도해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* 테이블 헤더 */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                나이
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                성별
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                발급 기관
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Study 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                최근 Study
              </th>
            </tr>
          </thead>

          {/* 테이블 바디 */}
          <tbody className="bg-white divide-y divide-gray-200">
            {patients.map((patient) => (
              <tr
                key={patient.id}
                onClick={() => handleRowClick(patient.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {patient.dicomPatientId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {patient.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.age}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.gender === 'M' ? '남성' : '여성'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.issuer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.studiesCount}개
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {patient.lastStudyDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 결과 수 표시 */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-sm text-gray-700">
          총 <span className="font-medium">{patients.length}</span>명의 환자
        </p>
      </div>
    </div>
  );
}
```

**설명**:
- `useNavigate`: React Router 네비게이션
- `handleRowClick`: 환자 클릭 시 Study List로 이동
- 빈 상태 처리: 검색 결과가 없을 때 메시지 표시
- `hover:bg-gray-50`: 마우스 오버 시 배경색 변경
- `cursor-pointer`: 클릭 가능 표시

---

## 페이지 통합

### PatientListPage

**파일**: `src/app/pages/PatientListPage.tsx`

```typescript
import { useState } from 'react';
import { Users } from 'lucide-react';
import PatientSearchForm from '@/features/patient/components/PatientSearchForm';
import PatientList from '@/features/patient/components/PatientList';
import { usePatients } from '@/features/patient/hooks/usePatients';
import { PatientSearchParams } from '@/features/patient/types/patient';

/**
 * PatientListPage.tsx
 *
 * 환자 목록 페이지
 *
 * 통합:
 * 1. PatientSearchForm (검색 폼)
 * 2. PatientList (목록 테이블)
 * 3. usePatients Hook (데이터 조회)
 */
export default function PatientListPage() {
  const [searchParams, setSearchParams] = useState<PatientSearchParams>({});

  // TanStack Query Hook
  const { data: patients, isLoading, error } = usePatients(searchParams);

  const handleSearch = (params: PatientSearchParams) => {
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">환자 목록</h1>
          <p className="mt-1 text-sm text-gray-600">
            환자를 검색하고 Study를 조회하세요
          </p>
        </div>
      </div>

      {/* 검색 폼 */}
      <PatientSearchForm onSearch={handleSearch} />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">환자 목록을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            오류가 발생했습니다: {(error as Error).message}
          </p>
        </div>
      )}

      {/* 환자 목록 */}
      {!isLoading && !error && patients && (
        <PatientList patients={patients} />
      )}
    </div>
  );
}
```

**설명**:
- `useState`: 검색 파라미터 상태 관리
- `usePatients`: TanStack Query Hook (searchParams 변경 시 자동 refetch)
- 로딩/에러/데이터 상태 분리
- `animate-spin`: Tailwind CSS 로딩 애니메이션

---

## 라우터 연결

### Router.tsx 업데이트

**파일**: `src/app/Router.tsx`

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/app/pages/Dashboard';
import PatientListPage from '@/app/pages/PatientListPage'; // 추가

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />

          {/* Week 2-3: Patient List */}
          <Route path="patients" element={<PatientListPage />} />

          {/* Week 3-4에 추가 예정 */}
          {/* <Route path="studies" element={<StudyListPage />} /> */}
          {/* <Route path="studies/:studyId" element={<StudyDetailPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 테스트

### 1. 폴더 및 파일 생성 확인

```bash
# 폴더 생성
mkdir -p src/features/patient/components
mkdir -p src/features/patient/hooks
mkdir -p src/features/patient/types

# 파일 존재 확인
ls src/features/patient/types/patient.ts
ls src/features/patient/hooks/usePatients.ts
ls src/features/patient/components/PatientSearchForm.tsx
ls src/features/patient/components/PatientList.tsx
ls src/app/pages/PatientListPage.tsx
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 브라우저 테스트

1. **페이지 접속**: http://localhost:10300/patients
2. **검색 테스트**:
   - 이름 입력: "John" → 검색 → John Doe 표시 확인
   - 성별 필터: "남성" → 검색 → 남성 환자만 표시 확인
   - 초기화 버튼 → 전체 목록 표시 확인
3. **클릭 테스트**: 환자 클릭 → `/studies?patientId=PAT-001`로 이동 확인
4. **로딩 테스트**: 검색 버튼 클릭 → 0.5초 로딩 애니메이션 확인
5. **빈 상태 테스트**: 존재하지 않는 이름 검색 → "검색 결과가 없습니다" 메시지 확인

### 4. Console 확인

개발자 도구 Console에서 확인:
```javascript
// TanStack Query DevTools 설치 (선택)
npm install @tanstack/react-query-devtools

// main.tsx에 추가
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// QueryClientProvider 내부에 추가
<ReactQueryDevtools initialIsOpen={false} />
```

---

## 다음 단계

### Week 3-4: Study List 구현

Week 2-3 완료 후 다음 단계:

1. **Study List 가이드 작성** (`04_Study_List_가이드.md`)
2. **StudyList 컴포넌트** (Study 목록 테이블)
3. **StudyFilter 컴포넌트** (날짜, Modality 필터)
4. **useStudies Hook** (TanStack Query + Mock)
5. **StudyListPage** (페이지 통합)

### 학습 포인트

이번 Week에서 배운 것:
- ✅ TanStack Query 기본 사용법 (useQuery)
- ✅ queryKey로 자동 캐싱 및 refetch
- ✅ 로딩/에러 상태 처리
- ✅ Mock 데이터 필터링
- ✅ 컴포넌트 분리 (Presentation/Container)
- ✅ React Router 네비게이션

---

## 참고 자료

- [TanStack Query 공식 문서](https://tanstack.com/query/latest)
- [React Router 공식 문서](https://reactrouter.com/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)

---

**작성**: 2025-12-31
**다음 가이드**: `04_Study_List_가이드.md`
