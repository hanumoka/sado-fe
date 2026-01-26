# API 통합 가이드

> **BE 연동 가이드**

---

## 개요

### 연동 대상

| 서비스 | 역할 | 통신 |
|-------|------|------|
| **sado-minipacs** | DICOMweb API + REST API | HTTP REST |

### 아키텍처

```
┌─────────────┐     ┌─────────────────┐
│   sado_fe   │────►│  sado-minipacs  │
│  (React)    │HTTP │  (Spring Boot)  │
└─────────────┘     └─────────────────┘
```

> **Note**: MiniPACS POC에서는 인증 기능이 구현되지 않았습니다.
> 프로덕션 환경에서는 Keycloak OAuth2 등 인증 레이어 추가가 필요합니다.

---

## 환경 변수 설정

### .env.example

```env
# API
VITE_API_BASE_URL=http://localhost:10201

# Feature Flags
VITE_ENABLE_MOCK_API=false
```

### 타입 정의

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENABLE_MOCK_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## API 클라이언트

### 기본 설정

```typescript
// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10201';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'default', // POC용 테넌트 식별
    };
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }
    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(path, params);

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(),
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message || 'API Error');
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient(API_BASE_URL);
```

---

## BE API 엔드포인트

### BFF API (프론트엔드 전용)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/bff/studies` | 스터디 목록 조회 |
| GET | `/api/bff/studies/{id}` | 스터디 상세 조회 |
| GET | `/api/bff/studies/{id}/full` | 스터디 + 분석 결과 조회 |
| POST | `/api/bff/studies/{id}/analyze` | AI 분석 요청 |
| GET | `/api/bff/studies/{id}/report` | 분석 리포트 조회 |

### MiniPACS API (파일 관리)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/minipacs/dicom/upload` | DICOM 파일 업로드 |
| GET | `/api/minipacs/dicom/{id}` | DICOM 파일 조회 |
| DELETE | `/api/minipacs/dicom/{id}` | DICOM 파일 삭제 |

### API 타입 정의

```typescript
// src/types/api.ts

// 공통 응답
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// 페이지네이션
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// 스터디
export interface Study {
  id: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  modality: string;
  status: StudyStatus;
  seriesCount: number;
  instanceCount: number;
}

export type StudyStatus =
  | 'PENDING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED';

// 분석 결과
export interface AnalysisResult {
  id: string;
  studyId: string;
  ejectionFraction: number;  // EF (%)
  endDiastolicVolume: number;  // EDV (ml)
  endSystolicVolume: number;  // ESV (ml)
  segmentationMaskUrl: string;
  analyzedAt: string;
}

// 전체 결과 (BFF Full)
export interface StudyFull {
  study: Study;
  analysis: AnalysisResult | null;
}
```

---

## 파일 업로드

### 업로드 훅

```typescript
// src/features/upload/hooks/useUpload.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadOptions {
  file: File;
  onProgress?: (progress: UploadProgress) => void;
}

export function useUploadDicom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, onProgress }: UploadOptions) => {
      const formData = new FormData();
      formData.append('file', file);

      return new Promise<{ studyId: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100),
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', `${API_BASE_URL}/dicomweb/studies`);
        xhr.setRequestHeader('X-Tenant-ID', 'default');
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
    },
  });
}
```

### 업로드 컴포넌트

```typescript
// src/features/upload/components/UploadDropzone.tsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadDicom } from '../hooks/useUpload';
import { Progress } from '@/components/ui/progress';

export function UploadDropzone() {
  const [progress, setProgress] = useState(0);
  const { mutate: upload, isPending, isSuccess, error } = useUploadDicom();

  const onDrop = useCallback((files: File[]) => {
    files.forEach(file => {
      upload({
        file,
        onProgress: (p) => setProgress(p.percentage),
      });
    });
  }, [upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/dicom': ['.dcm'],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
        isDragActive ? 'border-primary bg-primary/10' : 'border-muted'
      )}
    >
      <input {...getInputProps()} />
      {isPending ? (
        <div>
          <p>Uploading...</p>
          <Progress value={progress} className="mt-4" />
        </div>
      ) : (
        <p>Drag & drop DICOM files here, or click to select</p>
      )}
    </div>
  );
}
```

---

## 에러 처리

### 전역 에러 핸들러

```typescript
// src/lib/errorHandler.ts
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        toast({ title: 'Bad Request', description: error.message, variant: 'destructive' });
        break;
      case 401:
        toast({ title: 'Unauthorized', description: 'Please login again', variant: 'destructive' });
        break;
      case 403:
        toast({ title: 'Forbidden', description: 'Access denied', variant: 'destructive' });
        break;
      case 404:
        toast({ title: 'Not Found', description: error.message, variant: 'destructive' });
        break;
      case 500:
        toast({ title: 'Server Error', description: 'Please try again later', variant: 'destructive' });
        break;
      default:
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  } else {
    toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
  }
}
```

---

## 관련 문서

| 문서 | 설명 |
|-----|------|
| [03_상태_관리_전략.md](03_상태_관리_전략.md) | TanStack Query 설정 |
| [15_횡단_관심사_설계_가이드.md](../../01_백엔드/02_가이드/15_횡단_관심사_설계_가이드.md) | 멀티테넌시 |
| [32_REST_API_명세서.md](../../01_백엔드/02_가이드/32_REST_API_명세서.md) | API 명세 |

---

*최종 수정: 2026-01-23*
