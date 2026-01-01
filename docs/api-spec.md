# SADO API Specification

FE에서 필요한 API 엔드포인트 정의 문서

---

## 개요

### Base URL
```
VITE_API_BASE_URL=http://localhost:10200
```

### 공통 응답 형식

**성공 응답:**
```json
{
  "success": true,
  "data": { ... },
  "message": "optional message",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**페이지네이션 응답:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**에러 응답:**
```json
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "환자를 찾을 수 없습니다",
    "details": { "patientId": "PAT-999" }
  }
}
```

---

## 1. Patient API

### 1.1 환자 목록 조회
```http
GET /api/patients
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | No | 환자 이름 (부분 일치) |
| gender | "M" \| "F" | No | 성별 필터 |
| page | number | No | 페이지 번호 (default: 1) |
| limit | number | No | 페이지 크기 (default: 20) |

**Response:**
```typescript
interface PatientsResponse {
  success: true
  data: Patient[]
  pagination: Pagination
}

interface Patient {
  id: string                 // 내부 ID (PAT-001)
  dicomPatientId: string     // DICOM Patient ID
  name: string               // 환자 이름
  age: number                // 나이
  gender: 'M' | 'F'          // 성별
  issuer: string             // 발급 기관
  studiesCount: number       // Study 개수
  lastStudyDate: string      // 최근 Study 날짜 (YYYY-MM-DD)
}
```

**Example:**
```bash
curl "http://localhost:10200/api/patients?name=김&gender=M&page=1&limit=20"
```

### 1.2 환자 상세 조회
```http
GET /api/patients/:patientId
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| patientId | string | 환자 ID (PAT-001) |

**Response:**
```typescript
interface PatientDetailResponse {
  success: true
  data: Patient
}
```

---

## 2. Study API (DICOMWeb QIDO-RS)

### 2.1 Study 목록 조회
```http
GET /qido-rs/studies
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| PatientID | string | No | 환자 ID |
| PatientName | string | No | 환자 이름 (부분 일치) |
| StudyDate | string | No | 검사 날짜 (YYYYMMDD 또는 범위) |
| ModalitiesInStudy | string | No | Modality 필터 (CT, MR, XR, US) |
| page | number | No | 페이지 번호 |
| limit | number | No | 페이지 크기 |

**Response:**
```typescript
interface StudiesResponse {
  success: true
  data: Study[]
  pagination: Pagination
}

interface Study {
  id: string                    // 내부 ID (STU-001)
  studyInstanceUid: string      // DICOM Study Instance UID
  patientId: string             // 환자 ID
  patientName: string           // 환자 이름
  studyDate: string             // 검사 날짜 (YYYY-MM-DD)
  studyTime: string             // 검사 시간 (HH:mm:ss)
  modality: string              // Modality
  studyDescription: string      // Study 설명
  seriesCount: number           // Series 개수
  instancesCount: number        // Instance 개수
}
```

**Example:**
```bash
curl "http://localhost:10200/qido-rs/studies?PatientName=홍길동&ModalitiesInStudy=CT"
```

### 2.2 Study 상세 조회
```http
GET /api/studies/:studyId
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| studyId | string | Study ID (STU-001) |

**Response:**
```typescript
interface StudyDetailResponse {
  success: true
  data: Study
}
```

### 2.3 Study의 Series 목록 조회
```http
GET /qido-rs/studies/:studyId/series
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| studyId | string | Study ID (STU-001) |

**Response:**
```typescript
interface SeriesListResponse {
  success: true
  data: Series[]
}

interface Series {
  id: string                    // 내부 ID (SER-001)
  seriesInstanceUid: string     // DICOM Series Instance UID
  studyId: string               // Study ID
  seriesNumber: number          // Series 번호
  modality: string              // Modality
  seriesDescription: string     // Series 설명
  instancesCount: number        // Instance 개수
}
```

---

## 3. Instance API (DICOM Viewer)

### 3.1 Series 정보 조회
```http
GET /api/series/:seriesId
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| seriesId | string | Series ID (SER-001) |

**Response:**
```typescript
interface SeriesDetailResponse {
  success: true
  data: ViewerSeries
}

interface ViewerSeries {
  id: string
  seriesInstanceUid: string
  seriesNumber: number
  modality: string
  seriesDescription: string
  instancesCount: number
}
```

### 3.2 Series의 Instance 목록 조회
```http
GET /qido-rs/series/:seriesId/instances
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| seriesId | string | Series ID (SER-001) |

**Response:**
```typescript
interface InstancesResponse {
  success: true
  data: ViewerInstance[]
}

interface ViewerInstance {
  id: string
  sopInstanceUid: string
  seriesId: string
  studyId: string
  instanceNumber: number
  storageUri: string
  rows: number                      // 이미지 높이 (픽셀)
  columns: number                   // 이미지 너비 (픽셀)
  pixelSpacing: [number, number]    // 픽셀 간격 [행, 열]
}
```

---

## 4. Upload API (STOW-RS)

### 4.1 DICOM 파일 업로드
```http
POST /api/instances/upload
Content-Type: multipart/form-data
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | DICOM 파일 (.dcm) |

**Response:**
```typescript
interface UploadResponse {
  success: boolean
  message: string
  instanceId?: string           // 생성된 Instance ID
  studyInstanceUid?: string     // Study Instance UID
  seriesInstanceUid?: string    // Series Instance UID
  sopInstanceUid?: string       // SOP Instance UID
  error?: string                // 에러 메시지 (실패 시)
}
```

**Example:**
```bash
curl -X POST "http://localhost:10200/api/instances/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/dicom.dcm"
```

---

## 5. WADO-RS API (이미지 조회)

### 5.1 DICOM 이미지 조회 (Week 6+)
```http
GET /wado-rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances/:sopInstanceUid
Accept: application/dicom
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| studyInstanceUid | string | Study Instance UID |
| seriesInstanceUid | string | Series Instance UID |
| sopInstanceUid | string | SOP Instance UID |

**Response:**
- Content-Type: `application/dicom`
- Body: DICOM 바이너리 데이터

### 5.2 렌더링된 이미지 조회 (Week 6+)
```http
GET /wado-rs/studies/:studyInstanceUid/series/:seriesInstanceUid/instances/:sopInstanceUid/rendered
Accept: image/png
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| window | string | No | Window Center/Width (예: 40/400) |
| viewport | string | No | 렌더링 크기 (예: 512/512) |

**Response:**
- Content-Type: `image/png`
- Body: PNG 이미지 데이터

---

## 에러 코드

| Code | HTTP Status | Description |
|------|-------------|-------------|
| PATIENT_NOT_FOUND | 404 | 환자를 찾을 수 없음 |
| STUDY_NOT_FOUND | 404 | Study를 찾을 수 없음 |
| SERIES_NOT_FOUND | 404 | Series를 찾을 수 없음 |
| INSTANCE_NOT_FOUND | 404 | Instance를 찾을 수 없음 |
| INVALID_DICOM | 400 | 유효하지 않은 DICOM 파일 |
| UPLOAD_FAILED | 500 | 업로드 처리 실패 |
| STORAGE_ERROR | 500 | 저장소 오류 |
| NETWORK_ERROR | 0 | 네트워크 연결 실패 |
| TIMEOUT | 408 | 요청 시간 초과 |
| UNAUTHORIZED | 401 | 인증 필요 |
| FORBIDDEN | 403 | 접근 권한 없음 |
| INTERNAL_ERROR | 500 | 서버 내부 오류 |

---

## FE 서비스 레이어 매핑

| FE Service Function | API Endpoint |
|---------------------|--------------|
| `fetchPatients()` | GET /api/patients |
| `fetchPatientById()` | GET /api/patients/:id |
| `fetchStudies()` | GET /qido-rs/studies |
| `fetchStudyById()` | GET /api/studies/:id |
| `fetchSeriesByStudyId()` | GET /qido-rs/studies/:id/series |
| `fetchSeriesById()` | GET /api/series/:id |
| `fetchInstancesBySeriesId()` | GET /qido-rs/series/:id/instances |
| `uploadDicomFile()` | POST /api/instances/upload |

---

## 환경 변수

```env
# API 서버 주소
VITE_API_BASE_URL=http://localhost:10200

# Mock 사용 여부 (true: Mock 사용, false: 실제 API 사용)
VITE_USE_MOCK=true
```

---

## 개발 우선순위

### Week 6 (BE MVP)
1. `GET /api/patients` - 환자 목록
2. `GET /qido-rs/studies` - Study 목록
3. `POST /api/instances/upload` - DICOM 업로드

### Week 7 (기능 확장)
4. `GET /qido-rs/studies/:id/series` - Series 목록
5. `GET /qido-rs/series/:id/instances` - Instance 목록
6. `GET /api/patients/:id` - 환자 상세

### Week 8+ (Viewer 연동)
7. WADO-RS 엔드포인트
8. Cornerstone3D 통합
