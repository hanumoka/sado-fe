# FE 기술 가이드 인덱스

> **최종 업데이트**: 2026-01-09
> **상태**: Week 1-8 POC 완료 (100%)

---

## Week 1-8 완료 가이드 (POC)

### 프로젝트 설정
| 번호 | 문서 | 설명 | 상태 |
|------|------|------|------|
| 00 | [MiniPACS_Admin_User_기능_정책](00_MiniPACS_Admin_User_기능_정책.md) | Admin/User 권한 | ✅ 완료 |

### 아키텍처
| 번호 | 문서 | 설명 | 상태 |
|------|------|------|------|
| 03 | [상태_관리_전략](03_상태_관리_전략.md) | Zustand + TanStack Query | ✅ 완료 |
| 04 | [컴포넌트_아키텍처](04_컴포넌트_아키텍처.md) | Feature-based 구조 | ✅ 완료 |
| 05 | [API_통합_가이드](05_API_통합_가이드.md) | REST API 전환 (2026-01-05) | ✅ 완료 |

### DICOM 뷰어
| 번호 | 문서 | 설명 | 상태 |
|------|------|------|------|
| 06 | [DICOM_뷰어_아키텍처_가이드](06_DICOM_뷰어_아키텍처_가이드.md) | Cornerstone3D + WADO-RS | ✅ 완료 |
| 13 | [DICOM_Viewer_WADO_연동_가이드](13_DICOM_Viewer_WADO_연동_가이드.md) | WADO 연동 구현 | ✅ 완료 |

### UI/UX
| 번호 | 문서 | 설명 | 상태 |
|------|------|------|------|
| 07 | [테스팅_전략](07_테스팅_전략.md) | Vitest + Testing Library | ✅ 완료 |
| 08 | [스타일링_가이드](08_스타일링_가이드.md) | Tailwind + shadcn/ui | ✅ 완료 |

### 기능별 가이드
| 번호 | 문서 | 설명 | 상태 |
|------|------|------|------|
| 10 | [Patient_List_가이드](10_Patient_List_가이드.md) | 환자 목록 (UUID) | ✅ 완료 |
| 11 | [Study_List_가이드](11_Study_List_가이드.md) | 검사 목록 (REST API) | ✅ 완료 |

---

## Phase별 완성도

### Phase 1: Core PACS (80%)
- ✅ Dashboard
- ✅ Patient List (UUID 컬럼)
- ✅ Study List (REST API 전환)
- ✅ DICOM Upload
- ✅ DICOM Viewer (WADO-RS Pixel Metadata)

### Phase 2: Admin Dashboard (40%)
- ✅ Admin Dashboard (Recharts 기반)
- ❌ SeaweedFS 관리 (Week 9+ 확장)
- ❌ Tier 관리 (Week 9+ 확장)

---

## 주요 업데이트 이력

| 날짜 | 가이드 | 변경 내용 |
|------|--------|----------|
| 2026-01-09 | 06_DICOM_뷰어 | WADO-RS Pixel Metadata 연동 |
| 2026-01-05 | 05_API_통합 | REST API 전환 |
| 2026-01-05 | 11_Study_List | UUID + REST API 반영 |
| 2025-12-31 | 10_Patient_List | UUID 컬럼 추가 |

---

## 관련 문서

- POC 체크리스트: [../POC_완성도_체크리스트.md](../POC_완성도_체크리스트.md)
- 진행 상황: [../04_추적/PROGRESS.md](../04_추적/PROGRESS.md)
- 시작점: [../START_HERE.md](../START_HERE.md)

> **Note**: MiniPACS POC 100% 완료 (2026-01-23)
