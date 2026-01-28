# Playwright E2E 테스트

이 디렉토리는 Playwright를 사용한 End-to-End 테스트를 포함합니다.

## 📁 디렉토리 구조

```
tests/
├── auth/                      # 인증 관련 테스트
│   ├── login.spec.ts         # MSW 모킹 테스트
│   └── login-real-api.spec.ts # 실제 API 테스트
├── pages/                     # Page Object Model
│   └── LoginPage.ts
├── utils/                     # 테스트 헬퍼 함수
│   ├── test-helpers.ts
│   └── backend-check.ts      # 백엔드 서버 상태 확인
├── fixtures/                  # 테스트 픽스처
│   └── test-users.ts         # 테스트용 계정 정보
└── README.md                  # 이 파일
```

## 🚀 빠른 시작

### 1. 브라우저 설치

```bash
npx playwright install chromium
```

### 2. 테스트 실행

#### MSW 모킹 테스트 (기본)

```bash
# 모든 테스트 실행 (MSW 사용)
npm run test:e2e

# MSW 모킹 테스트만 실행
npm run test:e2e:mocked
```

#### 실제 API 테스트

**⚠️ 실행 전 확인사항:**
1. 백엔드 서버가 실행 중이어야 함 (`http://localhost:8080`)
2. 테스트용 계정이 생성되어 있어야 함

```bash
# 실제 API로 테스트 실행
npm run test:e2e:real-api

# 또는 환경 변수 직접 설정
NEXT_PUBLIC_API_MOCKING=disabled npm run test:e2e -- --project=chromium-real-api
```

#### UI 모드로 실행

```bash
# 시각적으로 테스트 확인
npm run test:e2e:ui

# 실제 API로 UI 모드 실행
NEXT_PUBLIC_API_MOCKING=disabled npm run test:e2e:ui -- --project=chromium-real-api
```

#### 디버그 모드

```bash
npm run test:e2e:debug
```

#### 테스트 리포트 보기

```bash
npm run test:e2e:report
```

## 📝 테스트 작성 가이드

### MSW 모킹 테스트

기본 테스트는 MSW를 사용합니다:

```typescript
// tests/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('로그인 테스트', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', '12345678');
  // ...
});
```

### 실제 API 테스트

실제 백엔드 API를 사용하는 테스트:

```typescript
// tests/auth/login-real-api.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { skipIfBackendNotRunning } from '../utils/backend-check';
import { getTestUsers } from '../fixtures/test-users';

test.describe('로그인 (실제 API)', () => {
  test.beforeAll(async ({ }, testInfo) => {
    await skipIfBackendNotRunning('http://localhost:8080', testInfo);
  });

  test('실제 API로 로그인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const testUsers = getTestUsers(true);
    
    await loginPage.login(
      testUsers.valid.email,
      testUsers.valid.password
    );
    // ...
  });
});
```

### Page Object Model 사용

각 페이지는 Page Object Model로 캡슐화되어 있습니다.

```typescript
import { LoginPage } from '../pages/LoginPage';

test('로그인 테스트', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', '12345678');
  // ...
});
```

### 테스트 헬퍼 사용

```typescript
import { loginAsUser } from '../utils/test-helpers';

test('워크스페이스 접근', async ({ page }) => {
  await loginAsUser(page);
  await page.goto('/workspace/1');
  // ...
});
```

## 🔧 설정

테스트 설정은 `playwright.config.ts`에서 관리됩니다.

- **기본 URL**: `http://localhost:3000` (환경 변수로 변경 가능)
- **브라우저**: Chromium (기본)
- **재시도**: CI 환경에서만 2회
- **프로젝트**:
  - `chromium-mocked`: MSW 모킹 테스트
  - `chromium-real-api`: 실제 API 테스트

## 📊 테스트 커버리지

현재 커버리지:
- ✅ 로그인 플로우 (MSW + 실제 API)
- 🔄 워크스페이스 플로우 (작성 중)
- 🔄 스튜디오 플로우 (예정)
- 🔄 라이브러리 플로우 (예정)

## 🐛 문제 해결

### 테스트가 실패하는 경우

1. **개발 서버 확인**: `http://localhost:3000` 접근 가능한지 확인
2. **MSW 확인**: 브라우저 콘솔에서 MSW가 활성화되었는지 확인
3. **백엔드 서버 확인** (실제 API 테스트): `http://localhost:8080` 접근 가능한지 확인
4. **스크린샷 확인**: `test-results/` 디렉토리의 스크린샷 확인
5. **로그 확인**: 테스트 실행 시 출력되는 에러 메시지 확인

### 실제 API 테스트 실패

1. **백엔드 서버 실행 확인**
   ```bash
   # 백엔드 서버가 실행 중인지 확인
   curl http://localhost:8080/actuator/health
   ```

2. **테스트용 계정 확인**
   - `e2e-test@example.com` 계정이 생성되어 있는지 확인
   - 비밀번호가 올바른지 확인

3. **CORS 설정 확인**
   - 백엔드 `SecurityConfig`에서 CORS가 활성화되어 있는지 확인

### Flaky 테스트

- `waitFor` 사용으로 안정적인 대기
- `data-testid` 속성 사용 권장
- 네트워크 요청 완료 대기: `waitForLoadState('networkidle')`

## 📚 참고 자료

- [테스트 전략 문서](../docs/PLAYWRIGHT_TEST_STRATEGY.md)
- [실제 API 전환 가이드](../docs/PLAYWRIGHT_REAL_API_MIGRATION.md)
- [Playwright 공식 문서](https://playwright.dev/)
