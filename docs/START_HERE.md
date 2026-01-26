# SADO-FE 프로젝트 시작하기

> **5분 안에 현재 상태 파악하고 작업 시작하기**

---

## 현재 상태

| 항목 | 값 |
|------|-----|
| **Phase** | **MiniPACS Standalone** ✅ |
| **아키텍처** | sado_fe → sado-minipacs (직접 통신) |
| **진행률** | 100% |
| **최종 업데이트** | 2026-01-14 |

---

## MiniPACS 완성!

### 완료된 기능
- ✅ **Patient List** - 환자 목록 조회
- ✅ **Study List** - 검사 목록 조회
- ✅ **DICOM Upload** - 파일 업로드
- ✅ **DICOM Viewer** - Cornerstone3D 멀티 슬롯 뷰어
- ✅ **Admin Dashboard** - 통계, Storage, Tiering
- ✅ **실시간 모니터링** - 업로드/렌더링 작업

> 상세 내용: [CURRENT_CONTEXT.md](04_추적/CURRENT_CONTEXT.md)

---

## 필수 참고 문서

### 종합 개발자 가이드 (신규 개발자 필독)
| 문서 | 설명 |
|------|------|
| **[FE 종합 개발 가이드](../../sado_be/docs/common/개발자가이드/02_FE_개발자_가이드.md)** | 개발환경, 아키텍처, 상태관리, DICOM 뷰어, 테스트, 유지보수 등 |

### 매일 확인
| 문서 | 역할 | 링크 |
|------|------|------|
| 현재 컨텍스트 | Claude 복원용 | [CURRENT_CONTEXT.md](04_추적/CURRENT_CONTEXT.md) |
| 진행 상황 | 전체 진행률 | [PROGRESS.md](04_추적/PROGRESS.md) |
| 기능 정책 | FE 전체 범위 | [00_MiniPACS_Admin_User_기능_정책.md](02_가이드/00_MiniPACS_Admin_User_기능_정책.md) |

---

## Claude Code가 재시작되었나요?

### 간편 복원: "진행상황"이라고 물으세요!

**트리거 키워드:**
- "진행상황" / "진행 상황"
- "현재 상태" / "현황"
- "status" / "어디까지 했지?"

### 수동 복원 절차

1. [CURRENT_CONTEXT.md](04_추적/CURRENT_CONTEXT.md) 읽기
2. 사용자 요청에 따라 작업 진행

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
| Tailwind CSS | 3.4.19 | 스타일링 |

---

## 프로젝트 구조

```
sado_fe/
├── src/
│   ├── app/
│   │   ├── layout/          # Header, Sidebar, MainContent
│   │   └── pages/           # 페이지 컴포넌트
│   ├── features/            # 기능별 모듈
│   ├── lib/                 # API, 서비스, 스토어
│   └── types/               # TypeScript 타입
└── vite.config.ts
```

---

## API 연동 정보

### 포트 매핑
| 서비스 | 포트 |
|--------|------|
| Frontend (Vite) | 10300 |
| Backend API | 10201 |

### 환경 변수
```env
VITE_API_BASE_URL=http://localhost:10201
VITE_USE_MOCK=false
```

### 주요 API
| API | 엔드포인트 |
|-----|-----------|
| DICOMweb | /dicomweb/* |
| Admin | /api/admin/* |
| REST | /api/* |

---

## 빠른 링크

| 필요한 것 | 문서 |
|----------|------|
| "현재 상태?" | [CURRENT_CONTEXT.md](04_추적/CURRENT_CONTEXT.md) |
| "전체 진행률?" | [PROGRESS.md](04_추적/PROGRESS.md) |
| "기능 범위?" | [00_MiniPACS_Admin_User_기능_정책.md](02_가이드/00_MiniPACS_Admin_User_기능_정책.md) |

---

*최종 수정: 2026-01-14*
