# Week 3-4: Study List 구현 가이드

> **목표**: Study 목록 조회 및 검색 기능 구현

---

## 📋 목차

1. [개요](#1-개요)
2. [목표](#2-목표)
3. [Study 타입 정의](#3-study-타입-정의)
4. [useStudies Hook 작성](#4-usestudies-hook-작성)
5. [StudySearchForm 컴포넌트](#5-studysearchform-컴포넌트)
6. [StudyList 컴포넌트](#6-studylist-컴포넌트)
7. [StudyListPage 통합](#7-studylistpage-통합)
8. [Router 업데이트](#8-router-업데이트)
9. [테스트](#9-테스트)
10. [다음 단계](#10-다음-단계)

---

## 1. 개요

**Study List**는 DICOM 검사 기록을 조회하고 검색하는 기능입니다.

**주요 특징**:
- 환자별 Study 필터링 (URL 쿼리 파라미터 지원)
- 환자 이름, 검사 날짜, Modality로 검색
- Study 상세 페이지로 이동
- TanStack Query 기반 자동 캐싱

**Patient List와의 연동**:
- Patient List에서 환자 클릭 → `/studies?patientId=PAT-001`
- Study List에서 자동으로 해당 환자의 Study만 필터링

---

## 2. 목표

### 완료 기준

- ✅ Study 타입 정의 (`src/features/study/types/study.ts`)
- ✅ useStudies Hook 작성 (TanStack Query)
- ✅ StudySearchForm 컴포넌트 (환자 이름, 날짜, Modality 필터)
- ✅ StudyList 컴포넌트 (테이블 표시, 행 클릭)
- ✅ StudyListPage 통합 (검색 + 목록)
- ✅ Router에 `/studies` 경로 추가
- ✅ 브라우저 테스트 (http://localhost:10302/studies)

### 예상 소요 시간

- 타입 정의: 5분
- Hook 작성: 15분
- 검색 폼: 20분
- 테이블 컴포넌트: 20분
- 페이지 통합: 10분
- Router 업데이트: 5분
- 테스트: 15분
- **총**: 1.5시간

---

## 3. Study 타입 정의

### 파일 생성

**경로**: `src/features/study/types/study.ts`

```typescript
/**
 * study.ts
 *
 * Study 관련 타입 정의
 *
 * 목적:
 * - Study 데이터 구조 정의
 * - 검색 파라미터 타입 정의
 */

/**
 * Study 인터페이스
 *
 * mockData.ts의 MOCK_STUDIES와 동일한 구조
 */
export interface Study {
  id: string;                    // 내부 ID (STU-001)
  studyInstanceUid: string;      // DICOM Study Instance UID
  patientId: string;             // 환자 ID (PAT-001)
  patientName: string;           // 환자 이름
  studyDate: string;             // 검사 날짜 (YYYY-MM-DD)
  studyTime: string;             // 검사 시간 (HH:mm:ss)
  modality: string;              // Modality (CT, MR, XR, US, etc.)
  studyDescription: string;      // Study 설명
  seriesCount: number;           // Series 개수
  instancesCount: number;        // Instance 개수
}

/**
 * Study 검색 파라미터
 *
 * 모든 필드가 선택적(optional)
 */
export interface StudySearchParams {
  patientId?: string;            // 환자 ID로 필터링
  patientName?: string;          // 환자 이름 검색
  studyDate?: string;            // 검사 날짜 (YYYY-MM-DD)
  modality?: string;             // Modality 필터 (CT, MR, XR, US, ALL)
}
```

### 핵심 포인트

1. **Study 인터페이스**: mockData.ts의 구조와 일치
2. **StudySearchParams**: URL 쿼리 파라미터와 검색 폼에서 사용
3. **선택적 필드**: 모든 검색 조건은 optional (빈 검색도 가능)

---

## 4. useStudies Hook 작성

### 파일 생성

**경로**: `src/features/study/hooks/useStudies.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { MOCK_STUDIES } from '@/lib/mockData';
import type { Study, StudySearchParams } from '../types/study';

/**
 * useStudies.ts
 *
 * TanStack Query를 사용한 Study 목록 조회 Hook
 *
 * 목적:
 * - Study 데이터 fetching 로직 재사용
 * - 자동 캐싱 및 refetch
 * - 로딩/에러 상태 관리
 *
 * 현재: Mock 데이터 사용
 * Week 6+: Real API로 전환 예정
 */

/**
 * Study 목록 조회 함수
 *
 * @param searchParams - 검색 파라미터 (선택적)
 * @returns Promise<Study[]>
 *
 * Week 1-5: Mock 데이터 필터링
 * Week 6+: api.get<Study[]>('/qido-rs/studies', { params: searchParams })
 */
const fetchStudies = async (
  searchParams?: StudySearchParams
): Promise<Study[]> => {
  // Mock 데이터 복사 (원본 훼손 방지)
  let studies = [...MOCK_STUDIES];

  // 환자 ID 필터링
  if (searchParams?.patientId) {
    studies = studies.filter((s) => s.patientId === searchParams.patientId);
  }

  // 환자 이름 필터링
  if (searchParams?.patientName) {
    const searchName = searchParams.patientName.toLowerCase();
    studies = studies.filter((s) =>
      s.patientName.toLowerCase().includes(searchName)
    );
  }

  // 검사 날짜 필터링
  if (searchParams?.studyDate) {
    studies = studies.filter((s) => s.studyDate === searchParams.studyDate);
  }

  // Modality 필터링
  if (searchParams?.modality && searchParams.modality !== 'ALL') {
    studies = studies.filter((s) => s.modality === searchParams.modality);
  }

  // API 지연 시뮬레이션 (500ms)
  // 실제 네트워크 환경을 시뮬레이션하여 로딩 상태 테스트
  await new Promise((resolve) => setTimeout(resolve, 500));

  return studies;
};

/**
 * useStudies Hook
 *
 * @param searchParams - 검색 파라미터 (선택적)
 * @returns TanStack Query 결과
 *   - data: Study[] (Study 목록)
 *   - isLoading: boolean (로딩 중 여부)
 *   - error: Error | null (에러 객체)
 *   - refetch: () => void (수동 refetch 함수)
 *
 * 사용 예시:
 * const { data: studies, isLoading, error } = useStudies({ patientId: 'PAT-001' });
 */
export function useStudies(searchParams?: StudySearchParams) {
  return useQuery({
    // queryKey: 캐시 키 (searchParams 변경 시 자동 refetch)
    queryKey: ['studies', searchParams],

    // queryFn: 데이터 fetch 함수
    queryFn: () => fetchStudies(searchParams),

    // staleTime: 5분 (queryClient 기본값 사용)
    // 5분간 데이터를 fresh로 간주하여 재요청하지 않음
    staleTime: 1000 * 60 * 5,
  });
}
```

### 핵심 포인트

1. **필터링 로직**: 4가지 조건 (patientId, patientName, studyDate, modality)
2. **API 전환 준비**: Week 6+에는 주석 처리된 api.get 사용
3. **TanStack Query**: queryKey에 searchParams 포함하여 자동 refetch

---

## 5. StudySearchForm 컴포넌트

### 파일 생성

**경로**: `src/features/study/components/StudySearchForm.tsx`

```typescript
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { StudySearchParams } from '../types/study';

/**
 * StudySearchForm.tsx
 *
 * Study 검색 폼 컴포넌트
 *
 * 목적:
 * - 환자 이름 검색
 * - 검사 날짜 필터
 * - Modality 필터 (CT, MR, XR, US, ALL)
 * - Enter 키 지원
 */

interface StudySearchFormProps {
  onSearch: (params: StudySearchParams) => void;
}

export default function StudySearchForm({ onSearch }: StudySearchFormProps) {
  const [patientName, setPatientName] = useState('');
  const [studyDate, setStudyDate] = useState('');
  const [modality, setModality] = useState<string>('ALL');

  const handleSearch = () => {
    onSearch({
      patientName: patientName || undefined,
      studyDate: studyDate || undefined,
      modality: modality === 'ALL' ? undefined : modality,
    });
  };

  const handleReset = () => {
    setPatientName('');
    setStudyDate('');
    setModality('ALL');
    onSearch({});
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 환자 이름 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            환자 이름
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="예: John Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 검사 날짜 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            검사 날짜
          </label>
          <input
            type="date"
            value={studyDate}
            onChange={(e) => setStudyDate(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Modality 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modality
          </label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체</option>
            <option value="CT">CT</option>
            <option value="MR">MR</option>
            <option value="XR">XR</option>
            <option value="US">US</option>
          </select>
        </div>

        {/* 검색/초기화 버튼 */}
        <div className="flex items-end gap-2">
          <button
            onClick={handleSearch}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="h-4 w-4" />
            검색
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 핵심 포인트

1. **3가지 검색 조건**: 환자 이름, 검사 날짜, Modality
2. **날짜 입력**: HTML5 `<input type="date">` 사용
3. **Modality 선택**: CT, MR, XR, US, ALL (드롭다운)
4. **초기화 버튼**: 모든 필드 초기화 후 빈 검색

---

## 6. StudyList 컴포넌트

### 파일 생성

**경로**: `src/features/study/components/StudyList.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import type { Study } from '../types/study';

/**
 * StudyList.tsx
 *
 * Study 목록 테이블 컴포넌트
 *
 * 목적:
 * - Study 데이터를 테이블로 표시
 * - 클릭 시 Study 상세 페이지로 이동
 * - 빈 상태 처리
 */

interface StudyListProps {
  studies: Study[];
}

export default function StudyList({ studies }: StudyListProps) {
  const navigate = useNavigate();

  const handleRowClick = (studyId: string) => {
    // Week 4-5에서 구현 예정
    navigate(`/studies/${studyId}`);
  };

  // 빈 상태
  if (studies.length === 0) {
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
                환자 이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                검사 날짜
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                검사 시간
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modality
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Study 설명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Series 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instance 수
              </th>
            </tr>
          </thead>

          {/* 테이블 바디 */}
          <tbody className="bg-white divide-y divide-gray-200">
            {studies.map((study) => (
              <tr
                key={study.id}
                onClick={() => handleRowClick(study.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {study.patientName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {study.studyDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {study.studyTime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {study.modality}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {study.studyDescription}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {study.seriesCount}개
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {study.instancesCount}개
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 결과 수 표시 */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-sm text-gray-700">
          총 <span className="font-medium">{studies.length}</span>개의 Study
        </p>
      </div>
    </div>
  );
}
```

### 핵심 포인트

1. **7개 컬럼**: 환자 이름, 날짜, 시간, Modality, 설명, Series 수, Instance 수
2. **Modality 뱃지**: 파란색 배경의 작은 태그로 표시
3. **행 클릭**: `/studies/{studyId}`로 이동 (Week 4-5에서 구현 예정)
4. **빈 상태**: 검색 결과가 없을 때 안내 메시지

---

## 7. StudyListPage 통합

### 파일 생성

**경로**: `src/app/pages/StudyListPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import StudySearchForm from '@/features/study/components/StudySearchForm';
import StudyList from '@/features/study/components/StudyList';
import { useStudies } from '@/features/study/hooks/useStudies';
import type { StudySearchParams } from '@/features/study/types/study';

/**
 * StudyListPage.tsx
 *
 * Study 목록 페이지
 *
 * 통합:
 * 1. StudySearchForm (검색 폼)
 * 2. StudyList (목록 테이블)
 * 3. useStudies Hook (데이터 조회)
 * 4. URL 쿼리 파라미터 지원 (환자 선택 시 자동 필터링)
 */
export default function StudyListPage() {
  const [urlSearchParams] = useSearchParams();
  const [searchParams, setSearchParams] = useState<StudySearchParams>({});

  // URL 쿼리 파라미터에서 patientId 가져오기
  // 예: /studies?patientId=PAT-001
  useEffect(() => {
    const patientId = urlSearchParams.get('patientId');
    if (patientId) {
      setSearchParams({ patientId });
    }
  }, [urlSearchParams]);

  // TanStack Query Hook
  const { data: studies, isLoading, error } = useStudies(searchParams);

  const handleSearch = (params: StudySearchParams) => {
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Study 목록</h1>
          <p className="mt-1 text-sm text-gray-600">
            검사 기록을 검색하고 상세 정보를 확인하세요
          </p>
        </div>
      </div>

      {/* 검색 폼 */}
      <StudySearchForm onSearch={handleSearch} />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Study 목록을 불러오는 중...</p>
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

      {/* Study 목록 */}
      {!isLoading && !error && studies && (
        <StudyList studies={studies} />
      )}
    </div>
  );
}
```

### 핵심 포인트

1. **URL 쿼리 파라미터**: `useSearchParams`로 `patientId` 읽기
2. **자동 필터링**: Patient List에서 환자 클릭 시 해당 환자의 Study만 표시
3. **검색 상태 관리**: `searchParams` state로 검색 조건 관리
4. **로딩/에러 처리**: TanStack Query의 isLoading, error 활용

---

## 8. Router 업데이트

### 파일 수정

**경로**: `src/app/Router.tsx`

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/app/pages/Dashboard';
import PatientListPage from '@/app/pages/PatientListPage';
import StudyListPage from '@/app/pages/StudyListPage'; // 추가

/**
 * Router.tsx
 *
 * React Router v6 기반 라우팅 설정
 */
export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />

          {/* Week 2-3: Patient List */}
          <Route path="patients" element={<PatientListPage />} />

          {/* Week 3-4: Study List */}
          <Route path="studies" element={<StudyListPage />} />  {/* 추가 */}

          {/* Week 4-5에 추가 예정 */}
          {/* <Route path="studies/:studyId" element={<StudyDetailPage />} /> */}
          {/* <Route path="upload" element={<UploadPage />} /> */}
          {/* <Route path="viewer/:seriesId" element={<DicomViewerPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### 핵심 포인트

1. **StudyListPage import**: 상단에 import 추가
2. **`/studies` 경로**: StudyListPage 컴포넌트 연결
3. **Sidebar 메뉴**: 이미 "Study 목록" 메뉴 존재 (`/studies`)

---

## 9. 테스트

### 브라우저 테스트

개발 서버가 실행 중인지 확인:
```bash
npm run dev
```

**테스트 URL**: http://localhost:10302/studies

### 체크리스트

- [ ] **Study 목록 표시**: 5개의 Study가 테이블로 표시됨
- [ ] **환자 이름 검색**: "John"입력 → 1개 결과
- [ ] **검사 날짜 필터**: 2025-12-25 선택 → 해당 날짜 Study만 표시
- [ ] **Modality 필터**: CT 선택 → CT Study만 표시 (2개)
- [ ] **Enter 키 검색**: 환자 이름 입력 후 Enter → 검색 실행
- [ ] **초기화 버튼**: 모든 필드 초기화 → 전체 목록 표시
- [ ] **행 클릭**: Study 클릭 → `/studies/STU-001` 이동 (404 정상, 아직 미구현)
- [ ] **URL 쿼리 파라미터**: `/studies?patientId=PAT-001` → John Doe의 Study만 표시

### Patient List 연동 테스트

1. http://localhost:10302/patients 접속
2. "John Doe" 행 클릭
3. `/studies?patientId=PAT-001`로 이동 확인
4. John Doe의 Study 3개만 표시 확인

---

## 10. 다음 단계

### Week 4-5: DICOM 업로드

**목표**: DICOM 파일 업로드 기능 구현

**예정 작업**:
1. UploadDropzone 컴포넌트 (react-dropzone)
2. UploadProgress 컴포넌트 (업로드 진행률)
3. useUploadDicom Hook (Real API 연동)
4. UploadPage 통합

**BE API 연동**:
- `POST /api/instances/upload` (이미 구현됨)
- Multipart form-data로 DICOM 파일 전송

### Mock → Real API 전환 (Week 6-7)

**useStudies Hook 수정**:
```typescript
const fetchStudies = async (searchParams?: StudySearchParams): Promise<Study[]> => {
  // Week 6+ Real API
  const response = await api.get<Study[]>('/qido-rs/studies', {
    params: {
      PatientID: searchParams?.patientId,
      PatientName: searchParams?.patientName,
      StudyDate: searchParams?.studyDate,
      Modality: searchParams?.modality,
    },
  });
  return response.data;
};
```

**BE 의존성**: QIDO-RS API (Week 6-7 긴급 구현 예정)

---

## 요약

### 완료된 파일

1. `src/features/study/types/study.ts` - Study, StudySearchParams
2. `src/features/study/hooks/useStudies.ts` - TanStack Query Hook
3. `src/features/study/components/StudySearchForm.tsx` - 검색 폼
4. `src/features/study/components/StudyList.tsx` - 테이블 컴포넌트
5. `src/app/pages/StudyListPage.tsx` - 페이지 통합
6. `src/app/Router.tsx` - `/studies` 경로 추가

### 진행률

- **Week 1-2**: 15% (초기 설정) ✅
- **Week 2-3**: 25% (Patient List) ✅
- **Week 3-4**: 35% (Study List) ✅
- **Week 4-5**: DICOM 업로드
- **Week 6-7**: API 전환
- **Week 7-8**: DICOM Viewer

---

*작성일: 2025-12-31*
*Week: 3-4*
*Phase: Phase 1 - Core PACS*
