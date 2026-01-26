# Frontend 컨텍스트

> **최종 업데이트**: 2026-01-19

---

## 현재 상태

| 항목 | 값 |
|------|-----|
| **프로젝트** | MiniPACS Standalone |
| **상태** | ✅ POC 완성 + 코드 품질 개선 |
| **진행률** | 100% |
| **블로커** | 없음 |

---

## 완성된 기능

### Core PACS (User)
- ✅ **Patient List** - 환자 목록 조회
- ✅ **Study List** - 검사 목록 조회
- ✅ **DICOM Upload** - 파일 업로드
- ✅ **DICOM Viewer** - Cornerstone3D 멀티 슬롯 뷰어
- ✅ **Series Thumbnail** - 시리즈 썸네일 렌더링
- ✅ **Hybrid Viewer** - MJPEG+WADO-RS 듀얼 레이어 뷰어 (2026-01-16)

### Admin Dashboard
- ✅ **Dashboard** - 환자/Study/Series/Instance 통계
- ✅ **Storage Monitoring** - Tier별 용량, 트렌드 차트
- ✅ **Tiering 관리** - HOT/WARM/COLD 정책, 파일 목록
- ✅ **실시간 모니터링** - 업로드/렌더링 작업 현황
- ✅ **SeaweedFS Admin** - Cluster 상태 표시

### 코드 품질 개선 (2026-01-19)
- ✅ **SeriesResponse 어댑터 중앙화** - studyService, seriesService 중복 코드 제거
- ✅ **Debug console.log 제거** - StorageManagePage 프로덕션 로그 정리
- ✅ **HybridSlot 버그 수정** - 3x2/3x3 레이아웃 MJPEG visibility 처리

---

## 기술 스택

| 기술 | 버전 | 용도 |
|-----|------|-----|
| React | 19.2.0 | UI 프레임워크 |
| TypeScript | 5.9.3 | 타입 안전성 |
| Vite | 7.2.4 | 빌드 도구 |
| React Router | 7.11.0 | 라우팅 |
| Zustand | 5.0.9 | 클라이언트 상태 |
| TanStack Query | 5.90.16 | 서버 상태 |
| Cornerstone3D | 4.15.1 | DICOM 뷰어 |
| Recharts | 3.6.0 | 차트 |
| Tailwind CSS | 3.4.19 | 스타일링 |

---

## 프로젝트 구조

```
sado_fe/
├── src/
│   ├── app/
│   │   ├── layout/          # Header, Sidebar, MainContent
│   │   └── pages/           # 페이지 컴포넌트
│   │       ├── admin/       # Admin 페이지
│   │       └── ...
│   ├── features/
│   │   ├── dicom-viewer/    # Cornerstone3D 뷰어
│   │   ├── dicom-viewer-mjpeg-wado-rs/  # 하이브리드 뷰어 (MJPEG+Cornerstone)
│   │   ├── patient/         # 환자 관련
│   │   └── study/           # 검사 관련
│   ├── lib/
│   │   ├── api.ts           # API 클라이언트
│   │   ├── services/        # API 서비스
│   │   │   ├── adapters.ts  # 공유 DTO 어댑터 (SeriesResponse)
│   │   │   ├── studyService.ts
│   │   │   ├── seriesService.ts
│   │   │   └── ...
│   │   └── stores/          # Zustand 스토어
│   └── types/               # TypeScript 타입
└── vite.config.ts
```

---

## API 연동 상태

### DICOMweb API
| API | 상태 |
|-----|------|
| QIDO-RS | ✅ 연동 완료 |
| WADO-RS | ✅ 연동 완료 |
| WADO-URI | ✅ 연동 완료 |

### Admin API
| API | 상태 |
|-----|------|
| Dashboard Summary | ✅ 연동 완료 |
| Storage Metrics | ✅ 연동 완료 |
| Tier Distribution | ✅ 연동 완료 |
| Monitoring Tasks | ✅ 연동 완료 |
| SeaweedFS Admin | ✅ 연동 완료 |

---

## 코드 아키텍처 패턴

### API 서비스 레이어
```
lib/services/
├── adapters.ts      # 공유 DTO 어댑터 (SeriesResponse, adaptSeriesResponse)
├── api.ts           # Fetch wrapper (ApiError 처리)
├── studyService.ts  # Study API (adapters import)
├── seriesService.ts # Series API (adapters import)
├── patientService.ts
└── adminService.ts
```

### 에러 처리 패턴
- **HTTP 에러 (4xx, 5xx)**: `ApiError` 클래스로 throw → React Query의 `error` 상태로 처리
- **204 No Content**: `null` 반환 → 서비스에서 빈 배열/null로 변환 (정상 응답)
- **네트워크 에러**: `ApiError.networkError()` throw

### 디버그 로그 패턴
```typescript
const DEBUG_STORE = false  // 프로덕션: false

if (DEBUG_STORE) console.log('[Store] message')
```

---

## 주요 설정

### 환경 변수
```env
VITE_API_BASE_URL=http://localhost:10201
VITE_USE_MOCK=false
```

### 포트
| 서비스 | 포트 |
|--------|------|
| Frontend (Vite) | 10300 |
| Backend API | 10201 |

---

## 참고 문서

| 문서 | 용도 |
|------|------|
| [START_HERE.md](../START_HERE.md) | 프로젝트 시작점 |
| [PROGRESS.md](PROGRESS.md) | 진행 상황 |
| [00_MiniPACS_Admin_User_기능_정책.md](../02_가이드/00_MiniPACS_Admin_User_기능_정책.md) | 기능 정책 |

---

## Claude Code 재시작 시

1. 이 문서 (CURRENT_CONTEXT.md) 확인
2. [START_HERE.md](../START_HERE.md) 확인
3. 사용자 요청에 따라 작업 진행

---

*최종 수정: 2026-01-19 (코드 품질 개선)*
