# SADO-FE 학습 노트

> **FE 개발 과정에서 배운 내용 정리**

---

## 개요

이 폴더는 SADO-FE 개발 과정에서 학습한 내용을 정리하는 공간입니다.

> **Note**: MiniPACS POC 기간 동안 FE 개발은 BE와 통합되어 진행되었습니다.
> 상세 학습 노트는 [BE 03_학습/](../../01_백엔드/03_학습/) 폴더를 참조하세요.

---

## MiniPACS POC 완료 현황

**POC 완료일**: 2026-01-14

### 구현된 기능
- ✅ React 19 + TypeScript 5.9 + Vite 7.2
- ✅ Zustand (클라이언트 상태) + TanStack Query (서버 상태)
- ✅ Cornerstone3D DICOM Viewer (4.12.6)
- ✅ shadcn/ui 컴포넌트 시스템
- ✅ Admin Dashboard (통계, Storage, Tiering, Monitoring)
- ✅ 전체 DICOMWeb API 연동 (15개 엔드포인트)

### 주요 학습 성과
| 기술 | 학습 내용 |
|------|----------|
| Cornerstone3D | DICOM 렌더링, WebGL, Multi-slot Viewer |
| Zustand + TanStack Query | 클라이언트/서버 상태 분리 패턴 |
| shadcn/ui | Radix 기반 커스터마이징 |
| Recharts | Admin Dashboard 차트 구현 |
| Tailwind CSS | 반응형 레이아웃, 다크 모드 준비 |

---

## 블로그 작성 가이드

### 블로그 구조

```markdown
# [제목]

## 들어가며
- 문제 상황 / 학습 동기
- 목표

## 본론
- 핵심 개념 설명
- 구현 과정
- 코드 예시

## 트러블슈팅 (선택)
- 겪은 문제
- 해결 방법

## 마무리
- 배운 점
- 다음 단계
```

### 작성 시점
- 주차별 학습 완료 후
- 특정 기술 구현 완료 후
- 트러블슈팅 해결 후

---

## 학습 노트 템플릿

### notes.md

```markdown
# Week [N] 학습 노트

## 학습 목표
- [ ] 목표 1
- [ ] 목표 2

## 핵심 개념
### [개념 1]
...

### [개념 2]
...

## 코드 예시
\`\`\`typescript
// 예시 코드
\`\`\`

## 참고 자료
- [링크 1]
- [링크 2]

## 회고
- 잘한 점:
- 개선할 점:
- 다음 주 계획:
```

### troubleshooting.md

```markdown
# Week [N] 트러블슈팅

## 문제 1: [문제 제목]

### 증상
[증상 설명]

### 원인
[원인 분석]

### 해결
\`\`\`typescript
// 해결 코드
\`\`\`

### 배운 점
[교훈]
```

---

## 관련 문서

| 문서 | 설명 |
|-----|------|
| [BE 03_학습/](../../01_백엔드/03_학습/) | BE 학습 노트 (Week 1-8 상세) |
| [11_블로그_작성_가이드.md](../../01_백엔드/02_가이드/11_블로그_작성_가이드.md) | 블로그 작성 가이드 |
| [FE PROGRESS.md](../04_추적/PROGRESS.md) | FE 진행 상황 |
| [FE CURRENT_CONTEXT.md](../04_추적/CURRENT_CONTEXT.md) | FE 현재 컨텍스트 |

---

## 향후 학습 예정 (AI 페이즈)

| 주제 | 설명 |
|------|------|
| AI 결과 시각화 | EF 결과 표시, 세그멘테이션 오버레이 |
| OAuth2/Keycloak | 인증 통합 (프로덕션 전환 시) |
| 성능 최적화 | 코드 스플리팅, Lazy loading |

---

*최종 수정: 2026-01-15*
