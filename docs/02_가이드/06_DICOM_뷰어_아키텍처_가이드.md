# DICOM 뷰어 아키텍처 가이드

> **최종 업데이트**: 2026-01-16
> **버전**: 2.0
> **상태**: 구현 완료

---

## 1. 개요

sado_fe 프로젝트는 **5개의 독립적인 DICOM 뷰어 파이프라인**을 구현하고 있습니다. 각 뷰어는 서로 다른 API와 렌더링 방식을 사용하며, 특정 사용 사례에 최적화되어 있습니다.

### 1.1 뷰어 비교표

| 뷰어 | API | 렌더링 | 초기 로딩 | 품질 | 사용 사례 |
|------|-----|--------|----------|------|----------|
| **WADO-RS Rendered** | Pre-rendered PNG/JPEG | Cornerstone | 1-2초 | 최고 | 진단용 (고속) |
| **WADO-RS BulkData** | 원본 DICOM | Cornerstone | 2-5초 | 진단용 | 원본 보존 필요 |
| **MJPEG** | MJPEG Stream | Canvas | ~100ms | 중간 | 빠른 스크리닝 |
| **Hybrid (MJPEG+WADO-RS)** | 하이브리드 | 듀얼 | ~100ms → 고품질 | 최고 | 빠른 재생 + 고품질 |
| **WADO-URI** | WADO-URI 표준 | Cornerstone | 1-3초 | 고 | 외부 PACS 연동 |

---

## 2. 뷰어 모듈 구조

```
src/features/
├── dicom-viewer/                    # WADO-RS Rendered (기본)
├── dicom-viewer-wado-rs-bulkdata/   # WADO-RS BulkData
├── dicom-viewer-mjpeg/              # MJPEG Streaming
├── dicom-viewer-mjpeg-wado-rs/      # Hybrid (MJPEG + WADO-RS)
├── dicom-viewer-wado-uri/           # WADO-URI
└── dicom-viewer-shared/             # 공유 컴포넌트
```

---

## 3. 뷰어 상세 설명

### 3.1 WADO-RS Rendered 뷰어 (dicom-viewer)

**경로**: `/viewer/wado-rs-rendered/:studyInstanceUid/:seriesInstanceUid`

**특징**:
- 서버에서 Pre-rendered PNG/JPEG 이미지 제공
- Progressive Playback: 초기 20프레임 로드 후 즉시 재생
- GPU 텍스처 웜업으로 첫 렌더링 깜빡임 방지

**핵심 컴포넌트**:
```
dicom-viewer/
├── components/
│   ├── CornerstoneMultiViewer.tsx    # 멀티슬롯 컨테이너
│   ├── CornerstoneSlot.tsx            # 개별 슬롯
│   ├── CornerstoneSlotControls.tsx    # 슬롯별 컨트롤
│   ├── CornerstoneSlotOverlay.tsx     # 정보 오버레이
│   ├── CornerstoneGlobalControls.tsx  # 글로벌 설정
│   ├── InstanceSidebar.tsx            # 인스턴스 목록
│   └── ViewerToolbar.tsx              # 도구 모음
├── stores/
│   └── cornerstoneMultiViewerStore.ts # Zustand 상태관리
└── utils/
    ├── cineAnimationManager.ts        # 재생 애니메이션
    └── wadoRsRenderedLoader.ts        # 이미지 로더
```

**Store 핵심 상태**:
```typescript
interface CornerstoneMultiViewerState {
  layout: GridLayout;           // '1x1' | '2x2' | '3x2' | '3x3'
  globalFps: number;            // 1-120
  globalResolution: number;     // 512/256/128/64/32
  slots: Record<number, SlotState>;
  renderingMode: 'cpu' | 'gpu';
}
```

---

### 3.2 WADO-RS BulkData 뷰어 (dicom-viewer-wado-rs-bulkdata)

**경로**: `/viewer/wado-rs/:studyInstanceUid/:seriesInstanceUid`

**특징**:
- 원본 Transfer Syntax 보존 (JPEG2000, JPEG-LS 등)
- CPU/GPU 디코딩 지원
- Idle Decode Scheduler: 유휴시간 자동 디코딩

**핵심 컴포넌트**:
```
dicom-viewer-wado-rs-bulkdata/
├── components/
│   ├── WadoRsBulkDataSlot.tsx         # 슬롯 컴포넌트
│   ├── WadoRsBulkDataSlotOverlay.tsx  # 오버레이
│   └── FormatSelectorPanel.tsx        # 포맷 선택
├── stores/
│   └── wadoRsBulkDataMultiViewerStore.ts
└── utils/
    ├── frameDecoder.ts                # 프레임 디코딩
    ├── idleDecodeScheduler.ts         # 유휴시간 스케줄러
    └── preDecodeManager.ts            # 사전 디코딩
```

---

### 3.3 MJPEG 뷰어 (dicom-viewer-mjpeg)

**경로**: `/viewer/mjpeg`

**특징**:
- ~100ms 즉시 재생
- Canvas 기반 렌더링 (Cornerstone 불필요)
- 클라이언트 사이드 JPEG 캐싱
- 최대 16개 슬롯 동시 재생

**핵심 컴포넌트**:
```
dicom-viewer-mjpeg/
├── components/
│   ├── MjpegMultiViewer.tsx           # 멀티슬롯 컨테이너
│   ├── MjpegSlot.tsx                  # Canvas 슬롯
│   ├── MjpegControls.tsx              # 컨트롤
│   └── MjpegInstanceSidebar.tsx       # 사이드바
├── stores/
│   └── mjpegMultiViewerStore.ts
└── utils/
    ├── mjpegUrlBuilder.ts             # URL 생성
    ├── cineFramesApi.ts               # Cine Frames API
    └── CineFramesLoadingManager.ts    # 로딩 관리
```

**API 연동**:
```typescript
// Cine Frames API
GET /dicomweb/cine-frames/{sopInstanceUID}?resolution=256

// 응답
{
  "sopInstanceUid": "1.2.3...",
  "numberOfFrames": 50,
  "resolution": 256,
  "frames": ["base64...", "base64...", ...]
}
```

---

### 3.4 Hybrid 뷰어 (dicom-viewer-mjpeg-wado-rs)

**경로**: `/viewer/mjpeg-wado-rs/:studyInstanceUid/:seriesInstanceUid`

**특징**:
- MJPEG로 즉시 재생 (~100ms)
- Cornerstone 백그라운드 프리로드
- 루프 경계에서 자연스러운 전환 (크로스페이드)
- useRef DOM 직접 조작으로 전환 최적화

**핵심 컴포넌트**:
```
dicom-viewer-mjpeg-wado-rs/
├── components/
│   ├── HybridMultiViewer.tsx          # 하이브리드 컨테이너
│   ├── HybridSlot.tsx                 # 듀얼 렌더링 슬롯
│   ├── HybridControls.tsx             # 컨트롤
│   ├── HybridInstanceSidebar.tsx      # 사이드바
│   ├── HybridSlotOverlay.tsx          # 오버레이
│   └── layers/
│       ├── MjpegLayer.tsx             # MJPEG 레이어 (즉시 재생)
│       └── CornerstoneLayer.tsx       # Cornerstone 레이어 (백그라운드)
├── stores/
│   └── hybridMultiViewerStore.ts
└── utils/
    ├── hybridPreloadManager.ts        # MJPEG 프리로드
    ├── cornerstonePreloadQueue.ts     # Cornerstone 프리로드 큐
    ├── HybridCineAnimationManager.ts  # 재생 관리
    └── hybridMetadataProvider.ts      # 메타데이터
```

**전환 흐름**:
```
1. MJPEG 즉시 재생 시작 (~100ms)
2. Cornerstone 백그라운드 프리로드
3. 프리로드 완료 → pendingTransition = true
4. MJPEG 루프 경계 감지 (frame=0)
5. 크로스페이드 전환 (200ms)
6. Cornerstone 활성화 (W/L 조정, 측정 도구 사용 가능)
```

**Phase 상태 머신**:
```typescript
type TransitionPhase =
  | 'idle'               // 초기 상태
  | 'mjpeg-loading'      // MJPEG 캐시 로딩 중
  | 'mjpeg-playing'      // MJPEG 재생 중
  | 'transition-prepare' // 전환 준비 (MJPEG freeze)
  | 'transitioning'      // 크로스페이드 진행 중
  | 'cornerstone';       // Cornerstone 활성화
```

---

### 3.5 WADO-URI 뷰어 (dicom-viewer-wado-uri)

**경로**: `/viewer/wado-uri/:studyInstanceUid/:seriesInstanceUid`

**특징**:
- WADO-URI 표준 (외부 PACS 호환)
- 일반적인 PACS 연동에 사용

**핵심 컴포넌트**:
```
dicom-viewer-wado-uri/
├── components/
│   ├── WadoUriSlot.tsx
│   └── WadoUriSlotOverlay.tsx
├── stores/
│   └── wadoUriMultiViewerStore.ts
└── utils/
    ├── wadoUriImageIdHelper.ts
    └── wadoUriCineAnimationManager.ts
```

---

## 4. 공유 컴포넌트 (dicom-viewer-shared)

모든 뷰어에서 공유하는 컴포넌트와 유틸리티:

```
dicom-viewer-shared/
├── components/
│   ├── BaseViewerLayout.tsx    # 공유 레이아웃
│   ├── ViewerHeader.tsx        # 공유 헤더
│   ├── ViewerGrid.tsx          # 그리드 렌더링
│   └── InstanceSidebar.tsx     # 공유 사이드바
├── hooks/
│   └── useViewerPage.ts        # 뷰어 페이지 공유 로직
└── types/
    └── viewerTypes.ts          # 공유 타입
```

---

## 5. 라우팅 구조

```typescript
// app/Router.tsx
<Routes>
  {/* DICOM 뷰어 (풀스크린) */}
  <Route path="/viewer/wado-rs-rendered/:studyInstanceUid/:seriesInstanceUid"
         element={<DicomViewerPage />} />
  <Route path="/viewer/wado-rs/:studyInstanceUid/:seriesInstanceUid"
         element={<WadoRsViewerPage />} />
  <Route path="/viewer/wado-uri/:studyInstanceUid/:seriesInstanceUid"
         element={<WadoUriViewerPage />} />
  <Route path="/viewer/mjpeg"
         element={<MjpegViewerPage />} />
  <Route path="/viewer/mjpeg-wado-rs/:studyInstanceUid/:seriesInstanceUid"
         element={<MjpegWadoRsViewerPage />} />
</Routes>
```

---

## 6. 상태 관리 패턴

모든 뷰어는 **독립적인 Zustand Store**를 사용합니다:

```typescript
// 공통 Store 패턴
interface ViewerStore {
  // 레이아웃
  layout: GridLayout;
  setLayout: (layout: GridLayout) => void;

  // 글로벌 설정
  globalFps: number;
  setGlobalFps: (fps: number) => void;

  // 슬롯 관리
  slots: Record<number, SlotState>;
  assignInstanceToSlot: (slotId: number, instance: Instance) => void;
  clearSlot: (slotId: number) => void;
  clearAllSlots: () => void;

  // 재생 제어
  playSlot: (slotId: number) => void;
  pauseSlot: (slotId: number) => void;
  playAll: () => void;
  pauseAll: () => void;
}
```

**SessionStorage 영속화**:
```typescript
// Zustand persist 미들웨어
export const useViewerStore = create<ViewerStore>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'viewer-settings',
      partialize: (state) => ({
        layout: state.layout,
        globalFps: state.globalFps,
        // instance 데이터는 영속화하지 않음
      }),
    }
  )
);
```

---

## 7. 성능 최적화 기법

### 7.1 Progressive Playback (WADO-RS Rendered)
- 초기 20프레임 로드 후 즉시 재생 시작
- 나머지 프레임은 백그라운드에서 로드
- 버퍼링 상태 UI 표시

### 7.2 Idle Decode Scheduler (WADO-RS BulkData)
- requestIdleCallback으로 유휴시간에 디코딩
- 메인 스레드 블로킹 방지

### 7.3 Preload Queue (Hybrid)
- 한 번에 1개 슬롯만 프리로드
- 슬롯 번호 순서로 우선순위 부여
- MJPEG 재생에 리소스 양보

### 7.4 DOM 직접 조작 크로스페이드 (Hybrid)
- useRef로 DOM 직접 조작
- React 리렌더 없이 opacity 애니메이션
- requestAnimationFrame 기반

### 7.5 GPU 가속 레이어 분리
```typescript
const GPU_ACCELERATED_STYLE: React.CSSProperties = {
  willChange: 'opacity, transform',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
};
```

---

## 8. API 연동

### 8.1 DICOMWeb API

```typescript
// QIDO-RS - 인스턴스 검색
GET /dicomweb/studies/{studyUID}/series/{seriesUID}/instances

// WADO-RS - 이미지 조회
GET /dicomweb/studies/{studyUID}/series/{seriesUID}/instances/{sopUID}

// WADO-RS Rendered - 렌더링된 프레임
GET /dicomweb/studies/{studyUID}/series/{seriesUID}/instances/{sopUID}/rendered

// WADO-RS Frames - 특정 프레임
GET /dicomweb/studies/{studyUID}/series/{seriesUID}/instances/{sopUID}/frames/{frameNumber}
```

### 8.2 Cine Frames API

```typescript
// 모든 프레임 일괄 조회 (MJPEG용)
GET /dicomweb/cine-frames/{sopInstanceUID}?resolution=256

// 프레임 정보 조회
GET /dicomweb/cine-frames/{sopInstanceUID}/info
```

---

## 9. 뷰어 선택 가이드

| 사용 사례 | 권장 뷰어 | 이유 |
|----------|----------|------|
| 일반 진단 (고속) | WADO-RS Rendered | 최고 품질, 빠른 로딩 |
| 원본 보존 필요 | WADO-RS BulkData | 원본 Transfer Syntax 유지 |
| 빠른 스크리닝 | MJPEG | 즉시 재생, 낮은 리소스 |
| 빠른 재생 + 고품질 | Hybrid | 즉시 재생 후 고품질 전환 |
| 외부 PACS 연동 | WADO-URI | 표준 호환성 |

---

## 10. 기술 스택

| 기술 | 버전 | 용도 |
|-----|------|-----|
| **Cornerstone.js Core** | 4.12.6 | DICOM 렌더링 엔진 |
| **Cornerstone Tools** | 4.12.6 | W/L, Pan, Zoom 도구 |
| **Cornerstone DICOM Loader** | 4.12.6 | DICOM 이미지 로더 |
| **Zustand** | 5.0.9 | 상태 관리 |
| **React** | 19.2.0 | UI 프레임워크 |

---

## 11. 관련 문서

- [BE DICOMWeb API 설계](../../01_백엔드/02_가이드/13-4_DICOMWeb_API_설계.md)
- [상태 관리 전략](03_상태_관리_전략.md)
- [컴포넌트 아키텍처](04_컴포넌트_아키텍처.md)

---

*최종 수정: 2026-01-16*
