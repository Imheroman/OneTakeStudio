# Playwright 실제 API 테스트 전환 가이드

> 작성일: 2026-01-28  
> 목적: MSW 모킹에서 실제 백엔드 API로 점진적 전환

---

## 📋 목차

1. [전환 전략](#1-전환-전략)
2. [환경 설정](#2-환경-설정)
3. [테스트 작성 방법](#3-테스트-작성-방법)
4. [점진적 전환 계획](#4-점진적-전환-계획)
5. [문제 해결](#5-문제-해결)

---

## 1. 전환 전략

### 1.1 현재 상태

- ✅ MSW를 사용한 모킹 테스트
- ✅ 환경 변수로 MSW 제어 (`NEXT_PUBLIC_API_MOCKING`)
- ✅ 빠른 테스트 실행 (네트워크 없이)

### 1.2 전환 목표

- ✅ 실제 백엔드 API와의 통합 검증
- ✅ E2E 시나리오 완전성 확보
- ✅ 백엔드 변경사항 조기 감지
- ✅ MSW와 실제 API 병행 사용 (점진적 전환)

### 1.3 전환 원칙

1. **점진적 전환**: 한 번에 모든 테스트를 변경하지 않음
2. **선택적 사용**: 테스트별로 MSW/실제 API 선택 가능
3. **안정성 우선**: 중요한 테스트부터 실제 API로 전환
4. **병렬 실행**: MSW 테스트와 실제 API 테스트 분리

---

## 2. 환경 설정

### 2.1 환경 변수 설정

#### `.env.local` (로컬 개발)

```bash
# MSW 모킹 활성화 (개발 시)
NEXT_PUBLIC_API_MOCKING=enabled
NEXT_PUBLIC_API_URL=http://localhost:8080
```

#### `.env.test` (테스트용 - 새로 생성)

```bash
# MSW 모킹 비활성화 (실제 API 테스트)
NEXT_PUBLIC_API_MOCKING=disabled
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 2.2 Playwright 설정 업데이트

`playwright.config.ts`에 환경 변수 설정 추가:

```typescript
export default defineConfig({
  // ... 기존 설정
  
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    // 테스트 환경 변수 주입
    extraHTTPHeaders: {
      // 필요시 인증 헤더 등 추가
    },
  },
  
  // 프로젝트별 설정
  projects: [
    {
      name: 'chromium-mocked',
      use: { 
        ...devices['Desktop Chrome'],
        // MSW 사용 테스트
      },
    },
    {
      name: 'chromium-real-api',
      use: { 
        ...devices['Desktop Chrome'],
        // 실제 API 사용 테스트
      },
    },
  ],
});
```

### 2.3 테스트 실행 전 확인사항

**실제 API 테스트 실행 전 필수 확인:**

1. ✅ 백엔드 서버 실행 중 (`http://localhost:8080`)
2. ✅ 데이터베이스 연결 및 초기 데이터 준비
3. ✅ 테스트용 계정 생성 (필요시)
4. ✅ CORS 설정 확인

---

## 3. 테스트 작성 방법

### 3.1 MSW 비활성화 방법

#### 방법 1: 환경 변수로 제어 (권장)

테스트 실행 시 환경 변수 설정:

```bash
# MSW 비활성화하고 테스트 실행
NEXT_PUBLIC_API_MOCKING=disabled npm run test:e2e
```

#### 방법 2: Playwright 설정에서 제어

`playwright.config.ts`에서 환경 변수 주입:

```typescript
export default defineConfig({
  use: {
    // ... 기존 설정
  },
  
  // 환경 변수 주입
  env: {
    NEXT_PUBLIC_API_MOCKING: process.env.USE_REAL_API ? 'disabled' : 'enabled',
  },
});
```

#### 방법 3: 테스트별로 제어

개별 테스트에서 MSW 비활성화:

```typescript
test('실제 API로 로그인 테스트', async ({ page, context }) => {
  // MSW 비활성화를 위한 환경 변수 설정
  await context.addInitScript(() => {
    // @ts-ignore
    window.__MSW_DISABLED__ = true;
  });
  
  // 또는 페이지 로드 전 쿠키/로컬스토리지 설정
  await page.addInitScript(() => {
    // MSW 관련 설정 비활성화
  });
  
  // 테스트 실행
  await page.goto('/login');
  // ...
});
```

### 3.2 실제 API 테스트 예시

```typescript
// tests/auth/login-real-api.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('로그인 (실제 API)', () => {
  // 실제 백엔드 서버가 실행 중이어야 함
  test.beforeAll(async () => {
    // 백엔드 서버 상태 확인
    const response = await fetch('http://localhost:8080/actuator/health');
    if (!response.ok) {
      test.skip(true, '백엔드 서버가 실행 중이 아닙니다.');
    }
  });

  test('실제 API로 로그인 성공', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // MSW 비활성화된 환경에서 테스트
    await page.goto('/login');
    
    // 실제 테스트 계정으로 로그인
    await loginPage.login('real-test@example.com', 'real-password');
    
    // 워크스페이스로 리다이렉트 확인
    await expect(page).toHaveURL(/\/workspace\/\w+/, { timeout: 10000 });
  });
});
```

### 3.3 테스트 데이터 관리

#### 테스트용 계정 생성

실제 API 테스트를 위해 테스트용 계정이 필요합니다:

```typescript
// tests/fixtures/test-user.ts
export const TEST_USERS = {
  valid: {
    email: 'e2e-test@example.com',
    password: 'Test1234!',
    nickname: 'E2E Test User',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
};
```

#### 테스트 데이터 정리

테스트 후 데이터 정리 (선택사항):

```typescript
test.afterEach(async ({ page }) => {
  // 테스트로 생성된 데이터 정리
  // 예: 테스트 계정 삭제, 생성된 스튜디오 삭제 등
});
```

---

## 4. 점진적 전환 계획

### Phase 1: 인프라 구축 (1주차)

- [ ] `.env.test` 파일 생성
- [ ] Playwright 설정에 실제 API 프로젝트 추가
- [ ] 테스트용 계정 생성 스크립트 작성
- [ ] 백엔드 서버 상태 확인 헬퍼 함수 작성

**산출물:**
- 환경 설정 파일
- 테스트 헬퍼 함수
- 문서화

### Phase 2: 핵심 플로우 전환 (2주차)

**우선순위:**
1. 로그인 플로우 (가장 중요)
2. 워크스페이스 접근
3. 기본 네비게이션

**전환 방법:**
- 기존 MSW 테스트는 유지
- 새로운 실제 API 테스트 파일 생성 (`*-real-api.spec.ts`)
- 두 테스트 모두 CI에서 실행

### Phase 3: 주요 기능 전환 (3-4주차)

- 스튜디오 생성/수정
- 라이브러리 기능
- 채널 관리

### Phase 4: 전체 전환 및 최적화 (5주차 이후)

- MSW 테스트 점진적 제거 (선택)
- 테스트 안정성 개선
- 성능 최적화

---

## 5. 문제 해결

### 5.1 백엔드 서버가 실행되지 않음

**증상:**
```
Error: connect ECONNREFUSED 127.0.0.1:8080
```

**해결:**
1. 백엔드 서버 실행 확인
2. 포트 번호 확인 (`application.yml`)
3. 방화벽 설정 확인

**테스트에서 자동 스킵:**
```typescript
test.beforeAll(async () => {
  try {
    const response = await fetch('http://localhost:8080/actuator/health');
    if (!response.ok) {
      test.skip(true, '백엔드 서버가 실행 중이 아닙니다.');
    }
  } catch (error) {
    test.skip(true, '백엔드 서버에 연결할 수 없습니다.');
  }
});
```

### 5.2 CORS 에러

**증상:**
```
Access to fetch at 'http://localhost:8080/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**해결:**
- 백엔드 `SecurityConfig`에서 CORS 설정 확인
- `Access-Control-Allow-Origin` 헤더 확인

### 5.3 인증 토큰 문제

**증상:**
```
401 Unauthorized
```

**해결:**
- 테스트용 계정이 올바르게 생성되었는지 확인
- 토큰 만료 시간 확인
- 로그인 플로우가 정상 작동하는지 확인

### 5.4 테스트 데이터 충돌

**증상:**
- 동시 실행 시 데이터 충돌
- 이전 테스트 데이터로 인한 실패

**해결:**
- 테스트 격리 (각 테스트는 독립적으로 실행)
- 고유한 테스트 데이터 사용 (UUID, 타임스탬프)
- 테스트 후 데이터 정리

---

## 6. 실행 방법

### 6.1 MSW 사용 테스트 (기본)

```bash
# MSW 활성화된 상태로 테스트
npm run test:e2e
```

### 6.2 실제 API 테스트

```bash
# MSW 비활성화하고 실제 API로 테스트
NEXT_PUBLIC_API_MOCKING=disabled npm run test:e2e

# 또는 특정 테스트만 실행
NEXT_PUBLIC_API_MOCKING=disabled npm run test:e2e -- tests/auth/login-real-api.spec.ts
```

### 6.3 CI/CD에서 실행

```yaml
# .github/workflows/playwright.yml
- name: Run E2E tests with real API
  run: |
    # 백엔드 서버 시작
    cd ../core-service && ./mvnw spring-boot:run &
    
    # 서버 준비 대기
    sleep 30
    
    # 실제 API로 테스트 실행
    cd frontend
    NEXT_PUBLIC_API_MOCKING=disabled npm run test:e2e
```

---

## 7. 모범 사례

### 7.1 테스트 파일 명명 규칙

- MSW 사용: `login.spec.ts`
- 실제 API: `login-real-api.spec.ts`
- 또는 디렉토리 분리: `tests/mocked/`, `tests/real-api/`

### 7.2 테스트 격리

- 각 테스트는 독립적으로 실행 가능해야 함
- 테스트 간 상태 공유 지양
- 고유한 테스트 데이터 사용

### 7.3 에러 처리

- 네트워크 에러는 스킵하지 말고 명확히 표시
- 백엔드 서버 상태를 명확히 확인
- 실패 원인을 명확히 로깅

---

## 8. 체크리스트

### 전환 전 확인

- [ ] 백엔드 서버가 정상 실행됨
- [ ] 테스트용 계정 생성됨
- [ ] CORS 설정 완료
- [ ] 환경 변수 설정 완료
- [ ] Playwright 설정 업데이트 완료

### 전환 후 확인

- [ ] 테스트가 정상 실행됨
- [ ] 실제 API 응답이 올바름
- [ ] 에러 처리가 적절함
- [ ] 테스트 안정성 확보

---

## 9. 다음 단계

1. **환경 설정**: `.env.test` 파일 생성
2. **첫 실제 API 테스트**: 로그인 플로우부터 시작
3. **점진적 확장**: 다른 플로우로 확장
4. **CI/CD 통합**: 실제 API 테스트를 CI에 추가

---

**작성일**: 2026-01-28  
**최종 수정일**: 2026-01-28
