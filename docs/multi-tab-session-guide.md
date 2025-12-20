# 다중 탭 세션 관리 시스템 완전 정복

**React + TypeScript 기반 브라우저 다중 탭 동기화 마스터 가이드**

---

## 📚 목차

- [들어가며](#들어가며)
- [Chapter 0: 사전 준비 및 핵심 개념 이해](#chapter-0-사전-준비-및-핵심-개념-이해)
- [Chapter 1: Storage 레이어 구축](#chapter-1-storage-레이어-구축)
- [Chapter 2: BroadcastChannel 통신 시스템](#chapter-2-broadcastchannel-통신-시스템)
- [Chapter 3: 하이브리드 스토리지 전략](#chapter-3-하이브리드-스토리지-전략)
- [Chapter 4: 탭 생명주기 관리 - PING/PONG](#chapter-4-탭-생명주기-관리---pingpong)
- [Chapter 5: 인증 동기화 시스템](#chapter-5-인증-동기화-시스템)
- [Chapter 6: UI 컴포넌트 구현](#chapter-6-ui-컴포넌트-구현)
- [Chapter 7: 고급 기능 - 완전 종료 감지](#chapter-7-고급-기능---완전-종료-감지)
- [Chapter 8: 최적화, 디버깅, 테스트](#chapter-8-최적화-디버깅-테스트)
- [마무리](#마무리)

---

## 들어가며

### 이 가이드에서 배울 내용

이 가이드는 **BroadcastChannel API와 Web Storage API를 활용한 다중 탭 세션 관리 시스템**을 처음부터 끝까지 직접 구현하면서 학습할 수 있도록 설계되었습니다.

**학습 목표**:
- ✅ localStorage와 sessionStorage의 차이점과 조합 활용법
- ✅ BroadcastChannel API를 활용한 탭 간 실시간 통신
- ✅ 새 탭과 새로고침을 구분하는 메커니즘
- ✅ PING/PONG 패턴으로 탭 생명주기 관리
- ✅ React Hooks와 Context API로 전역 상태 관리
- ✅ TypeScript로 타입 안전한 시스템 구축

### 이 가이드의 특징

1. **완전한 코드 예제**: 모든 코드는 복사-붙여넣기 후 바로 실행 가능합니다.
2. **점진적 학습**: 기초부터 고급까지 단계별로 구현합니다.
3. **실전 중심**: 실제 프로젝트에 바로 적용 가능한 패턴을 사용합니다.
4. **체계적 검증**: 각 챕터마다 체크포인트를 제공하여 진도를 확인할 수 있습니다.

### 사전 요구사항

**필수 지식**:
- React 기본 (Hooks, Context API)
- TypeScript 기본 (interface, type, generic)
- JavaScript ES6+ (async/await, Promise, class)

**개발 환경**:
- Node.js 18+
- React 19.2+
- TypeScript 5.9+
- Vite 7.2+

### 학습 로드맵

```
⭐ 기초
  └─ Chapter 0: 핵심 개념 이해
  └─ Chapter 1: Storage 레이어

⭐⭐ 초급
  └─ Chapter 2: BroadcastChannel 통신

⭐⭐⭐ 중급
  └─ Chapter 3: 하이브리드 스토리지
  └─ Chapter 6: UI 컴포넌트

⭐⭐⭐⭐ 고급
  └─ Chapter 4: 탭 생명주기 (PING/PONG)
  └─ Chapter 5: 인증 동기화
  └─ Chapter 8: 최적화 & 디버깅

⭐⭐⭐⭐⭐ 최고급
  └─ Chapter 7: 완전 종료 감지
```

---

## Chapter 0: 사전 준비 및 핵심 개념 이해

**난이도**: ⭐ 기초
**예상 학습 시간**: 1-2시간

### 0.1 Web Storage API 기초

#### localStorage vs sessionStorage

**localStorage**:
- **스코프**: 동일 origin의 모든 탭/창이 공유
- **생명주기**: 명시적으로 삭제하지 않으면 영구 보존
- **용량**: 약 5-10MB (브라우저마다 다름)
- **사용 사례**: 사용자 설정, 테마, 로그인 토큰

**sessionStorage**:
- **스코프**: 탭/창별로 독립적
- **생명주기**: 탭을 닫으면 자동 삭제, **새로고침 시에는 유지**
- **용량**: 약 5-10MB
- **사용 사례**: 탭별 임시 데이터, 탭 ID, 폼 입력 중인 데이터

**핵심 인사이트**:
```
새 탭 (Ctrl+T):
  localStorage: 공유됨 ✓
  sessionStorage: 비어있음 ✗

새로고침 (F5):
  localStorage: 유지됨 ✓
  sessionStorage: 유지됨 ✓ (중요!)
```

이 차이점을 활용하면 **새 탭과 새로고침을 구분**할 수 있습니다!

#### 브라우저 콘솔 실습

```javascript
// 1. localStorage 테스트
localStorage.setItem('shared_data', 'Hello from Tab A');
// 새 탭 열어서 확인:
console.log(localStorage.getItem('shared_data')); // "Hello from Tab A" ✓

// 2. sessionStorage 테스트
sessionStorage.setItem('tab_data', 'Tab A only');
// 새 탭 열어서 확인:
console.log(sessionStorage.getItem('tab_data')); // null ✗

// 3. 새로고침 후:
console.log(sessionStorage.getItem('tab_data')); // "Tab A only" ✓
```

### 0.2 BroadcastChannel API

#### What (무엇을)

BroadcastChannel은 **동일 origin의 여러 브라우징 컨텍스트(탭, iframe, 워커) 간에 메시지를 주고받을 수 있는 API**입니다.

#### Why (왜)

localStorage events는 제한이 많습니다:
- 자기 자신에게는 이벤트가 발생하지 않음
- setItem()만 감지 가능 (removeItem 감지 불가)
- 데이터 크기 제한

BroadcastChannel은:
- ✅ 자기 자신 포함 모든 탭에 전송 가능
- ✅ 복잡한 객체 전송 가능
- ✅ 타입 안전한 프로토콜 설계 가능

#### How (어떻게)

```javascript
// 탭 A
const channel = new BroadcastChannel('my-channel');

channel.onmessage = (event) => {
  console.log('Received:', event.data);
};

channel.postMessage({ type: 'HELLO', payload: 'World' });
channel.postMessage('Simple string');

// 탭 B (동일한 채널명)
const channel = new BroadcastChannel('my-channel');

channel.onmessage = (event) => {
  console.log('Tab B received:', event.data);
  // 탭 A의 메시지를 받을 수 있음!
};
```

**브라우저 호환성**:
- Chrome 54+
- Firefox 38+
- Safari 15.4+
- Edge 79+

구형 브라우저를 위해 localStorage events를 폴백으로 사용할 수 있습니다.

### 0.3 다중 탭 동기화 시나리오

#### 시나리오 1: 로그인 상태 동기화

**요구사항**:
- 탭 A에서 로그인 → 탭 B, C, D 모두 자동 로그인
- 탭 A에서 로그아웃 → 모든 탭 자동 로그아웃
- 새 탭 열기 → 기존 로그인 상태 유지

**해결 방법**:
1. 로그인 토큰을 localStorage에 저장 (모든 탭 공유)
2. BroadcastChannel로 LOGIN/LOGOUT 메시지 전송
3. 새 탭은 localStorage에서 토큰 읽어서 자동 로그인

#### 시나리오 2: 새 탭 vs 새로고침 구분

**문제**:
```
사용자가 모든 탭을 닫음
→ localStorage에 토큰 남아있음
→ 새 탭 열기
→ 자동 로그인? (❌ 원하지 않음)
```

**해결 방법**:
```javascript
// sessionStorage에 탭 ID 확인
const existingTabId = sessionStorage.getItem('tab_id');

if (existingTabId) {
  // 새로고침: sessionStorage가 유지됨
  console.log('Page refresh');
} else {
  // 새 탭: sessionStorage가 비어있음
  console.log('New tab');
}
```

#### 시나리오 3: 모든 탭 닫힘 감지

**문제**:
마지막 탭을 닫을 때 로그아웃 처리해야 하는데, 어떻게 감지할까?

**해결 방법**: PING/PONG 메커니즘 (Chapter 4에서 자세히)

### 0.4 Hybrid Storage 전략

**핵심 아이디어**:
```
localStorage: 모든 탭이 공유하는 데이터
  - 인증 토큰
  - 사용자 정보
  - 활성 탭 카운트

sessionStorage: 탭별 독립 데이터
  - 탭 고유 ID
  - 탭별 임시 상태
```

**동작 플로우**:
```
새 탭 열기:
1. sessionStorage에 tab_id 없음 → 새 탭 확인
2. localStorage에서 토큰 읽기
3. sessionStorage에 새로운 tab_id 저장
4. 토큰 있으면 자동 로그인

새로고침:
1. sessionStorage에 tab_id 있음 → 새로고침 확인
2. 기존 tab_id 그대로 사용
3. 상태 유지
```

### 0.5 PING/PONG 메커니즘

#### What (무엇을)

PING/PONG은 **탭이 주기적으로 "살아있음"을 알리는 heartbeat 패턴**입니다.

#### Why (왜)

```
문제 상황:
1. 탭 A, B에서 로그인
2. 모든 탭 닫기
3. localStorage에 토큰 여전히 존재
4. 새 탭 C 열기
5. localStorage에서 토큰 발견
6. 자동 로그인 ❌ (원하지 않음!)

해결:
"다른 탭이 살아있는가?"를 확인해야 함
```

#### How (어떻게)

```
탭 A 시작:
1. PING 메시지 브로드캐스트 (5초마다)
2. 다른 탭의 PONG 수신
3. 활성 탭 목록 업데이트

탭 B 시작:
1. 탭 A의 PING 수신
2. PONG 응답 전송
3. 탭 A를 활성 목록에 추가

탭 C (새 탭):
1. PING 전송
2. 500ms 대기
3. PONG 응답 확인
4. 응답 없으면 → 모든 탭 닫혔다 판단
5. localStorage 토큰 삭제
```

### 0.6 브라우저 콘솔 실습

다음 코드를 브라우저 콘솔에서 직접 실행해보세요:

```javascript
// 실습 1: Storage 차이점
console.log('=== Storage 실습 ===');
localStorage.setItem('test_local', 'shared');
sessionStorage.setItem('test_session', 'isolated');

// 새 탭 열어서 확인:
// localStorage.getItem('test_local'); // "shared" ✓
// sessionStorage.getItem('test_session'); // null ✗

// 실습 2: BroadcastChannel
console.log('=== BroadcastChannel 실습 ===');
const channel = new BroadcastChannel('test-channel');

channel.onmessage = (e) => {
  console.log('[Received]', e.data);
};

channel.postMessage({ type: 'TEST', time: Date.now() });

// 새 탭에서 동일한 코드 실행하면 메시지 교환 확인 가능!

// 실습 3: 새 탭 vs 새로고침
console.log('=== 새 탭 감지 실습 ===');
const tabId = sessionStorage.getItem('my_tab_id');

if (tabId) {
  console.log('새로고침! 기존 ID:', tabId);
} else {
  const newId = 'tab_' + Date.now();
  sessionStorage.setItem('my_tab_id', newId);
  console.log('새 탭! 새 ID:', newId);
}
```

### 체크포인트 ✅

- [ ] localStorage와 sessionStorage의 차이 3가지 설명 가능
- [ ] BroadcastChannel로 탭 간 메시지 송수신 성공
- [ ] 새 탭과 새로고침 시 sessionStorage 동작 차이 확인
- [ ] PING/PONG이 필요한 이유 이해
- [ ] 브라우저 콘솔 실습 모두 완료

---

## Chapter 1: Storage 레이어 구축

**난이도**: ⭐⭐ 초급
**예상 학습 시간**: 2-3시간

### 1.1 타입 정의

먼저 타입 안전한 Storage 인터페이스를 정의합니다.

**파일**: `src/utils/storage/types.ts`

```typescript
/**
 * Storage 어댑터 인터페이스
 *
 * localStorage와 sessionStorage에 대한 추상화 레이어를 제공합니다.
 * Generic을 사용하여 타입 안전성을 보장합니다.
 */
export interface StorageAdapter {
  /**
   * 값 조회
   * @param key - 저장소 키
   * @returns 저장된 값 (없으면 null)
   */
  getItem<T = string>(key: string): T | null;

  /**
   * 값 저장
   * @param key - 저장소 키
   * @param value - 저장할 값 (자동으로 JSON 직렬화)
   * @returns 성공 여부
   */
  setItem<T = unknown>(key: string, value: T): boolean;

  /**
   * 값 삭제
   * @param key - 저장소 키
   */
  removeItem(key: string): void;

  /**
   * 모든 값 삭제
   */
  clear(): void;

  /**
   * 모든 키 목록
   */
  keys(): string[];
}

/**
 * Storage 에러 타입
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code: 'QUOTA_EXCEEDED' | 'PARSE_ERROR' | 'ACCESS_DENIED'
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
```

### 1.2 LocalStorageAdapter 구현

**파일**: `src/utils/storage/LocalStorageAdapter.ts`

```typescript
import { StorageAdapter, StorageError } from './types';

/**
 * localStorage 어댑터
 *
 * 특징:
 * - 모든 탭이 공유
 * - 영구 저장 (명시적 삭제 전까지)
 * - 약 5-10MB 용량
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;

  /**
   * @param prefix - 키 접두사 (네임스페이스)
   */
  constructor(prefix: string = 'app') {
    this.prefix = prefix;
  }

  /**
   * 실제 저장소 키 생성
   * @param key - 논리적 키
   * @returns 접두사가 붙은 실제 키
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * 값 조회
   *
   * @example
   * const user = storage.getItem<User>('user');
   * if (user) {
   *   console.log(user.name);
   * }
   */
  getItem<T = string>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key));

      if (item === null) {
        return null;
      }

      // JSON 파싱 시도
      try {
        return JSON.parse(item) as T;
      } catch {
        // 파싱 실패 시 문자열로 반환
        return item as T;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'SecurityError') {
        throw new StorageError(
          'Storage access denied (private mode?)',
          'ACCESS_DENIED'
        );
      }
      console.error('[LocalStorage] getItem error:', error);
      return null;
    }
  }

  /**
   * 값 저장
   *
   * @example
   * storage.setItem('user', { id: 1, name: 'Alice' });
   * storage.setItem('count', 42);
   */
  setItem<T = unknown>(key: string, value: T): boolean {
    try {
      const serialized = typeof value === 'string'
        ? value
        : JSON.stringify(value);

      localStorage.setItem(this.getKey(key), serialized);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageError(
          'Storage quota exceeded',
          'QUOTA_EXCEEDED'
        );
      }
      console.error('[LocalStorage] setItem error:', error);
      return false;
    }
  }

  /**
   * 값 삭제
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('[LocalStorage] removeItem error:', error);
    }
  }

  /**
   * 모든 값 삭제 (해당 prefix만)
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix + ':')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[LocalStorage] clear error:', error);
    }
  }

  /**
   * 모든 키 목록 (prefix 제거된 논리적 키)
   */
  keys(): string[] {
    const keys: string[] = [];
    const prefixLength = this.prefix.length + 1;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix + ':')) {
          keys.push(key.substring(prefixLength));
        }
      }
    } catch (error) {
      console.error('[LocalStorage] keys error:', error);
    }

    return keys;
  }
}
```

### 1.3 SessionStorageAdapter 구현

**파일**: `src/utils/storage/SessionStorageAdapter.ts`

```typescript
import { StorageAdapter, StorageError } from './types';

/**
 * sessionStorage 어댑터
 *
 * 특징:
 * - 탭별로 독립적
 * - 새로고침 시 유지, 탭 닫으면 삭제
 * - 약 5-10MB 용량
 */
export class SessionStorageAdapter implements StorageAdapter {
  private readonly prefix: string;

  constructor(prefix: string = 'app') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  getItem<T = string>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(this.getKey(key));

      if (item === null) {
        return null;
      }

      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'SecurityError') {
        throw new StorageError(
          'Storage access denied (private mode?)',
          'ACCESS_DENIED'
        );
      }
      console.error('[SessionStorage] getItem error:', error);
      return null;
    }
  }

  setItem<T = unknown>(key: string, value: T): boolean {
    try {
      const serialized = typeof value === 'string'
        ? value
        : JSON.stringify(value);

      sessionStorage.setItem(this.getKey(key), serialized);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageError(
          'Storage quota exceeded',
          'QUOTA_EXCEEDED'
        );
      }
      console.error('[SessionStorage] setItem error:', error);
      return false;
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('[SessionStorage] removeItem error:', error);
    }
  }

  clear(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.prefix + ':')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.error('[SessionStorage] clear error:', error);
    }
  }

  keys(): string[] {
    const keys: string[] = [];
    const prefixLength = this.prefix.length + 1;

    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.prefix + ':')) {
          keys.push(key.substring(prefixLength));
        }
      }
    } catch (error) {
      console.error('[SessionStorage] keys error:', error);
    }

    return keys;
  }
}
```

### 1.4 Export

**파일**: `src/utils/storage/index.ts`

```typescript
export * from './types';
export * from './LocalStorageAdapter';
export * from './SessionStorageAdapter';
```

### 1.5 테스트 컴포넌트

Storage 레이어가 제대로 작동하는지 확인하는 간단한 컴포넌트를 만들어봅시다.

**파일**: `src/components/StorageTest.tsx` (테스트 후 삭제 가능)

```typescript
import { useState } from 'react';
import { LocalStorageAdapter, SessionStorageAdapter } from '@/utils/storage';

const localStorage = new LocalStorageAdapter('test');
const sessionStorage = new SessionStorageAdapter('test');

interface User {
  id: number;
  name: string;
}

export function StorageTest() {
  const [localValue, setLocalValue] = useState<User | null>(null);
  const [sessionValue, setSessionValue] = useState<User | null>(null);

  const testLocalStorage = () => {
    // 저장
    const user: User = { id: 1, name: 'Alice' };
    localStorage.setItem('user', user);
    console.log('✅ LocalStorage 저장:', user);

    // 조회
    const retrieved = localStorage.getItem<User>('user');
    setLocalValue(retrieved);
    console.log('✅ LocalStorage 조회:', retrieved);

    // 새 탭에서도 확인 가능!
    console.log('💡 새 탭 열어서 localStorage.getItem<User>("user") 확인!');
  };

  const testSessionStorage = () => {
    // 저장
    const user: User = { id: 2, name: 'Bob' };
    sessionStorage.setItem('user', user);
    console.log('✅ SessionStorage 저장:', user);

    // 조회
    const retrieved = sessionStorage.getItem<User>('user');
    setSessionValue(retrieved);
    console.log('✅ SessionStorage 조회:', retrieved);

    // 새 탭에서는 없음!
    console.log('💡 새 탭 열어서 sessionStorage.getItem<User>("user") 확인! (null이어야 함)');
  };

  const clearAll = () => {
    localStorage.clear();
    sessionStorage.clear();
    setLocalValue(null);
    setSessionValue(null);
    console.log('🗑️ 모두 삭제됨');
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Storage 테스트</h2>

      <div className="space-y-2">
        <button
          onClick={testLocalStorage}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          LocalStorage 테스트
        </button>
        {localValue && (
          <div className="p-2 bg-blue-100 rounded">
            LocalStorage: {JSON.stringify(localValue)}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          onClick={testSessionStorage}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          SessionStorage 테스트
        </button>
        {sessionValue && (
          <div className="p-2 bg-green-100 rounded">
            SessionStorage: {JSON.stringify(sessionValue)}
          </div>
        )}
      </div>

      <button
        onClick={clearAll}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        모두 삭제
      </button>

      <div className="text-sm text-gray-600">
        <p>💡 콘솔을 열어서 로그를 확인하세요!</p>
        <p>💡 새 탭을 열어서 차이를 확인하세요!</p>
      </div>
    </div>
  );
}
```

### 1.6 사용 예제

```typescript
import { LocalStorageAdapter, SessionStorageAdapter } from '@/utils/storage';

// 인스턴스 생성
const local = new LocalStorageAdapter('myapp');
const session = new SessionStorageAdapter('myapp');

// 1. 기본 사용
local.setItem('key', 'value');
const value = local.getItem('key'); // "value"

// 2. 객체 저장 (자동 JSON 직렬화)
interface User {
  id: number;
  name: string;
}

local.setItem<User>('user', { id: 1, name: 'Alice' });
const user = local.getItem<User>('user'); // { id: 1, name: 'Alice' }

// 3. 배열 저장
local.setItem('tags', ['react', 'typescript']);
const tags = local.getItem<string[]>('tags'); // ['react', 'typescript']

// 4. 삭제
local.removeItem('key');

// 5. 모든 키 조회
const allKeys = local.keys(); // ['user', 'tags']

// 6. 모두 삭제
local.clear();
```

### 체크포인트 ✅

- [ ] LocalStorageAdapter와 SessionStorageAdapter 구현 완료
- [ ] 타입 안전한 getItem/setItem 작동 확인
- [ ] quota exceeded 에러 처리 구현 완료
- [ ] 복잡한 객체 (중첩 객체, 배열) 저장/조회 성공
- [ ] 테스트 컴포넌트에서 새 탭/새로고침 차이 확인

### 트러블슈팅

**Q: Private 모드에서 에러 발생**
```typescript
// A: SecurityError를 catch하여 처리
try {
  storage.setItem('key', 'value');
} catch (error) {
  if (error instanceof StorageError && error.code === 'ACCESS_DENIED') {
    console.warn('Private mode detected');
    // 메모리 기반 폴백 사용
  }
}
```

**Q: Quota exceeded 에러**
```typescript
// A: 에러를 catch하여 오래된 데이터 삭제
try {
  storage.setItem('key', largeData);
} catch (error) {
  if (error instanceof StorageError && error.code === 'QUOTA_EXCEEDED') {
    storage.clear(); // 또는 오래된 항목만 삭제
    storage.setItem('key', largeData);
  }
}
```

---

## Chapter 2: BroadcastChannel 통신 시스템

**난이도**: ⭐⭐⭐ 중급
**예상 학습 시간**: 3-4시간

### 2.1 메시지 타입 정의

먼저 타입 안전한 메시지 프로토콜을 설계합니다.

**파일**: `src/utils/tabSync/types.ts`

```typescript
/**
 * 메시지 타입
 */
export enum MessageType {
  // 탭 생명주기
  TAB_OPENED = 'TAB_OPENED',
  TAB_CLOSED = 'TAB_CLOSED',

  // 인증
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',

  // Health check
  PING = 'PING',
  PONG = 'PONG',
}

/**
 * 메시지 인터페이스
 *
 * @template T - payload 타입
 */
export interface TabMessage<T = unknown> {
  /** 메시지 타입 */
  type: MessageType;

  /** 발신 탭 ID */
  tabId: string;

  /** 메시지 payload (선택적) */
  payload?: T;

  /** 전송 시각 (timestamp) */
  timestamp: number;
}

/**
 * 메시지 핸들러 타입
 */
export type MessageHandler<T = unknown> = (message: TabMessage<T>) => void;

/**
 * 구독 취소 함수 타입
 */
export type Unsubscribe = () => void;
```

### 2.2 Constants

**파일**: `src/utils/tabSync/constants.ts`

```typescript
/**
 * BroadcastChannel 채널명
 */
export const CHANNEL_NAME = 'tab-sync-channel';

/**
 * 메시지 전송 간격 (ms)
 */
export const PING_INTERVAL = 5000; // 5초

/**
 * 탭 타임아웃 (ms)
 * 이 시간 동안 PONG이 없으면 탭이 닫힌 것으로 간주
 */
export const TAB_TIMEOUT = 15000; // 15초
```

### 2.3 TabSync 클래스 구현

**파일**: `src/utils/tabSync/TabSync.ts`

```typescript
import { MessageType, TabMessage, MessageHandler, Unsubscribe } from './types';

/**
 * 탭 간 통신을 담당하는 BroadcastChannel 래퍼 클래스
 *
 * 특징:
 * - 타입 안전한 메시지 송수신
 * - Observer 패턴으로 구독 관리
 * - 자동 cleanup
 * - 브라우저 호환성 폴백 (TODO)
 *
 * @example
 * const tabSync = new TabSync('my-channel', 'tab-123');
 *
 * // 메시지 구독
 * const unsubscribe = tabSync.subscribe(MessageType.LOGIN, (msg) => {
 *   console.log('User logged in:', msg.payload);
 * });
 *
 * // 메시지 전송
 * tabSync.broadcast(MessageType.LOGIN, { userId: 123 });
 *
 * // 구독 취소
 * unsubscribe();
 *
 * // 정리
 * tabSync.destroy();
 */
export class TabSync {
  private channel: BroadcastChannel;
  private listeners: Map<MessageType, Set<MessageHandler>>;
  private readonly tabId: string;

  /**
   * @param channelName - BroadcastChannel 채널명
   * @param tabId - 현재 탭의 고유 ID
   */
  constructor(channelName: string, tabId: string) {
    this.tabId = tabId;
    this.channel = new BroadcastChannel(channelName);
    this.listeners = new Map();

    // 메시지 수신 핸들러 등록
    this.channel.onmessage = this.handleMessage.bind(this);
    this.channel.onmessageerror = this.handleMessageError.bind(this);
  }

  /**
   * 메시지 수신 핸들러 (내부)
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = event.data as TabMessage;

      // 유효성 검증
      if (!this.isValidMessage(message)) {
        console.warn('[TabSync] Invalid message:', message);
        return;
      }

      // 타입별 리스너 호출
      const handlers = this.listeners.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('[TabSync] Handler error:', error);
          }
        });
      }
    } catch (error) {
      console.error('[TabSync] Message handling error:', error);
    }
  }

  /**
   * 메시지 에러 핸들러
   */
  private handleMessageError(event: MessageEvent): void {
    console.error('[TabSync] Message error:', event);
  }

  /**
   * 메시지 유효성 검증
   */
  private isValidMessage(message: unknown): message is TabMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }

    const msg = message as Partial<TabMessage>;

    return (
      typeof msg.type === 'string' &&
      typeof msg.tabId === 'string' &&
      typeof msg.timestamp === 'number'
    );
  }

  /**
   * 특정 타입의 메시지 구독
   *
   * @param type - 메시지 타입
   * @param handler - 메시지 핸들러
   * @returns 구독 취소 함수
   *
   * @example
   * const unsubscribe = tabSync.subscribe(MessageType.PING, (msg) => {
   *   console.log('Received PING from', msg.tabId);
   *   tabSync.broadcast(MessageType.PONG);
   * });
   */
  subscribe<T = unknown>(
    type: MessageType,
    handler: MessageHandler<T>
  ): Unsubscribe {
    // 타입별 핸들러 Set 가져오기 (없으면 생성)
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const handlers = this.listeners.get(type)!;
    handlers.add(handler as MessageHandler);

    // 구독 취소 함수 반환
    return () => {
      handlers.delete(handler as MessageHandler);

      // Set이 비었으면 Map에서 제거
      if (handlers.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  /**
   * 메시지 브로드캐스트
   *
   * @param type - 메시지 타입
   * @param payload - 메시지 payload (선택적)
   *
   * @example
   * tabSync.broadcast(MessageType.LOGIN, { userId: 123, username: 'alice' });
   */
  broadcast<T = unknown>(type: MessageType, payload?: T): void {
    const message: TabMessage<T> = {
      type,
      tabId: this.tabId,
      payload,
      timestamp: Date.now(),
    };

    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('[TabSync] Broadcast error:', error);
    }
  }

  /**
   * 리소스 정리
   *
   * 컴포넌트 언마운트 시 반드시 호출해야 합니다.
   */
  destroy(): void {
    // 모든 리스너 제거
    this.listeners.clear();

    // BroadcastChannel 닫기
    this.channel.close();
  }

  /**
   * 현재 탭 ID 조회
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * 등록된 리스너 수 조회 (디버깅용)
   */
  getListenerCount(type?: MessageType): number {
    if (type) {
      return this.listeners.get(type)?.size ?? 0;
    }

    let total = 0;
    this.listeners.forEach(handlers => {
      total += handlers.size;
    });
    return total;
  }
}
```

### 2.4 Export

**파일**: `src/utils/tabSync/index.ts`

```typescript
export * from './types';
export * from './constants';
export * from './TabSync';
```

### 2.5 테스트 컴포넌트

**파일**: `src/components/TabSyncTest.tsx` (테스트 후 삭제 가능)

```typescript
import { useState, useEffect, useRef } from 'react';
import { TabSync, MessageType, TabMessage } from '@/utils/tabSync';

function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function TabSyncTest() {
  const [messages, setMessages] = useState<TabMessage[]>([]);
  const [tabId] = useState(generateTabId());
  const tabSyncRef = useRef<TabSync>();

  useEffect(() => {
    // TabSync 초기화
    const tabSync = new TabSync('test-channel', tabId);
    tabSyncRef.current = tabSync;

    console.log('[TabSync] Initialized with ID:', tabId);

    // PING 메시지 구독
    const unsubscribePing = tabSync.subscribe(MessageType.PING, (msg) => {
      console.log('[TabSync] Received PING from:', msg.tabId);
      setMessages(prev => [...prev, msg]);

      // PONG 응답
      tabSync.broadcast(MessageType.PONG);
    });

    // PONG 메시지 구독
    const unsubscribePong = tabSync.subscribe(MessageType.PONG, (msg) => {
      console.log('[TabSync] Received PONG from:', msg.tabId);
      setMessages(prev => [...prev, msg]);
    });

    // LOGIN 메시지 구독
    const unsubscribeLogin = tabSync.subscribe<{ username: string }>(
      MessageType.LOGIN,
      (msg) => {
        console.log('[TabSync] User logged in:', msg.payload);
        setMessages(prev => [...prev, msg]);
      }
    );

    // Cleanup
    return () => {
      unsubscribePing();
      unsubscribePong();
      unsubscribeLogin();
      tabSync.destroy();
    };
  }, [tabId]);

  const sendPing = () => {
    tabSyncRef.current?.broadcast(MessageType.PING);
  };

  const sendLogin = () => {
    tabSyncRef.current?.broadcast(MessageType.LOGIN, {
      username: 'alice',
    });
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">TabSync 테스트</h2>

      <div className="p-4 bg-gray-100 rounded">
        <p className="font-mono text-sm">
          Current Tab ID: {tabId.slice(0, 16)}...
        </p>
      </div>

      <div className="space-x-2">
        <button
          onClick={sendPing}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          PING 전송
        </button>
        <button
          onClick={sendLogin}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          LOGIN 전송
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">수신 메시지 ({messages.length})</h3>
        <div className="h-64 overflow-auto border rounded p-2 space-y-1">
          {messages.map((msg, i) => (
            <div
              key={i}
              className="text-xs font-mono p-2 bg-gray-50 rounded"
            >
              <span className="text-blue-600">[{msg.type}]</span>{' '}
              from {msg.tabId.slice(0, 8)}...{' '}
              <span className="text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              {msg.payload && (
                <div className="text-gray-700 mt-1">
                  {JSON.stringify(msg.payload)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>💡 새 탭을 열어서 PING을 전송해보세요!</p>
        <p>💡 양쪽 탭에서 메시지가 수신되는지 확인하세요!</p>
      </div>
    </div>
  );
}
```

### 2.6 사용 예제

```typescript
import { TabSync, MessageType } from '@/utils/tabSync';

// 1. TabSync 인스턴스 생성
const tabSync = new TabSync('my-app', 'tab-123');

// 2. 메시지 구독
const unsubscribe = tabSync.subscribe(MessageType.LOGIN, (msg) => {
  console.log('User logged in:', msg.payload);
});

// 3. 메시지 전송
tabSync.broadcast(MessageType.LOGIN, { userId: 123 });

// 4. 구독 취소
unsubscribe();

// 5. cleanup
tabSync.destroy();
```

### 체크포인트 ✅

- [ ] TabSync 클래스 구현 완료
- [ ] 타입 안전한 subscribe/broadcast 작동 확인
- [ ] 2개 이상의 탭에서 메시지 송수신 성공
- [ ] 메모리 누수 없이 unsubscribe 작동 확인
- [ ] 테스트 컴포넌트에서 실시간 메시지 교환 확인

### 트러블슈팅

**Q: 메시지가 수신되지 않음**
```typescript
// A: 채널명이 동일한지 확인
// 탭 A
const tabSyncA = new TabSync('channel-1', 'tab-a');

// 탭 B (❌ 다른 채널명)
const tabSyncB = new TabSync('channel-2', 'tab-b');

// 해결: 동일한 채널명 사용
const tabSyncB = new TabSync('channel-1', 'tab-b'); // ✅
```

**Q: 메모리 누수**
```typescript
// A: useEffect cleanup에서 destroy() 호출
useEffect(() => {
  const tabSync = new TabSync('channel', 'tab-id');

  return () => {
    tabSync.destroy(); // ✅ 반드시 호출!
  };
}, []);
```

---

## Chapter 3: 하이브리드 스토리지 전략

**난이도**: ⭐⭐⭐ 중급
**예상 학습 시간**: 3-4시간

### 3.1 인증 타입 정의

**파일**: `src/types/auth.ts`

```typescript
/**
 * 인증 세션 인터페이스
 */
export interface AuthSession {
  /** 인증 토큰 (JWT 등) */
  token: string;

  /** 사용자 정보 */
  user: {
    id: number;
    username: string;
    email: string;
  };

  /** 세션 만료 시각 (timestamp) */
  expiresAt: number;
}

/**
 * 로그인 인증 정보
 */
export interface LoginCredentials {
  username: string;
  password: string;
}
```

### 3.2 탭 ID 생성 유틸리티

**파일**: `src/utils/auth/tabId.ts`

```typescript
/**
 * 고유한 탭 ID 생성
 *
 * 형식: tab_{timestamp}_{random}
 * 예시: tab_1735574400000_x7k9m2p
 *
 * @returns 고유 탭 ID
 */
export function generateTabId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `tab_${timestamp}_${random}`;
}

/**
 * 탭 ID 유효성 검증
 */
export function isValidTabId(tabId: unknown): tabId is string {
  if (typeof tabId !== 'string') {
    return false;
  }

  return /^tab_\d+_[a-z0-9]{7}$/.test(tabId);
}
```

### 3.3 AuthStorage 클래스 구현

**파일**: `src/utils/auth/AuthStorage.ts`

```typescript
import { LocalStorageAdapter, SessionStorageAdapter } from '@/utils/storage';
import { AuthSession } from '@/types/auth';

/**
 * 하이브리드 스토리지 전략으로 인증 상태를 관리하는 클래스
 *
 * **전략**:
 * - localStorage: 모든 탭이 공유하는 인증 세션
 * - sessionStorage: 탭별 독립적인 탭 ID
 *
 * **핵심 메커니즘**:
 * - 새 탭: sessionStorage에 탭 ID 없음 → localStorage에서 세션 복사
 * - 새로고침: sessionStorage에 탭 ID 있음 → 세션 유지
 *
 * @example
 * const authStorage = new AuthStorage();
 *
 * // 로그인
 * authStorage.saveSession({
 *   token: 'jwt-token',
 *   user: { id: 1, username: 'alice', email: 'alice@example.com' },
 *   expiresAt: Date.now() + 3600000
 * });
 *
 * // 새 탭에서
 * const session = authStorage.initializeSession(); // localStorage에서 자동 복사
 */
export class AuthStorage {
  private readonly local: LocalStorageAdapter;
  private readonly session: SessionStorageAdapter;

  // Storage 키 상수
  private readonly KEYS = {
    SESSION: 'auth_session',    // localStorage
    TAB_ID: 'tab_id',            // sessionStorage
  } as const;

  constructor() {
    this.local = new LocalStorageAdapter('auth');
    this.session = new SessionStorageAdapter('auth');
  }

  /**
   * 새 탭인지 새로고침인지 구분
   *
   * **동작 원리**:
   * - sessionStorage는 탭별로 독립적이지만 새로고침 시 유지됨
   * - localStorage는 모든 탭이 공유
   * - 따라서 sessionStorage에 탭 ID가 없으면 새 탭
   *
   * @returns 새 탭이면 true, 새로고침이면 false
   *
   * @example
   * if (authStorage.isNewTab()) {
   *   console.log('새 탭이 열렸습니다!');
   *   // localStorage → sessionStorage 복사
   * } else {
   *   console.log('페이지가 새로고침되었습니다.');
   *   // 기존 sessionStorage 유지
   * }
   */
  isNewTab(): boolean {
    const hasLocalSession = this.local.getItem<AuthSession>(this.KEYS.SESSION) !== null;
    const hasSessionTabId = this.session.getItem(this.KEYS.TAB_ID) !== null;

    // localStorage에 세션은 있지만 sessionStorage에 탭 ID가 없음 → 새 탭
    return hasLocalSession && !hasSessionTabId;
  }

  /**
   * 세션 초기화
   *
   * **시나리오**:
   * 1. 새 탭: localStorage → sessionStorage 복사
   * 2. 새로고침: sessionStorage 그대로 사용
   * 3. 세션 없음: null 반환
   *
   * @returns 초기화된 세션 (없으면 null)
   */
  initializeSession(): AuthSession | null {
    // 먼저 sessionStorage 확인 (새로고침 케이스)
    const sessionSession = this.session.getItem<AuthSession>(this.KEYS.SESSION);
    if (sessionSession) {
      console.log('[AuthStorage] Session from sessionStorage (refresh)');
      return sessionSession;
    }

    // localStorage 확인 (새 탭 케이스)
    const localSession = this.local.getItem<AuthSession>(this.KEYS.SESSION);
    if (localSession) {
      // 새 탭이므로 sessionStorage에 복사
      this.session.setItem(this.KEYS.SESSION, localSession);
      console.log('[AuthStorage] Session copied to sessionStorage (new tab)');
      return localSession;
    }

    // 세션 없음
    console.log('[AuthStorage] No session found');
    return null;
  }

  /**
   * 세션 저장 (로그인)
   *
   * localStorage와 sessionStorage 모두에 저장합니다.
   *
   * @param session - 저장할 세션
   */
  saveSession(session: AuthSession): void {
    // localStorage에 저장 (모든 탭 공유)
    this.local.setItem(this.KEYS.SESSION, session);

    // sessionStorage에도 저장 (현재 탭)
    this.session.setItem(this.KEYS.SESSION, session);

    console.log('[AuthStorage] Session saved:', {
      userId: session.user.id,
      expiresAt: new Date(session.expiresAt).toLocaleString(),
    });
  }

  /**
   * sessionStorage에만 세션 저장
   *
   * 다른 탭에서 LOGIN 메시지를 받았을 때 사용합니다.
   */
  saveToSession(session: AuthSession): void {
    this.session.setItem(this.KEYS.SESSION, session);
    console.log('[AuthStorage] Session saved to sessionStorage only');
  }

  /**
   * 세션 조회
   *
   * @returns 현재 세션 (없으면 null)
   */
  getSession(): AuthSession | null {
    // sessionStorage 우선 확인
    const sessionSession = this.session.getItem<AuthSession>(this.KEYS.SESSION);
    if (sessionSession) {
      return sessionSession;
    }

    // localStorage 확인
    return this.local.getItem<AuthSession>(this.KEYS.SESSION);
  }

  /**
   * localStorage에서만 세션 조회
   */
  getFromLocal(): AuthSession | null {
    return this.local.getItem<AuthSession>(this.KEYS.SESSION);
  }

  /**
   * 세션 삭제 (로그아웃)
   *
   * localStorage와 sessionStorage 모두에서 삭제합니다.
   */
  clearSession(): void {
    this.local.removeItem(this.KEYS.SESSION);
    this.session.removeItem(this.KEYS.SESSION);
    console.log('[AuthStorage] Session cleared');
  }

  /**
   * 탭 ID 저장
   */
  setTabId(tabId: string): void {
    this.session.setItem(this.KEYS.TAB_ID, tabId);
  }

  /**
   * 탭 ID 조회
   */
  getTabId(): string | null {
    return this.session.getItem<string>(this.KEYS.TAB_ID);
  }

  /**
   * 세션 유효성 검증
   */
  isSessionValid(session: AuthSession): boolean {
    return session.expiresAt > Date.now();
  }
}
```

### 3.4 Export

**파일**: `src/utils/auth/index.ts`

```typescript
export * from './AuthStorage';
export * from './tabId';
```

### 3.5 시나리오 플로우 다이어그램

```
시나리오 1: 로그인 후 새 탭 열기
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[탭 A] 로그인
  ↓
authStorage.saveSession(session)
  ↓
├─ localStorage.setItem('auth_session', session)
└─ sessionStorage.setItem('auth_session', session)

[탭 B] 새로 열림
  ↓
authStorage.initializeSession()
  ↓
sessionStorage.getItem('auth_session') → null
  ↓
localStorage.getItem('auth_session') → session 있음!
  ↓
sessionStorage.setItem('auth_session', session)
  ↓
자동 로그인 ✅


시나리오 2: 새로고침
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[탭 A] F5
  ↓
페이지 재로드
  ↓
authStorage.initializeSession()
  ↓
sessionStorage.getItem('auth_session') → session 있음!
  ↓
그대로 반환
  ↓
로그인 유지 ✅


시나리오 3: 로그아웃
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[탭 A] 로그아웃
  ↓
authStorage.clearSession()
  ↓
├─ localStorage.removeItem('auth_session')
└─ sessionStorage.removeItem('auth_session')
  ↓
BroadcastChannel.postMessage({ type: 'LOGOUT' })

[탭 B, C, D] LOGOUT 메시지 수신
  ↓
authStorage.clearSession()
  ↓
모든 탭 로그아웃 ✅
```

### 3.6 테스트 컴포넌트

**파일**: `src/components/AuthStorageTest.tsx` (테스트 후 삭제 가능)

```typescript
import { useState, useEffect } from 'react';
import { AuthStorage } from '@/utils/auth';
import { AuthSession } from '@/types/auth';
import { generateTabId } from '@/utils/auth/tabId';

const authStorage = new AuthStorage();

export function AuthStorageTest() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [tabId, setTabId] = useState<string>('');
  const [isNewTab, setIsNewTab] = useState(false);

  useEffect(() => {
    // 탭 ID 확인
    let currentTabId = authStorage.getTabId();

    if (!currentTabId) {
      currentTabId = generateTabId();
      authStorage.setTabId(currentTabId);
      setIsNewTab(true);
    } else {
      setIsNewTab(false);
    }

    setTabId(currentTabId);

    // 세션 초기화
    const initialSession = authStorage.initializeSession();
    setSession(initialSession);
  }, []);

  const handleLogin = () => {
    const newSession: AuthSession = {
      token: 'jwt_' + Math.random().toString(36).substring(7),
      user: {
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
      },
      expiresAt: Date.now() + 3600000, // 1시간 후
    };

    authStorage.saveSession(newSession);
    setSession(newSession);
    console.log('[Test] Logged in:', newSession);
  };

  const handleLogout = () => {
    authStorage.clearSession();
    setSession(null);
    console.log('[Test] Logged out');
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">AuthStorage 테스트</h2>

      <div className="p-4 bg-gray-100 rounded space-y-2">
        <div className="font-mono text-sm">
          <strong>탭 ID:</strong> {tabId.slice(0, 24)}...
        </div>
        <div className="font-mono text-sm">
          <strong>탭 상태:</strong>{' '}
          {isNewTab ? (
            <span className="text-green-600">새 탭</span>
          ) : (
            <span className="text-blue-600">새로고침</span>
          )}
        </div>
        <div className="font-mono text-sm">
          <strong>로그인:</strong>{' '}
          {session ? (
            <span className="text-green-600">Yes</span>
          ) : (
            <span className="text-red-600">No</span>
          )}
        </div>
      </div>

      {session ? (
        <div className="p-4 bg-green-100 rounded">
          <h3 className="font-bold mb-2">현재 세션</h3>
          <div className="text-sm space-y-1">
            <div>User ID: {session.user.id}</div>
            <div>Username: {session.user.username}</div>
            <div>Email: {session.user.email}</div>
            <div>Token: {session.token}</div>
            <div>
              Expires:{' '}
              {new Date(session.expiresAt).toLocaleString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-100 rounded">
          <p className="text-gray-600">로그인되지 않음</p>
        </div>
      )}

      <div className="space-x-2">
        <button
          onClick={handleLogin}
          disabled={!!session}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          로그인
        </button>
        <button
          onClick={handleLogout}
          disabled={!session}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
        >
          로그아웃
        </button>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>💡 로그인 후 새 탭을 열어보세요! (자동 로그인)</p>
        <p>💡 새로고침(F5)해보세요! (로그인 유지)</p>
        <p>💡 한 탭에서 로그아웃하면 다른 탭도 확인해보세요!</p>
      </div>
    </div>
  );
}
```

### 체크포인트 ✅

- [ ] AuthStorage 클래스 구현 완료
- [ ] 새 탭 열기 시 세션 복사 확인 (localStorage → sessionStorage)
- [ ] 새로고침 시 세션 유지 확인 (sessionStorage 그대로)
- [ ] isNewTab() 메서드로 새 탭/새로고침 구분 가능
- [ ] localStorage와 sessionStorage 동기화 확인

### 트러블슈팅

**Q: 새 탭에서 세션이 복사되지 않음**
```typescript
// A: initializeSession()을 호출했는지 확인
useEffect(() => {
  const session = authStorage.initializeSession(); // ✅ 반드시 호출!
  setSession(session);
}, []);
```

**Q: 새로고침 시 세션이 사라짐**
```typescript
// A: sessionStorage가 정상 작동하는지 확인
// Private 모드에서는 sessionStorage가 제한될 수 있음
console.log('sessionStorage 테스트:', sessionStorage.getItem('test'));
```

---

## Chapter 4: 탭 생명주기 관리 - PING/PONG

**난이도**: ⭐⭐⭐⭐ 고급
**예상 학습 시간**: 4-5시간

### 4.1 타입 정의

**파일**: `src/utils/tabManager/types.ts`

```typescript
/**
 * 탭 정보
 */
export interface TabInfo {
  /** 탭 ID */
  id: string;

  /** 마지막 PING 시각 (timestamp) */
  lastPing: number;

  /** 탭이 생성된 시각 */
  createdAt: number;
}

/**
 * TabManager 옵션
 */
export interface TabManagerOptions {
  /** PING 전송 간격 (ms) */
  pingInterval?: number;

  /** 탭 타임아웃 (ms) */
  tabTimeout?: number;

  /** cleanup 간격 (ms) */
  cleanupInterval?: number;
}
```

### 4.2 TabManager 클래스 구현

**파일**: `src/utils/tabManager/TabManager.ts`

```typescript
import { TabSync, MessageType } from '@/utils/tabSync';
import { TabInfo, TabManagerOptions } from './types';

/**
 * 탭 생명주기를 관리하는 클래스
 *
 * **핵심 메커니즘**: PING/PONG
 * - 각 탭이 주기적으로 PING 전송 (5초마다)
 * - PING을 받은 탭은 PONG 응답
 * - 15초 동안 응답 없으면 탭이 닫힌 것으로 간주
 *
 * **주요 기능**:
 * 1. 활성 탭 목록 추적
 * 2. 비활성 탭 자동 정리
 * 3. 주 탭(Primary Tab) 선정
 * 4. beforeunload 이벤트 처리
 *
 * @example
 * const tabManager = new TabManager(tabSync, 'tab-123');
 *
 * // 활성 탭 목록 조회
 * const activeTabs = tabManager.getActiveTabs(); // ['tab-123', 'tab-456']
 *
 * // 주 탭 여부 확인
 * const isPrimary = tabManager.isPrimaryTab(); // true
 *
 * // 정리
 * tabManager.destroy();
 */
export class TabManager {
  private tabSync: TabSync;
  private tabId: string;
  private activeTabs: Map<string, TabInfo>;

  // Interval IDs
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // 옵션
  private readonly PING_INTERVAL: number;
  private readonly TAB_TIMEOUT: number;
  private readonly CLEANUP_INTERVAL: number;

  /**
   * @param tabSync - TabSync 인스턴스
   * @param tabId - 현재 탭 ID
   * @param options - 옵션
   */
  constructor(
    tabSync: TabSync,
    tabId: string,
    options: TabManagerOptions = {}
  ) {
    this.tabSync = tabSync;
    this.tabId = tabId;
    this.activeTabs = new Map();

    // 옵션 설정
    this.PING_INTERVAL = options.pingInterval ?? 5000; // 5초
    this.TAB_TIMEOUT = options.tabTimeout ?? 15000; // 15초
    this.CLEANUP_INTERVAL = options.cleanupInterval ?? 10000; // 10초

    // 자기 자신을 활성 탭에 추가
    this.activeTabs.set(tabId, {
      id: tabId,
      lastPing: Date.now(),
      createdAt: Date.now(),
    });

    // 초기화
    this.setupListeners();
    this.startPing();
    this.startCleanup();
    this.setupBeforeUnload();

    console.log('[TabManager] Initialized:', tabId);
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupListeners(): void {
    // PING 수신 시 → PONG 응답
    this.tabSync.subscribe(MessageType.PING, (msg) => {
      // 발신자를 활성 탭에 추가
      this.updateTabActivity(msg.tabId);

      // PONG 응답
      this.tabSync.broadcast(MessageType.PONG);
    });

    // PONG 수신 시 → 활성 탭 업데이트
    this.tabSync.subscribe(MessageType.PONG, (msg) => {
      this.updateTabActivity(msg.tabId);
    });

    // TAB_OPENED 수신 시
    this.tabSync.subscribe(MessageType.TAB_OPENED, (msg) => {
      console.log('[TabManager] Tab opened:', msg.tabId);
      this.updateTabActivity(msg.tabId);
    });

    // TAB_CLOSED 수신 시
    this.tabSync.subscribe(MessageType.TAB_CLOSED, (msg) => {
      console.log('[TabManager] Tab closed:', msg.tabId);
      this.removeTab(msg.tabId);
    });
  }

  /**
   * 탭 활동 업데이트
   */
  private updateTabActivity(tabId: string): void {
    const existing = this.activeTabs.get(tabId);

    if (existing) {
      // 기존 탭: lastPing만 업데이트
      existing.lastPing = Date.now();
    } else {
      // 새 탭: 추가
      this.activeTabs.set(tabId, {
        id: tabId,
        lastPing: Date.now(),
        createdAt: Date.now(),
      });
    }
  }

  /**
   * 탭 제거
   */
  removeTab(tabId: string): void {
    this.activeTabs.delete(tabId);
  }

  /**
   * PING 전송 시작 (주기적)
   */
  private startPing(): void {
    // 초기 PING (즉시)
    this.tabSync.broadcast(MessageType.PING);

    // 주기적 PING
    this.pingInterval = setInterval(() => {
      this.tabSync.broadcast(MessageType.PING);

      // 자기 자신도 업데이트
      this.updateTabActivity(this.tabId);
    }, this.PING_INTERVAL);
  }

  /**
   * 비활성 탭 정리 시작 (주기적)
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveTabs();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 비활성 탭 정리
   *
   * TAB_TIMEOUT 동안 PING이 없으면 해당 탭을 제거합니다.
   */
  private cleanupInactiveTabs(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [tabId, info] of this.activeTabs) {
      if (now - info.lastPing > this.TAB_TIMEOUT) {
        console.log('[TabManager] Tab timeout:', tabId);
        this.activeTabs.delete(tabId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log('[TabManager] Cleaned up', removedCount, 'tabs');
    }
  }

  /**
   * beforeunload 이벤트 설정
   *
   * 탭을 닫을 때 TAB_CLOSED 메시지를 전송합니다.
   */
  private setupBeforeUnload(): void {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * beforeunload 핸들러
   */
  private handleBeforeUnload = (): void => {
    console.log('[TabManager] Tab closing:', this.tabId);

    // TAB_CLOSED 브로드캐스트
    this.tabSync.broadcast(MessageType.TAB_CLOSED);

    // 자기 자신을 활성 탭에서 제거
    this.removeTab(this.tabId);
  };

  /**
   * 활성 탭 목록 조회
   *
   * @returns 활성 탭 ID 배열
   */
  getActiveTabs(): string[] {
    return Array.from(this.activeTabs.keys());
  }

  /**
   * 활성 탭 수 조회
   */
  getActiveTabCount(): number {
    return this.activeTabs.size;
  }

  /**
   * 주 탭 여부 확인
   *
   * 가장 먼저 생성된 탭을 주 탭으로 선정합니다.
   *
   * @returns 주 탭이면 true
   */
  isPrimaryTab(): boolean {
    if (this.activeTabs.size === 0) {
      return false;
    }

    // createdAt 기준으로 정렬하여 가장 오래된 탭 찾기
    const sorted = Array.from(this.activeTabs.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );

    return sorted[0].id === this.tabId;
  }

  /**
   * 특정 탭의 정보 조회
   */
  getTabInfo(tabId: string): TabInfo | undefined {
    return this.activeTabs.get(tabId);
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    // Interval 정리
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // beforeunload 제거
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    // 활성 탭 정리
    this.activeTabs.clear();

    console.log('[TabManager] Destroyed');
  }
}
```

### 4.3 Export

**파일**: `src/utils/tabManager/index.ts`

```typescript
export * from './types';
export * from './TabManager';
```

### 4.4 테스트 컴포넌트

**파일**: `src/components/TabManagerTest.tsx` (테스트 후 삭제 가능)

```typescript
import { useState, useEffect, useRef } from 'react';
import { TabSync } from '@/utils/tabSync';
import { TabManager } from '@/utils/tabManager';
import { generateTabId } from '@/utils/auth/tabId';

export function TabManagerTest() {
  const [tabId] = useState(generateTabId());
  const [activeTabs, setActiveTabs] = useState<string[]>([]);
  const [isPrimary, setIsPrimary] = useState(false);

  const tabSyncRef = useRef<TabSync>();
  const tabManagerRef = useRef<TabManager>();

  useEffect(() => {
    // TabSync 초기화
    const tabSync = new TabSync('test-channel', tabId);
    tabSyncRef.current = tabSync;

    // TabManager 초기화
    const tabManager = new TabManager(tabSync, tabId);
    tabManagerRef.current = tabManager;

    // 활성 탭 추적 (1초마다)
    const interval = setInterval(() => {
      setActiveTabs(tabManager.getActiveTabs());
      setIsPrimary(tabManager.isPrimaryTab());
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(interval);
      tabManager.destroy();
      tabSync.destroy();
    };
  }, [tabId]);

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">TabManager 테스트</h2>

      <div className="p-4 bg-gray-100 rounded space-y-2">
        <div className="font-mono text-sm">
          <strong>Current Tab:</strong> {tabId.slice(0, 24)}...
        </div>
        <div className="font-mono text-sm">
          <strong>Primary Tab:</strong>{' '}
          {isPrimary ? (
            <span className="text-green-600 font-bold">Yes ⭐</span>
          ) : (
            <span className="text-gray-600">No</span>
          )}
        </div>
        <div className="font-mono text-sm">
          <strong>Active Tabs:</strong> {activeTabs.length}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">활성 탭 목록</h3>
        <div className="space-y-1">
          {activeTabs.map((id) => (
            <div
              key={id}
              className={`p-2 rounded font-mono text-sm ${
                id === tabId
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-50'
              }`}
            >
              {id === tabId && '👉 '}
              {id.slice(0, 32)}...
              {id === tabId && ' (현재 탭)'}
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>💡 새 탭을 여러 개 열어보세요!</p>
        <p>💡 탭을 닫으면 목록에서 사라지는지 확인하세요!</p>
        <p>💡 주 탭을 닫으면 다른 탭이 주 탭이 되는지 확인하세요!</p>
      </div>
    </div>
  );
}
```

### 4.5 PING/PONG 플로우 다이어그램

```
탭 A, B, C가 열려있는 상태
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

시간 0초:
  탭 A: PING 전송
  탭 B: PING 전송
  탭 C: PING 전송

시간 0.1초:
  탭 A: 탭 B, C의 PING 수신 → activeTabs에 추가
  탭 A: PONG 전송

  탭 B: 탭 A, C의 PING 수신 → activeTabs에 추가
  탭 B: PONG 전송

  탭 C: 탭 A, B의 PING 수신 → activeTabs에 추가
  탭 C: PONG 전송

시간 0.2초:
  탭 A: 탭 B, C의 PONG 수신 → lastPing 업데이트
  탭 B: 탭 A, C의 PONG 수신 → lastPing 업데이트
  탭 C: 탭 A, B의 PONG 수신 → lastPing 업데이트

결과:
  모든 탭의 activeTabs: ['tab-A', 'tab-B', 'tab-C']


탭 C 닫기
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

탭 C: beforeunload 이벤트
  ↓
탭 C: TAB_CLOSED 브로드캐스트
  ↓
탭 A, B: TAB_CLOSED 수신
  ↓
탭 A, B: activeTabs에서 'tab-C' 제거

결과:
  탭 A의 activeTabs: ['tab-A', 'tab-B']
  탭 B의 activeTabs: ['tab-A', 'tab-B']


탭 타임아웃 (네트워크 문제 등)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

탭 C: 네트워크 문제로 PING 전송 실패

시간 0초: 탭 C의 lastPing = 0
시간 5초: 탭 C의 PING 전송 실패
시간 10초: 탭 C의 PING 전송 실패 (cleanup 실행)
  ↓
탭 A, B: cleanup에서 탭 C 체크
  ↓
now - tab_C.lastPing = 10초 (< 15초 타임아웃)
  ↓
아직 유지

시간 15초: cleanup 실행
  ↓
now - tab_C.lastPing = 15초 (>= 15초 타임아웃)
  ↓
activeTabs에서 'tab-C' 제거
```

### 체크포인트 ✅

- [ ] TabManager 클래스 구현 완료
- [ ] PING/PONG 메시지 교환 확인 (콘솔 로그)
- [ ] 활성 탭 목록 실시간 업데이트 확인
- [ ] 탭 닫기 시 TAB_CLOSED 메시지 전송 확인
- [ ] 비활성 탭 자동 정리 확인 (15초 타임아웃)
- [ ] 주 탭 선정 로직 작동 확인

### 트러블슈팅

**Q: PING/PONG이 너무 빈번하게 발생**
```typescript
// A: PING_INTERVAL을 늘리기
const tabManager = new TabManager(tabSync, tabId, {
  pingInterval: 10000, // 10초
  tabTimeout: 30000,   // 30초
});
```

**Q: 탭을 닫았는데 목록에서 사라지지 않음**
```typescript
// A: beforeunload 이벤트가 정상 작동하는지 확인
window.addEventListener('beforeunload', () => {
  console.log('beforeunload fired'); // ✅ 콘솔에 출력되어야 함
});
```

---

## Chapter 5: 인증 동기화 시스템

**난이도**: ⭐⭐⭐⭐ 고급
**예상 학습 시간**: 4-5시간

### 5.1 useAuthStorage Hook 구현

**파일**: `src/hooks/useAuthStorage.ts`

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { TabSync, MessageType } from '@/utils/tabSync';
import { TabManager } from '@/utils/tabManager';
import { AuthStorage, generateTabId } from '@/utils/auth';
import { AuthSession, LoginCredentials } from '@/types/auth';

/**
 * 인증 상태 관리 커스텀 훅
 *
 * **핵심 기능**:
 * 1. 탭 간 로그인/로그아웃 동기화
 * 2. 새 탭에서 세션 자동 복사
 * 3. 활성 탭 추적
 * 4. 메모리 누수 방지
 *
 * **사용 예제**:
 * ```tsx
 * function App() {
 *   const {
 *     session,
 *     isAuthenticated,
 *     login,
 *     logout,
 *     activeTabs,
 *     tabId,
 *   } = useAuthStorage();
 *
 *   return (
 *     <div>
 *       {isAuthenticated ? (
 *         <>
 *           <p>Welcome, {session?.user.username}!</p>
 *           <button onClick={logout}>Logout</button>
 *         </>
 *       ) : (
 *         <button onClick={() => login({ username: 'alice', password: '123' })}>
 *           Login
 *         </button>
 *       )}
 *       <p>Active tabs: {activeTabs.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuthStorage() {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // State
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTabs, setActiveTabs] = useState<string[]>([]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Refs (인스턴스 유지)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const tabIdRef = useRef(generateTabId());
  const tabSyncRef = useRef<TabSync>();
  const tabManagerRef = useRef<TabManager>();
  const authStorageRef = useRef(new AuthStorage());

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Effect 1: 초기화
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    const tabId = tabIdRef.current;
    const authStorage = authStorageRef.current;

    console.log('[useAuthStorage] Initializing with tabId:', tabId);

    // 1. 탭 ID 저장
    authStorage.setTabId(tabId);

    // 2. 초기 세션 로드
    const initialSession = authStorage.initializeSession();
    setSession(initialSession);

    if (initialSession) {
      console.log('[useAuthStorage] Initial session found:', {
        userId: initialSession.user.id,
        username: initialSession.user.username,
      });
    } else {
      console.log('[useAuthStorage] No initial session');
    }

    // 3. TabSync 초기화
    const tabSync = new TabSync('auth-sync', tabId);
    tabSyncRef.current = tabSync;

    // 4. TabManager 초기화
    const tabManager = new TabManager(tabSync, tabId);
    tabManagerRef.current = tabManager;

    // 5. LOGIN 메시지 리스너
    const unsubscribeLogin = tabSync.subscribe<AuthSession>(
      MessageType.LOGIN,
      (msg) => {
        console.log('[useAuthStorage] LOGIN received from:', msg.tabId);

        // 다른 탭에서 로그인했으므로 세션 복사
        if (msg.payload) {
          authStorage.saveToSession(msg.payload);
          setSession(msg.payload);
        }
      }
    );

    // 6. LOGOUT 메시지 리스너
    const unsubscribeLogout = tabSync.subscribe(
      MessageType.LOGOUT,
      (msg) => {
        console.log('[useAuthStorage] LOGOUT received from:', msg.tabId);

        // 세션 삭제
        authStorage.clearSession();
        setSession(null);
      }
    );

    // 7. TAB_OPENED 브로드캐스트 (선택적)
    tabSync.broadcast(MessageType.TAB_OPENED);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Cleanup
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    return () => {
      console.log('[useAuthStorage] Cleaning up');
      unsubscribeLogin();
      unsubscribeLogout();
      tabManager.destroy();
      tabSync.destroy();
    };
  }, []); // 빈 의존성 배열 (최초 1회만 실행)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Effect 2: 활성 탭 추적
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    const interval = setInterval(() => {
      if (tabManagerRef.current) {
        const tabs = tabManagerRef.current.getActiveTabs();
        setActiveTabs(tabs);
      }
    }, 1000); // 1초마다 업데이트

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 로그인 함수
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const login = useCallback(async (credentials: LoginCredentials) => {
    console.log('[useAuthStorage] Login attempt:', credentials.username);

    try {
      // TODO: 실제 API 호출
      // const response = await fetch('/api/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(credentials),
      // });
      // const data = await response.json();

      // Mock 세션 생성
      const newSession: AuthSession = {
        token: 'jwt_' + Math.random().toString(36).substring(7),
        user: {
          id: 1,
          username: credentials.username,
          email: credentials.username + '@example.com',
        },
        expiresAt: Date.now() + 3600000, // 1시간 후
      };

      // 로컬 저장
      authStorageRef.current.saveSession(newSession);
      setSession(newSession);

      // 다른 탭에 브로드캐스트
      tabSyncRef.current?.broadcast(MessageType.LOGIN, newSession);

      console.log('[useAuthStorage] Login successful:', newSession.user.username);
    } catch (error) {
      console.error('[useAuthStorage] Login failed:', error);
      throw error;
    }
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 로그아웃 함수
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const logout = useCallback(() => {
    console.log('[useAuthStorage] Logout');

    // 로컬 삭제
    authStorageRef.current.clearSession();
    setSession(null);

    // 다른 탭에 브로드캐스트
    tabSyncRef.current?.broadcast(MessageType.LOGOUT);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 반환값
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return {
    /** 현재 세션 */
    session,

    /** 로그인 여부 */
    isAuthenticated: !!session,

    /** 로그인 함수 */
    login,

    /** 로그아웃 함수 */
    logout,

    /** 활성 탭 목록 */
    activeTabs,

    /** 현재 탭 ID */
    tabId: tabIdRef.current,
  };
}
```

### 5.2 AuthContext 구현

**파일**: `src/contexts/AuthContext.tsx`

```typescript
import { createContext, useContext, ReactNode } from 'react';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import { AuthSession, LoginCredentials } from '@/types/auth';

/**
 * AuthContext 값 타입
 */
interface AuthContextValue {
  /** 현재 세션 */
  session: AuthSession | null;

  /** 로그인 여부 */
  isAuthenticated: boolean;

  /** 로그인 함수 */
  login: (credentials: LoginCredentials) => Promise<void>;

  /** 로그아웃 함수 */
  logout: () => void;

  /** 활성 탭 목록 */
  activeTabs: string[];

  /** 현재 탭 ID */
  tabId: string;
}

/**
 * AuthContext
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider 컴포넌트
 *
 * @example
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <YourApp />
 *     </AuthProvider>
 *   );
 * }
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthStorage();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 *
 * AuthProvider 하위에서만 사용 가능합니다.
 *
 * @example
 * function MyComponent() {
 *   const { isAuthenticated, login, logout } = useAuth();
 *
 *   return (
 *     <div>
 *       {isAuthenticated ? (
 *         <button onClick={logout}>Logout</button>
 *       ) : (
 *         <button onClick={() => login({ username: 'alice', password: '123' })}>
 *           Login
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
```

### 5.3 App.tsx에 AuthProvider 적용

**파일**: `src/App.tsx`

```typescript
import { AuthProvider } from '@/contexts/AuthContext';
import { YourMainComponent } from '@/components/YourMainComponent';

function App() {
  return (
    <AuthProvider>
      <YourMainComponent />
    </AuthProvider>
  );
}

export default App;
```

### 5.4 사용 예제 컴포넌트

**파일**: `src/components/AuthExample.tsx`

```typescript
import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function AuthExample() {
  const {
    session,
    isAuthenticated,
    login,
    logout,
    activeTabs,
    tabId,
  } = useAuth();

  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({ username, password });
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* 탭 정보 */}
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-sm space-y-2">
            <div>
              <strong>Tab ID:</strong> {tabId.slice(0, 24)}...
            </div>
            <div>
              <strong>Active Tabs:</strong> {activeTabs.length}
            </div>
          </div>
        </div>

        {/* 로그인 폼 또는 사용자 정보 */}
        {isAuthenticated && session ? (
          <div className="p-6 bg-card rounded-lg border space-y-4">
            <h2 className="text-2xl font-bold">
              Welcome, {session.user.username}!
            </h2>

            <div className="space-y-2 text-sm">
              <div>
                <strong>Email:</strong> {session.user.email}
              </div>
              <div>
                <strong>User ID:</strong> {session.user.id}
              </div>
              <div>
                <strong>Token:</strong>{' '}
                <code className="text-xs">{session.token.slice(0, 20)}...</code>
              </div>
              <div>
                <strong>Expires:</strong>{' '}
                {new Date(session.expiresAt).toLocaleString()}
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="p-6 bg-card rounded-lg border space-y-4">
            <h2 className="text-2xl font-bold">Login</h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* 테스트 가이드 */}
        <div className="text-sm text-muted-foreground space-y-1 p-4 bg-muted rounded">
          <p className="font-bold">💡 테스트 가이드:</p>
          <p>1. 로그인 후 새 탭을 열어보세요 (자동 로그인)</p>
          <p>2. 한 탭에서 로그아웃하면 모든 탭에서 로그아웃</p>
          <p>3. 새로고침(F5)해도 로그인 유지</p>
          <p>4. Active Tabs 숫자가 실시간으로 변경됨</p>
        </div>
      </div>
    </div>
  );
}
```

### 체크포인트 ✅

- [ ] useAuthStorage Hook 구현 완료
- [ ] AuthContext Provider 작동 확인
- [ ] 한 탭에서 로그인 시 모든 탭 자동 로그인
- [ ] 한 탭에서 로그아웃 시 모든 탭 자동 로그아웃
- [ ] 새 탭 열기 시 세션 자동 복사
- [ ] 새로고침 시 로그인 상태 유지
- [ ] 활성 탭 수 실시간 업데이트
- [ ] 메모리 누수 없이 cleanup 작동

### 트러블슈팅

**Q: 새 탭에서 자동 로그인이 안 됨**
```typescript
// A: initializeSession()이 호출되는지 확인
useEffect(() => {
  const initialSession = authStorage.initializeSession(); // ✅
  setSession(initialSession);
  console.log('Initial session:', initialSession);
}, []);
```

**Q: LOGIN 메시지가 수신되지 않음**
```typescript
// A: 채널명이 동일한지 확인
// useAuthStorage.ts
const tabSync = new TabSync('auth-sync', tabId); // ✅ 동일한 채널명
```

---

## Chapter 6: UI 컴포넌트 구현

**난이도**: ⭐⭐⭐ 중급
**예상 학습 시간**: 3-4시간

### 6.1 shadcn/ui 컴포넌트 설치

먼저 필요한 shadcn/ui 컴포넌트를 설치합니다.

```bash
# Input 컴포넌트 설치
npx shadcn@latest add input

# Card 컴포넌트 설치
npx shadcn@latest add card

# Button 컴포넌트는 이미 설치되어 있음
```

### 6.2 LoginForm 컴포넌트

**파일**: `src/components/auth/LoginForm.tsx`

```typescript
import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 로그인 폼 컴포넌트
 *
 * **기능**:
 * - 사용자 인증 정보 입력
 * - 로그인 처리 및 로딩 상태 표시
 * - 에러 처리
 */
export function LoginForm() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ username, password });
    } catch (error) {
      console.error('Login failed:', error);
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>
          계정 정보를 입력하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm bg-red-100 text-red-600 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              사용자명
            </label>
            <Input
              id="username"
              type="text"
              placeholder="사용자명을 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            테스트 계정: alice / password123
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 6.3 LogoutButton 컴포넌트

**파일**: `src/components/auth/LogoutButton.tsx`

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * 로그아웃 버튼 컴포넌트
 */
export function LogoutButton() {
  const { logout } = useAuth();

  return (
    <Button
      onClick={logout}
      variant="destructive"
    >
      로그아웃
    </Button>
  );
}
```

### 6.4 TabStatusIndicator 컴포넌트

**파일**: `src/components/tab/TabStatusIndicator.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';

/**
 * 탭 상태 인디케이터 컴포넌트
 *
 * **표시 정보**:
 * - 활성 탭 수
 * - 현재 탭 ID
 * - 주 탭 여부
 */
export function TabStatusIndicator() {
  const { activeTabs, tabId } = useAuth();
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    // 가장 오래된 탭이 주 탭
    if (activeTabs.length > 0) {
      const sorted = [...activeTabs].sort();
      setIsPrimary(sorted[0] === tabId);
    }
  }, [activeTabs, tabId]);

  return (
    <Card className="fixed bottom-4 right-4 p-4 shadow-lg">
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-medium">
            활성 탭: {activeTabs.length}
          </span>
        </div>

        <div className="text-muted-foreground">
          <div className="font-mono text-xs">
            ID: {tabId.slice(0, 16)}...
          </div>
        </div>

        {isPrimary && (
          <div className="flex items-center gap-1 text-primary font-medium">
            <span>⭐</span>
            <span>주 탭</span>
          </div>
        )}
      </div>
    </Card>
  );
}
```

### 6.5 ProtectedRoute 컴포넌트

**파일**: `src/components/ProtectedRoute.tsx`

```typescript
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 인증이 필요한 라우트를 보호하는 컴포넌트
 *
 * @example
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                로그인이 필요합니다.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    );
  }

  return <>{children}</>;
}
```

### 6.6 전체 예제 앱

**파일**: `src/App.tsx`

```typescript
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { TabStatusIndicator } from '@/components/tab/TabStatusIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AppContent() {
  const { isAuthenticated, session } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {isAuthenticated && session ? (
          <>
            {/* 사용자 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>
                  환영합니다, {session.user.username}님!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>이메일:</strong> {session.user.email}
                  </div>
                  <div>
                    <strong>사용자 ID:</strong> {session.user.id}
                  </div>
                  <div>
                    <strong>토큰:</strong>{' '}
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {session.token.slice(0, 24)}...
                    </code>
                  </div>
                  <div>
                    <strong>만료:</strong>{' '}
                    {new Date(session.expiresAt).toLocaleString()}
                  </div>
                </div>

                <LogoutButton />
              </CardContent>
            </Card>

            {/* 테스트 가이드 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💡 테스트 가이드</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>1. 새 탭을 열어보세요 (Ctrl+T) → 자동 로그인!</p>
                <p>2. 한 탭에서 로그아웃 → 모든 탭 자동 로그아웃</p>
                <p>3. 새로고침(F5) → 로그인 상태 유지</p>
                <p>4. 오른쪽 하단의 활성 탭 수 확인</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <LoginForm />
        )}
      </div>

      {/* 탭 상태 인디케이터 */}
      <TabStatusIndicator />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
```

### 체크포인트 ✅

- [ ] LoginForm 컴포넌트 작동 확인
- [ ] 로그인 폼 제출 시 인증 성공
- [ ] 로딩 상태 UI 표시 확인
- [ ] TabStatusIndicator 실시간 업데이트 확인
- [ ] 여러 탭에서 동시에 UI 변화 확인
- [ ] LogoutButton 작동 확인
- [ ] ProtectedRoute 인증 가드 작동 확인

---

## Chapter 7: 고급 기능 - 완전 종료 감지

**난이도**: ⭐⭐⭐⭐⭐ 최고급
**예상 학습 시간**: 4-6시간

### 7.1 문제 정의

**시나리오**:
```
1. 탭 A, B에서 로그인
2. 모든 탭 닫기
3. localStorage에 토큰 여전히 존재
4. 새 탭 C 열기
5. localStorage에서 토큰 발견
6. 자동 로그인? ❌ (원하지 않음!)
```

**해결 방법**:
"다른 탭이 살아있는가?"를 확인하여, 모든 탭이 닫혔다면 자동 로그아웃해야 합니다.

### 7.2 ShutdownDetector 클래스

**파일**: `src/utils/shutdownDetector/ShutdownDetector.ts`

```typescript
import { TabSync, MessageType } from '@/utils/tabSync';
import { TabManager } from '@/utils/tabManager';
import { AuthStorage } from '@/utils/auth';

/**
 * 완전 종료 감지 클래스
 *
 * **핵심 메커니즘**:
 * 1. beforeunload 시 TAB_CLOSED 브로드캐스트
 * 2. 짧은 지연 후 활성 탭 확인
 * 3. 활성 탭 = 0 이면 완전 종료로 판단
 * 4. localStorage 완전 삭제
 *
 * @example
 * const detector = new ShutdownDetector(tabSync, tabManager, authStorage);
 * // 자동으로 완전 종료 감지 및 처리
 * detector.destroy(); // cleanup
 */
export class ShutdownDetector {
  private tabSync: TabSync;
  private tabManager: TabManager;
  private authStorage: AuthStorage;
  private checkTimeout: NodeJS.Timeout | null = null;

  constructor(
    tabSync: TabSync,
    tabManager: TabManager,
    authStorage: AuthStorage
  ) {
    this.tabSync = tabSync;
    this.tabManager = tabManager;
    this.authStorage = authStorage;

    this.setupShutdownDetection();
  }

  /**
   * 완전 종료 감지 설정
   */
  private setupShutdownDetection(): void {
    // beforeunload 이벤트
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // TAB_CLOSED 메시지 수신
    this.tabSync.subscribe(MessageType.TAB_CLOSED, this.handleTabClosed);
  }

  /**
   * beforeunload 핸들러
   */
  private handleBeforeUnload = (): void => {
    console.log('[ShutdownDetector] beforeunload');

    // TAB_CLOSED 브로드캐스트
    this.tabSync.broadcast(MessageType.TAB_CLOSED);

    // 짧은 지연 후 체크
    this.scheduleCheck();
  };

  /**
   * TAB_CLOSED 메시지 핸들러
   */
  private handleTabClosed = (): void => {
    console.log('[ShutdownDetector] TAB_CLOSED received');

    // 짧은 지연 후 체크
    this.scheduleCheck();
  };

  /**
   * 완전 종료 체크 예약
   */
  private scheduleCheck(): void {
    // 기존 타이머 취소
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    // 100ms 후 체크
    this.checkTimeout = setTimeout(() => {
      this.checkCompleteShutdown();
    }, 100);
  }

  /**
   * 완전 종료 확인
   */
  private checkCompleteShutdown(): void {
    const activeTabs = this.tabManager.getActiveTabs();

    console.log('[ShutdownDetector] Active tabs:', activeTabs.length);

    if (activeTabs.length === 0) {
      // 모든 탭 닫힘 - 완전 로그아웃
      console.log('[ShutdownDetector] Complete shutdown detected!');
      this.authStorage.clearSession();
    }
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = null;
    }
  }
}
```

### 7.3 Export

**파일**: `src/utils/shutdownDetector/index.ts`

```typescript
export * from './ShutdownDetector';
```

### 7.4 useAuthStorage에 통합

**파일**: `src/hooks/useAuthStorage.ts` (수정)

```typescript
import { ShutdownDetector } from '@/utils/shutdownDetector';

export function useAuthStorage() {
  // ... 기존 코드 ...

  const shutdownDetectorRef = useRef<ShutdownDetector>();

  useEffect(() => {
    // ... 기존 초기화 코드 ...

    // ShutdownDetector 초기화
    const shutdownDetector = new ShutdownDetector(
      tabSync,
      tabManager,
      authStorage
    );
    shutdownDetectorRef.current = shutdownDetector;

    return () => {
      // ... 기존 cleanup 코드 ...
      shutdownDetector.destroy();
    };
  }, []);

  // ... 나머지 코드 ...
}
```

### 7.5 테스트 시나리오

**시나리오 1: 모든 탭 닫기**
```
1. 탭 A, B 열기
2. 로그인
3. 탭 A 닫기
   → localStorage에 토큰 유지
   → 탭 B에서 확인: activeTabs = 1

4. 탭 B 닫기 (마지막 탭)
   → beforeunload 이벤트 발생
   → TAB_CLOSED 브로드캐스트
   → 100ms 후 체크
   → activeTabs.length = 0
   → localStorage.clearSession() 호출
   → 토큰 삭제됨 ✅

5. 새 탭 C 열기
   → initializeSession() 호출
   → localStorage에 토큰 없음
   → 로그아웃 상태 ✅
```

**시나리오 2: 하나만 닫기**
```
1. 탭 A, B 열기
2. 로그인
3. 탭 A 닫기
   → beforeunload 이벤트
   → TAB_CLOSED 브로드캐스트
   → 탭 B에서 수신
   → 100ms 후 체크
   → activeTabs.length = 1 (탭 B)
   → localStorage 유지 ✅

4. 탭 B에서 확인
   → 로그인 상태 유지 ✅
```

### 체크포인트 ✅

- [ ] ShutdownDetector 클래스 구현 완료
- [ ] 마지막 탭 닫기 시 localStorage 삭제 확인
- [ ] 빠르게 탭 여닫기 시 정상 작동 확인
- [ ] 하나의 탭만 남았을 때 정상 작동 확인
- [ ] 콘솔 로그로 감지 메커니즘 이해

### 트러블슈팅

**Q: 마지막 탭을 닫아도 토큰이 삭제되지 않음**
```typescript
// A: beforeunload 이벤트가 정상 발생하는지 확인
window.addEventListener('beforeunload', () => {
  console.log('beforeunload!'); // ✅ 콘솔에 출력되어야 함
});

// 브라우저에 따라 beforeunload가 제한될 수 있음
// Chrome: 정상 작동
// Firefox: 정상 작동
// Safari: 일부 제약 있음
```

**Q: 100ms 지연이 충분하지 않음**
```typescript
// A: 지연 시간 늘리기
setTimeout(() => {
  this.checkCompleteShutdown();
}, 200); // 200ms
```

---

## Chapter 8: 최적화, 디버깅, 테스트

**난이도**: ⭐⭐⭐⭐ 고급
**예상 학습 시간**: 3-5시간

### 8.1 성능 최적화

#### 8.1.1 useMemo와 useCallback 활용

**파일**: `src/hooks/useAuthStorage.ts` (최적화)

```typescript
import { useMemo } from 'react';

export function useAuthStorage() {
  // ... 기존 코드 ...

  // 계산 결과 메모이제이션
  const isPrimaryTab = useMemo(() => {
    if (activeTabs.length === 0) return false;
    const sorted = [...activeTabs].sort();
    return sorted[0] === tabIdRef.current;
  }, [activeTabs]);

  return {
    session,
    isAuthenticated: !!session,
    login,
    logout,
    activeTabs,
    tabId: tabIdRef.current,
    isPrimaryTab, // 추가
  };
}
```

#### 8.1.2 메시지 Throttling

불필요한 메시지 전송을 줄이기 위한 throttle 유틸리티:

**파일**: `src/utils/throttle.ts`

```typescript
/**
 * Throttle 함수
 *
 * @param func - throttle할 함수
 * @param wait - 대기 시간 (ms)
 * @returns throttle된 함수
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;

    if (!timeout) {
      func.apply(this, args);
      lastArgs = null;

      timeout = setTimeout(() => {
        timeout = null;
        if (lastArgs) {
          func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, wait);
    }
  } as T;
}
```

### 8.2 디버깅 도구

#### 8.2.1 TabLogger 클래스

**파일**: `src/utils/logger/TabLogger.ts`

```typescript
import { TabSync, MessageType, TabMessage } from '@/utils/tabSync';

/**
 * 탭 메시지 로깅 클래스
 */
export class TabLogger {
  private tabSync: TabSync;
  private callbacks: Set<(msg: TabMessage) => void> = new Set();
  private logs: TabMessage[] = [];

  constructor(channelName: string, tabId: string, maxLogs: number = 100) {
    this.tabSync = new TabSync(channelName, tabId);
    this.setupLogging(maxLogs);
  }

  private setupLogging(maxLogs: number): void {
    // 모든 메시지 타입 구독
    Object.values(MessageType).forEach((type) => {
      this.tabSync.subscribe(type as MessageType, (msg) => {
        // 로그 저장
        this.logs.push(msg);
        if (this.logs.length > maxLogs) {
          this.logs.shift();
        }

        // 콜백 호출
        this.callbacks.forEach((cb) => cb(msg));
      });
    });
  }

  /**
   * 메시지 수신 콜백 등록
   */
  onMessage(callback: (msg: TabMessage) => void): void {
    this.callbacks.add(callback);
  }

  /**
   * 저장된 로그 조회
   */
  getLogs(): TabMessage[] {
    return [...this.logs];
  }

  /**
   * 로그 초기화
   */
  clearLogs(): void {
    this.logs = [];
  }

  destroy(): void {
    this.callbacks.clear();
    this.tabSync.destroy();
  }
}
```

#### 8.2.2 DebugPanel 컴포넌트

**파일**: `src/components/debug/DebugPanel.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TabLogger } from '@/utils/logger/TabLogger';
import { TabMessage } from '@/utils/tabSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<TabMessage[]>([]);
  const { session, activeTabs, tabId } = useAuth();
  const [logger, setLogger] = useState<TabLogger | null>(null);

  useEffect(() => {
    if (isOpen && !logger) {
      const newLogger = new TabLogger('debug-logger', tabId + '-debug');
      newLogger.onMessage((msg) => {
        setMessages((prev) => [...prev, msg].slice(-50));
      });
      setLogger(newLogger);

      return () => {
        newLogger.destroy();
      };
    }
  }, [isOpen, logger, tabId]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 px-3 py-2 bg-black text-white text-sm rounded shadow-lg hover:bg-gray-800"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <Card className="fixed left-4 top-4 w-96 h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">디버그 패널</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          ✕
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto space-y-4">
        {/* 현재 상태 */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm">현재 상태</h3>
          <div className="text-xs font-mono space-y-1 bg-muted p-2 rounded">
            <div>Tab: {tabId.slice(0, 16)}...</div>
            <div>Active: {activeTabs.length}</div>
            <div>Auth: {session ? '✅' : '❌'}</div>
          </div>
        </div>

        {/* 메시지 로그 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">
              메시지 ({messages.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
            >
              Clear
            </Button>
          </div>

          <div className="space-y-1 max-h-96 overflow-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className="text-xs font-mono bg-muted p-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600">[{msg.type}]</span>
                  <span className="text-gray-500">
                    {msg.tabId.slice(0, 8)}
                  </span>
                </div>
                <div className="text-gray-400 text-[10px]">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                {msg.payload && (
                  <div className="mt-1 text-[10px] text-gray-600">
                    {JSON.stringify(msg.payload, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 8.3 테스트 체크리스트

**기능 테스트**:
- [ ] 로그인 후 새 탭 열기 → 자동 로그인
- [ ] 한 탭 로그아웃 → 모든 탭 로그아웃
- [ ] 새로고침 → 로그인 유지
- [ ] 모든 탭 닫기 → 자동 로그아웃
- [ ] 5개 탭 동시 열기
- [ ] 랜덤하게 탭 열고 닫기 반복

**성능 테스트**:
- [ ] React DevTools Profiler로 리렌더링 측정
- [ ] Chrome DevTools Memory로 메모리 누수 검사
- [ ] 네트워크 탭에서 불필요한 요청 확인

**브라우저 호환성**:
- [ ] Chrome 최신 버전
- [ ] Firefox 최신 버전
- [ ] Edge 최신 버전
- [ ] Safari 15.4+ (BroadcastChannel 지원)

### 체크포인트 ✅

- [ ] 성능 최적화 적용 (useMemo, useCallback)
- [ ] DebugPanel 작동 확인
- [ ] 메시지 로그 실시간 표시
- [ ] 모든 기능 테스트 통과
- [ ] 메모리 누수 없음 확인

---

## 마무리

### 🎉 축하합니다!

다중 탭 세션 관리 시스템을 처음부터 끝까지 직접 구현하셨습니다!

### 배운 내용 요약

1. **Web Storage API**
   - localStorage와 sessionStorage의 차이와 활용법
   - Hybrid Storage 전략

2. **BroadcastChannel API**
   - 탭 간 실시간 통신
   - 타입 안전한 메시지 프로토콜

3. **탭 생명주기 관리**
   - PING/PONG 메커니즘
   - 새 탭 vs 새로고침 구분
   - 완전 종료 감지

4. **React 패턴**
   - Custom Hooks 설계
   - Context API 활용
   - 메모리 누수 방지

5. **TypeScript**
   - Generic을 활용한 타입 안전성
   - 인터페이스 설계
   - Enum 활용

### 최종 파일 구조

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── LogoutButton.tsx
│   ├── tab/
│   │   └── TabStatusIndicator.tsx
│   ├── debug/
│   │   └── DebugPanel.tsx
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   └── useAuthStorage.ts
├── utils/
│   ├── storage/
│   │   ├── types.ts
│   │   ├── LocalStorageAdapter.ts
│   │   ├── SessionStorageAdapter.ts
│   │   └── index.ts
│   ├── tabSync/
│   │   ├── types.ts
│   │   ├── TabSync.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── auth/
│   │   ├── AuthStorage.ts
│   │   ├── tabId.ts
│   │   └── index.ts
│   ├── tabManager/
│   │   ├── types.ts
│   │   ├── TabManager.ts
│   │   └── index.ts
│   ├── shutdownDetector/
│   │   ├── ShutdownDetector.ts
│   │   └── index.ts
│   ├── logger/
│   │   └── TabLogger.ts
│   └── throttle.ts
├── types/
│   └── auth.ts
└── App.tsx
```

### 다음 단계

**실전 적용**:
1. 실제 API 연동
2. JWT 토큰 만료 처리
3. Refresh Token 구현
4. 에러 바운더리 추가

**추가 기능**:
1. React Router 통합
2. 역할 기반 접근 제어 (RBAC)
3. 탭별 알림 시스템
4. 동시 편집 충돌 방지

**테스트 코드**:
1. Jest/Vitest 설정
2. 단위 테스트 작성
3. 통합 테스트 작성
4. E2E 테스트 (Playwright)

### 참고 자료

**공식 문서**:
- [BroadcastChannel API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [Web Storage API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [React Hooks - React 공식 문서](https://react.dev/reference/react)

**관련 아티클**:
- [Cross-Tab Communication](https://web.dev/cross-tab/)
- [Managing Browser Tabs](https://javascript.info/cross-window-communication)

### 피드백

이 가이드가 도움이 되셨나요? 개선할 점이 있다면 알려주세요!

---

**Happy Coding! 🚀**

*이 가이드는 실전에서 바로 사용 가능한 패턴을 담고 있습니다. 프로젝트에 적용하시고, 필요에 따라 커스터마이징하세요!*