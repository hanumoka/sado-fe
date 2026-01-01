# Mock 모드 제거 및 FE-BE 연동 진행 상황

> 작성일: 2026-01-01
> 환경: WSL → PowerShell로 전환 예정

---

## 완료된 작업

### 1. `.env` 파일 생성 ✅
```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:10200
```

### 2. `studyService.ts` API 경로 수정 ✅
**파일**: `src/lib/services/studyService.ts`

- Line 76-78: `/qido-rs/studies` → `/dicomweb/studies`
- Line 113: `/qido-rs/studies/${studyId}/series` → `/dicomweb/studies/${studyId}/series`

### 3. `instanceService.ts` 함수 시그니처 및 경로 수정 ✅
**파일**: `src/lib/services/instanceService.ts`

- Mock 함수: `_studyInstanceUid` 파라미터 추가 (unused prefix)
- Real 함수: `studyInstanceUid`, `seriesInstanceUid` 두 파라미터 받도록 수정
- API 경로: `/dicomweb/studies/${studyInstanceUid}/series/${seriesInstanceUid}/instances`

### 4. `useInstances.ts` Hook 수정 ✅
**파일**: `src/features/dicom-viewer/hooks/useInstances.ts`

- Series 정보 먼저 조회하여 `studyInstanceUid` 획득
- `fetchInstancesBySeriesId(series.studyInstanceUid, series.seriesInstanceUid)` 호출

### 5. TypeScript 컴파일 ✅
```bash
npx tsc --noEmit  # 성공 (에러 없음)
```

---

## 남은 작업

### 1. 빌드 테스트 🔄
WSL 환경에서 Vite 7.x + Cornerstone.js worker 호환성 문제 발생

**에러 내용**:
```
Invalid value "iife" for option "worker.format" - UMD and IIFE output formats
are not supported for code-splitting builds.
```

**PowerShell에서 시도할 명령어**:
```powershell
cd C:\Users\amagr\projects\sado\sado-fe
npm install
npm run build
```

### 2. 인프라 실행 ⏳
```powershell
# Backend
cd C:\Users\amagr\projects\sado\sado-be
docker-compose up -d
.\gradlew.bat :sado-minipacs:bootRun

# Frontend
cd C:\Users\amagr\projects\sado\sado-fe
npm run dev
```

### 3. E2E 연동 테스트 ⏳
- Study 목록 조회
- Series 목록 조회
- Instance 목록 조회
- DICOM Viewer 렌더링
- DICOM 파일 업로드

---

## 수정된 파일 목록

| 파일 | 상태 | 변경 내용 |
|------|------|----------|
| `.env` | 신규 생성 | Mock 모드 해제 설정 |
| `src/lib/services/studyService.ts` | 수정 | API 경로 변경 |
| `src/lib/services/instanceService.ts` | 수정 | 함수 시그니처 + API 경로 변경 |
| `src/features/dicom-viewer/hooks/useInstances.ts` | 수정 | studyInstanceUid 전달 |

---

## 참고: 원본 계획 파일

`/home/hanumoka/.claude/plans/compiled-whistling-waffle.md` 참조
