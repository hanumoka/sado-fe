# DICOM Viewer WADO 연동 가이드

> **문서 위치**: `sado_docs/fe/guides/13_DICOM_Viewer_WADO_연동_가이드.md`
> **작성일**: 2026-01-12
> **상태**: Production Ready

---

## 1. 개요

MiniPACS Frontend에서 DICOM 이미지를 로드하는 3가지 방식을 제공합니다.

| 방식 | 상태 | 용도 | 라우트 |
|------|------|------|--------|
| **WADO-RS Rendered** | ✅ Production Ready | 일반 뷰잉 | `/viewer/wado-rs-rendered/:study/:series` |
| WADO-RS BulkData | POC/Testing | 고급 도구 | `/viewer/wado-rs/:study/:series` |
| WADO-URI | Legacy/POC | 레거시 호환 | `/viewer/wado-uri/:study/:series` |

---

## 2. WADO-RS Rendered (권장)

### 2.1 동작 원리
1. Backend에서 DICOM → PNG 렌더링
2. Frontend에서 PNG 직접 표시
3. 클라이언트 디코딩 부담 없음

### 2.2 ImageId 형식
```typescript
const imageId = `wadors-rendered:${studyUid}:${seriesUid}:${sopInstanceUid}:${frameNumber}`
```

### 2.3 URL 구성
```typescript
// 단일 프레임
GET /dicomweb/studies/{studyUid}/series/{seriesUid}/instances/{sopInstanceUid}/rendered

// 지정 프레임
GET /dicomweb/studies/{studyUid}/series/{seriesUid}/instances/{sopInstanceUid}/frames/{frameNumber}/rendered
```

### 2.4 장점
- 클라이언트 리소스 절약
- 모든 Transfer Syntax 지원 (서버 디코딩)
- 빠른 초기 로딩

### 2.5 핵심 파일
| 파일 | 역할 |
|------|------|
| `DicomViewerPage.tsx` | 메인 뷰어 페이지 |
| `CornerstoneSlot.tsx` | 개별 슬롯 컴포넌트 |
| `wadoRsRenderedLoader.ts` | Cornerstone3D 커스텀 로더 |
| `wadoRsRenderedCache.ts` | 500MB LRU 캐시 |

---

## 3. WADO-RS BulkData (POC)

### 3.1 동작 원리
1. Backend에서 Raw PixelData 추출
2. Frontend에서 Cornerstone3D가 픽셀 해석
3. Window/Level 등 고급 도구 가능

### 3.2 ImageId 형식
```typescript
const imageId = `wadors:${baseUrl}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUid}/frames/${frameNumber}`
```

### 3.3 메타데이터 요구사항
**중요:** BulkData 방식은 메타데이터 API 호출이 **필수**입니다.

```typescript
// Instance 메타데이터 먼저 로드
await fetchAndCacheMetadata(studyUid, seriesUid, sopInstanceUid)

// 그 후 이미지 로드
viewport.setStack(imageIds)
```

### 3.4 에러 핸들링 (2026-01-12 개선)
메타데이터 fetch 실패 시 경고 표시:
- 노란색 배너: "Metadata fallback"
- 이미지는 fallback 값으로 계속 로드 시도
- withRetry 적용 (최대 2회 재시도, 지수 백오프)

### 3.5 핵심 파일
| 파일 | 역할 |
|------|------|
| `WadoRsViewerPage.tsx` | 뷰어 페이지 |
| `WadoRsBulkDataSlot.tsx` | 개별 슬롯 |
| `wadoRsBulkDataMetadataProvider.ts` | 메타데이터 프로바이더 |
| `wadoRsPixelDataCache.ts` | 1GB LRU 캐시 |

---

## 4. WADO-URI (Legacy)

### 4.1 동작 원리
1. Query String 방식 URL
2. 전체 DICOM 파일 다운로드
3. cornerstoneWADOImageLoader 사용

### 4.2 ImageId 형식
```typescript
const imageId = `wadouri:${baseUrl}/dicomweb/wado?requestType=WADO&studyUID=${studyUid}&seriesUID=${seriesUid}&objectUID=${sopUid}&frame=${frameNumber}`
```

### 4.3 제한사항
- 배치 프레임 요청 불가
- 프레임당 개별 HTTP 요청 필요
- 레거시 시스템 호환용

---

## 5. 뷰어별 권장 설정

| 뷰어 유형 | 권장 방식 |
|-----------|-----------|
| 단순 이미지 조회 | WADO-RS Rendered |
| 심초음파 Cine 재생 | WADO-RS Rendered |
| 측정 도구 사용 | WADO-RS BulkData |
| OHIF Viewer 통합 | WADO-RS BulkData |
| 레거시 시스템 | WADO-URI |

---

## 6. 썸네일 로딩

모든 뷰어에서 썸네일은 **WADO-RS Rendered** 엔드포인트 사용:

```typescript
// 효율적인 썸네일 로딩 (모든 뷰어 공통)
const thumbnailUrl = `${baseUrl}/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${sopUid}/frames/1/rendered`
```

---

## 7. 트러블슈팅

### 7.1 검은 화면
- 메타데이터 프로바이더 확인 (BulkData)
- `isViewportReady` 상태 확인
- Cornerstone3D 초기화 완료 확인

### 7.2 이미지 깨짐 (RGB)
- Pixel Metadata 확인 (SamplesPerPixel, PhotometricInterpretation)
- DB 마이그레이션 필요 여부 확인
- Transfer Syntax 지원 확인

### 7.3 메타데이터 경고 (노란색 배너)
- 백엔드 메타데이터 엔드포인트 확인
- 네트워크 연결 확인
- 재시도 후에도 실패 시 fallback 값 사용 중

### 7.4 Cine 재생 끊김
- 프리로드 완료 확인 (isPreloaded 상태)
- 배치 사이즈 조정
- FPS 설정 확인 (15/30/60)

---

## 8. 성능 최적화

### 8.1 캐싱 전략

| 뷰어 | 캐시 크기 | 타입 |
|------|----------|------|
| WADO-RS Rendered | 500MB | PNG LRU |
| WADO-RS BulkData | 1GB | IImage LRU |
| WADO-URI | 200 items | IImage LRU |

### 8.2 프리페칭
- 썸네일 로딩 완료 후 자동 프리로드 시작
- 배치 API로 다중 프레임 요청 (I/O 90% 절감)
- Fetch Interceptor로 중복 요청 방지

---

## 9. MJPEG + WADO-RS Hybrid Viewer (2026-01-16 추가)

> **Progressive Enhancement 패턴**: 즉시 재생 → 고화질 전환

### 9.1 개요

MJPEG로 즉시 재생을 시작하고, 백그라운드에서 Cornerstone (WADO-RS)를 프리로드한 후 자연스럽게 전환하는 하이브리드 뷰어입니다.

| 단계 | 레이어 | 지연시간 | 기능 |
|------|--------|----------|------|
| 1 | MJPEG | ~100ms | 즉시 재생, 프리뷰 |
| 2 | Cornerstone | 백그라운드 | 프리로딩 |
| 3 | 전환 | 루프 경계 | 크로스페이드 (200ms) |
| 4 | Cornerstone | - | W/L, 측정 도구 사용 |

### 9.2 라우트

```
/viewer/mjpeg-wado-rs/:studyInstanceUid/:seriesInstanceUid
```

### 9.3 아키텍처

```
MjpegWadoRsViewerPage
├── HybridControls (레이아웃, FPS, 해상도)
├── HybridMultiViewer (그리드 컨테이너)
│   └── HybridSlot[] (듀얼 레이어 슬롯)
│       ├── CornerstoneLayer (z-index: 0, 하단)
│       ├── MjpegLayer (z-index: 1, 상단)
│       └── HybridSlotOverlay (z-index: 2, 상태 표시)
└── HybridInstanceSidebar (인스턴스 목록)
```

### 9.4 전환 상태 머신 (TransitionPhase)

```
idle → mjpeg-loading → mjpeg-playing → transition-prepare → transitioning → cornerstone
                           ↑                    ↓
                           └── (pendingTransition=true 대기)
```

| Phase | 설명 |
|-------|------|
| `idle` | 인스턴스 미할당 |
| `mjpeg-loading` | MJPEG 프레임 캐싱 중 |
| `mjpeg-playing` | MJPEG 재생 중 + Cornerstone 프리로드 |
| `transition-prepare` | MJPEG freeze + 크로스페이드 준비 |
| `transitioning` | 크로스페이드 진행 (200ms) |
| `cornerstone` | Cornerstone 활성화 |

### 9.5 핵심 파일

| 파일 | 역할 |
|------|------|
| `HybridSlot.tsx` | 듀얼 레이어 오케스트레이션, 크로스페이드 |
| `MjpegLayer.tsx` | Canvas 기반 MJPEG 렌더링, RAF 애니메이션 |
| `CornerstoneLayer.tsx` | Cornerstone StackViewport |
| `HybridSlotOverlay.tsx` | 상태 배지, 로딩 표시 |
| `hybridMultiViewerStore.ts` | Zustand 상태 관리 |
| `hybridPreloadManager.ts` | MJPEG 프레임 프리로드 |
| `HybridCineAnimationManager.ts` | Cornerstone Cine 재생 |

### 9.6 주요 버그 수정 기록

#### 9.6.1 React Closure Stale Value 문제

**문제**: `handleLoopBoundary` 콜백에서 `pendingTransition` 상태가 stale closure로 읽힘

**해결**: Zustand `getState()` 직접 호출
```typescript
const handleLoopBoundary = useCallback(() => {
  // ✅ 최신 상태 직접 읽기
  const { slots } = useHybridMultiViewerStore.getState()
  const currentSlot = slots[slotId]
  if (currentSlot?.transition.pendingTransition) {
    prepareTransition(slotId)
  }
}, [slotId, prepareTransition])
```

#### 9.6.2 useCrossfade 객체 참조 문제

**문제**: `useCrossfade` 훅이 매 렌더마다 새 객체 반환 → useEffect 의존성에서 변경 감지 → `reset()` 반복 호출 → 크로스페이드 RAF 취소

**해결**: useEffect 의존성에서 `crossfade` 객체 제거
```typescript
useEffect(() => {
  crossfade.reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [instance?.sopInstanceUid])  // crossfade 제거

useEffect(() => {
  if (phase === 'transition-prepare') {
    setSlotPhase(slotId, 'transitioning')
    crossfade.start()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [phase, slotId, setSlotPhase])  // crossfade 제거
```

#### 9.6.3 animate() 함수 구조 문제

**문제**:
- Early return 시 RAF 미스케줄 → 애니메이션 정지
- 프레임 인덱스 업데이트 누락

**해결**: RAF 항상 스케줄, 프레임 인덱스 먼저 업데이트
```typescript
const animate = useCallback((timestamp: number) => {
  const frames = getCachedFrames()

  // ✅ 프레임 없어도 RAF 스케줄
  if (frames.length === 0) {
    animationIdRef.current = requestAnimationFrame(animate)
    return
  }

  if (elapsed >= frameInterval) {
    const nextIndex = (frameIndexRef.current + 1) % frames.length

    // ✅ 프레임 인덱스 먼저 업데이트
    frameIndexRef.current = nextIndex
    renderFrame(frames, nextIndex)

    // 루프 경계 콜백
    if (nextIndex === 0) {
      onLoopBoundary?.()
    }
  }

  animationIdRef.current = requestAnimationFrame(animate)
}, [/* deps */])
```

### 9.7 성능 최적화

| 최적화 | 설명 |
|--------|------|
| GPU 가속 레이어 | `will-change`, `transform: translateZ(0)` |
| 선택적 Store 구독 | 전체 store 대신 필요한 필드만 구독 |
| RAF 기반 크로스페이드 | CSS transition 대신 수동 opacity 제어 |
| 프레임 캐싱 | MJPEG HTMLImageElement[] 메모리 캐시 |

---

## 10. 관련 문서

- [BE WADO 구현 가이드](../../01_백엔드/02_가이드/31_DICOMWeb_WADO_구현_가이드.md)
- [Cornerstone3D Documentation](https://www.cornerstonejs.org/)
