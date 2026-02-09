# Playwright 테스트 전략 및 점진적 도입 계획

> 작성일: 2026-01-28  
> 작성자: 프론트엔드 개발팀

---

## 📋 목차

1. [Playwright 타당성 검토](#1-playwright-타당성-검토)
2. [현재 프로젝트 상황 분석](#2-현재-프로젝트-상황-분석)
3. [테스트 전략](#3-테스트-전략)
4. [점진적 도입 계획](#4-점진적-도입-계획)
5. [구현 가이드](#5-구현-가이드)
6. [CI/CD 통합](#6-cicd-통합)

---

## 1. Playwright 타당성 검토

### ✅ Playwright를 선택해야 하는 이유

#### 1.1 현재 프로젝트 상황에 적합

- **MSA 구조**: 백엔드와 프론트엔드가 분리되어 있어 E2E 테스트가 필수
- **Next.js App Router**: 최신 Next.js 기능을 완벽 지원
- **팀 협업 환경**: 백엔드 변경사항이 프론트엔드에 미치는 영향 조기 발견
- **MSW 통합 가능**: 기존 MSW 모킹과 함께 사용 가능

#### 1.2 기술적 장점

| 항목 | Playwright | Cypress | Selenium |
|------|-----------|---------|----------|
| **속도** | ⭐⭐⭐⭐⭐ 매우 빠름 | ⭐⭐⭐ 보통 | ⭐⭐ 느림 |
| **안정성** | ⭐⭐⭐⭐⭐ 높음 | ⭐⭐⭐ 보통 | ⭐⭐ 낮음 |
| **다중 브라우저** | ⭐⭐⭐⭐⭐ 네이티브 지원 | ⭐⭐⭐ 제한적 | ⭐⭐⭐⭐ 좋음 |
| **TypeScript** | ⭐⭐⭐⭐⭐ 완벽 지원 | ⭐⭐⭐⭐ 좋음 | ⭐⭐ 제한적 |
| **Next.js 지원** | ⭐⭐⭐⭐⭐ 완벽 | ⭐⭐⭐⭐ 좋음 | ⭐⭐⭐ 보통 |
| **학습 곡선** | ⭐⭐⭐⭐ 쉬움 | ⭐⭐⭐⭐ 쉬움 | ⭐⭐ 어려움 |
| **MSW 통합** | ⭐⭐⭐⭐⭐ 가능 | ⭐⭐⭐⭐ 가능 | ⭐⭐⭐ 제한적 |

#### 1.3 비용 대비 효과

- **무료 오픈소스**: 상업적 사용도 무료
- **빠른 피드백**: 병렬 실행으로 테스트 시간 단축
- **디버깅 도구**: 내장된 트레이서와 UI 모드로 디버깅 용이
- **자동 대기**: 자동으로 요소가 나타날 때까지 대기하여 flaky 테스트 감소

### ❌ 대안 검토

#### Cypress
- ✅ 좋은 개발자 경험
- ❌ 브라우저 제한 (Chromium 기반)
- ❌ 병렬 실행이 제한적
- ❌ 큰 프로젝트에서 성능 이슈

#### Selenium
- ✅ 오래된 표준
- ❌ 느린 실행 속도
- ❌ 복잡한 설정
- ❌ TypeScript 지원 부족

#### React Testing Library (단위 테스트)
- ✅ 컴포넌트 단위 테스트에 적합
- ❌ E2E 시나리오 테스트 불가
- ❌ 백엔드 통합 테스트 불가

**결론: Playwright가 현재 프로젝트에 가장 적합합니다** ✅

---

## 2. 현재 프로젝트 상황 분석

### 2.1 기술 스택

```
프론트엔드:
- Next.js 16.1.4 (App Router)
- React 19.2.3
- TypeScript 5
- Zustand (상태 관리)
- MSW 2.12.7 (API 모킹)
- Tailwind CSS 4

백엔드:
- Spring Boot (MSA)
- API Gateway (포트 8080)
- Core Service, Media Service
```

### 2.2 주요 기능 영역

1. **인증 (Auth)**
   - 로그인/회원가입
   - OAuth (Google, Kakao, Naver)
   - 이메일 인증
   - 비밀번호 재설정

2. **워크스페이스**
   - 워크스페이스 홈
   - 멤버 관리
   - 알림

3. **스튜디오**
   - 스튜디오 생성/수정
   - 라이브 스트리밍 설정
   - 소스 관리 (비디오, 오디오, 이미지, 텍스트)
   - 레이아웃 제어

4. **라이브러리**
   - 비디오 목록 조회
   - 비디오 상세
   - 쇼츠 생성

5. **채널 관리**
   - 채널 연결 (YouTube, Twitch 등)
   - OAuth 콜백 처리

6. **스토리지**
   - 파일 업로드/다운로드
   - 파일 목록 조회

### 2.3 현재 테스트 상태

- ❌ E2E 테스트: 없음
- ❌ 단위 테스트: 없음
- ✅ MSW 모킹: 설정됨
- ✅ TypeScript: 타입 안정성 확보

### 2.4 위험 요소

1. **백엔드 API 변경**
   - API 스펙 변경 시 프론트엔드 깨짐
   - 응답 형식 변경 감지 어려움

2. **라우팅 문제**
   - Next.js App Router 경로 변경
   - 인증 리다이렉트 로직

3. **상태 관리**
   - Zustand 스토어 동기화
   - 로컬 스토리지/세션 스토리지

4. **OAuth 통합**
   - 외부 서비스 의존성
   - 콜백 처리 로직

---

## 3. 테스트 전략

### 3.1 테스트 피라미드

```
        /\
       /  \  E2E 테스트 (Playwright)
      /____\  10-20% - 핵심 사용자 플로우
     /      \ 
    /________\ 통합 테스트
   /          \ 30-40% - 주요 기능 통합
  /____________\
 /              \ 단위 테스트 (향후)
/________________\ 40-50% - 컴포넌트/유틸리티
```

### 3.2 테스트 우선순위

#### 🔴 P0 (최우선) - 핵심 사용자 플로우

1. **인증 플로우**
   - 회원가입 → 이메일 인증 → 로그인
   - 로그인 → 워크스페이스 접근
   - OAuth 로그인 (Google)

2. **워크스페이스 플로우**
   - 로그인 → 워크스페이스 홈 접근
   - 스튜디오 생성 → 스튜디오 페이지 접근

3. **기본 네비게이션**
   - 로그인 → 각 메인 페이지 접근 (라이브러리, 채널, 스토리지)

#### 🟡 P1 (중요) - 주요 기능

1. **스튜디오 기능**
   - 스튜디오 생성
   - 소스 추가/제거
   - 레이아웃 변경

2. **라이브러리**
   - 비디오 목록 조회
   - 비디오 상세 조회
   - 필터링

3. **채널 관리**
   - 채널 목록 조회
   - 채널 연결 시작 (OAuth 플로우)

#### 🟢 P2 (선택) - 부가 기능

1. **마이페이지**
   - 프로필 수정
   - 비밀번호 변경

2. **알림**
   - 알림 목록 조회
   - 알림 읽음 처리

### 3.3 테스트 전략 원칙

1. **실제 사용자 시나리오 중심**
   - 사용자가 실제로 하는 행동을 테스트
   - 기술적 세부사항보다 비즈니스 로직에 집중

2. **안정성 우선**
   - Flaky 테스트 방지 (자동 대기, 고유 선택자 사용)
   - 테스트 격리 (각 테스트는 독립적으로 실행 가능)

3. **유지보수성**
   - Page Object Model 패턴 사용
   - 재사용 가능한 헬퍼 함수
   - 명확한 테스트 이름

4. **점진적 확장**
   - 작은 것부터 시작
   - 점진적으로 커버리지 확대

---

## 4. 점진적 도입 계획

### Phase 1: 기반 구축 (1주차)

**목표**: Playwright 설정 및 기본 인프라 구축

- [ ] Playwright 설치 및 설정
- [ ] 기본 프로젝트 구조 생성
- [ ] 테스트 환경 설정 (로컬, 개발 서버)
- [ ] MSW 통합 설정
- [ ] CI/CD 기본 파이프라인 구성

**산출물**:
- `playwright.config.ts`
- 기본 테스트 디렉토리 구조
- GitHub Actions 워크플로우 (선택)

**예상 시간**: 4-6시간

---

### Phase 2: 핵심 플로우 테스트 (2주차)

**목표**: 가장 중요한 사용자 플로우 테스트 작성

- [ ] 인증 플로우 테스트 (로그인, 회원가입)
- [ ] 워크스페이스 접근 테스트
- [ ] 기본 네비게이션 테스트

**산출물**:
- `tests/auth.spec.ts`
- `tests/navigation.spec.ts`
- Page Object 모델 (기본)

**예상 시간**: 8-12시간

---

### Phase 3: 주요 기능 테스트 (3-4주차)

**목표**: 주요 기능 영역 테스트 확장

- [ ] 스튜디오 생성/수정 테스트
- [ ] 라이브러리 기능 테스트
- [ ] 채널 관리 테스트

**산출물**:
- `tests/studio.spec.ts`
- `tests/library.spec.ts`
- `tests/channels.spec.ts`
- Page Object 모델 확장

**예상 시간**: 12-16시간

---

### Phase 4: 고도화 및 최적화 (5주차 이후)

**목표**: 테스트 안정성 향상 및 커버리지 확대

- [ ] 테스트 리팩토링 (중복 제거)
- [ ] 성능 테스트 추가
- [ ] 시각적 회귀 테스트 (선택)
- [ ] 테스트 리포트 자동화

**예상 시간**: 지속적 개선

---

## 5. 구현 가이드

### 5.1 설치

```bash
cd frontend
npm install -D @playwright/test
npx playwright install
```

### 5.2 프로젝트 구조

```
frontend/
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── signup.spec.ts
│   │   └── oauth.spec.ts
│   ├── workspace/
│   │   └── workspace.spec.ts
│   ├── studio/
│   │   └── studio.spec.ts
│   ├── library/
│   │   └── library.spec.ts
│   ├── fixtures/
│   │   ├── auth.fixture.ts
│   │   └── api.fixture.ts
│   ├── pages/
│   │   ├── LoginPage.ts
│   │   ├── WorkspacePage.ts
│   │   └── StudioPage.ts
│   └── utils/
│       ├── test-helpers.ts
│       └── msw-handlers.ts
├── playwright.config.ts
└── package.json
```

### 5.3 기본 설정 (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.4 예시 테스트 (tests/auth/login.spec.ts)

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('로그인', () => {
  test('이메일/비밀번호로 로그인 성공', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.fillEmail('test@example.com');
    await loginPage.fillPassword('12345678');
    await loginPage.clickLogin();
    
    // 워크스페이스로 리다이렉트 확인
    await expect(page).toHaveURL(/\/workspace\/\w+/);
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.fillEmail('wrong@example.com');
    await loginPage.fillPassword('wrongpassword');
    await loginPage.clickLogin();
    
    // 에러 메시지 확인
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('이메일 또는 비밀번호');
  });
});
```

### 5.5 Page Object 예시 (tests/pages/LoginPage.ts)

```typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('이메일');
    this.passwordInput = page.getByLabel('비밀번호');
    this.loginButton = page.getByRole('button', { name: '로그인' });
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickLogin() {
    await this.loginButton.click();
  }
}
```

### 5.6 MSW 통합

```typescript
// tests/utils/msw-handlers.ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  http.post('http://localhost:8080/api/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com' && body.password === '12345678') {
      return HttpResponse.json({
        success: true,
        data: {
          user: { userId: '1', email: 'test@example.com', nickname: 'Test User' },
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
        },
      });
    }
    return HttpResponse.json(
      { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 }
    );
  }),
];

export const server = setupServer(...handlers);
```

```typescript
// playwright.config.ts에 추가
import { setupServer } from 'msw/node';
import { handlers } from './tests/utils/msw-handlers';

const server = setupServer(...handlers);

export default defineConfig({
  // ... 기존 설정
  
  globalSetup: async () => {
    server.listen({ onUnhandledRequest: 'bypass' });
  },
  
  globalTeardown: async () => {
    server.close();
  },
});
```

---

## 6. CI/CD 통합

### 6.1 GitHub Actions 예시

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
      
      - name: Install Playwright Browsers
        working-directory: frontend
        run: npx playwright install --with-deps
      
      - name: Run Playwright tests
        working-directory: frontend
        run: npx playwright test
        env:
          PLAYWRIGHT_TEST_BASE_URL: ${{ secrets.TEST_BASE_URL || 'http://localhost:3000' }}
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30
```

### 6.2 package.json 스크립트 추가

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## 7. 모니터링 및 유지보수

### 7.1 테스트 실행 전략

- **로컬 개발**: 변경사항 커밋 전 실행
- **PR 전**: 주요 플로우만 빠르게 실행
- **병합 전**: 전체 테스트 실행
- **정기 실행**: 매일 밤 전체 테스트 실행 (선택)

### 7.2 Flaky 테스트 관리

1. **자동 재시도**: `retries: 2` 설정
2. **안정적인 선택자 사용**: `data-testid` 속성 활용
3. **명시적 대기**: `waitFor` 사용
4. **격리된 테스트**: 각 테스트는 독립적으로 실행 가능

### 7.3 테스트 커버리지 목표

- **Phase 1**: 핵심 플로우 80% 커버
- **Phase 2**: 주요 기능 60% 커버
- **Phase 3**: 전체 기능 40% 커버

---

## 8. 예상 효과

### 8.1 단기 효과 (1-2개월)

- ✅ 백엔드 API 변경 시 즉시 감지
- ✅ 리팩토링 시 회귀 버그 방지
- ✅ 배포 전 주요 기능 검증

### 8.2 장기 효과 (3개월 이상)

- ✅ 버그 감소 (예상 30-50%)
- ✅ 배포 신뢰도 향상
- ✅ 개발 속도 향상 (자동화로 수동 테스트 시간 절약)
- ✅ 팀원 간 신뢰도 향상

---

## 9. 다음 단계

1. **팀 리뷰**: 이 문서를 팀원들과 공유하고 피드백 수집
2. **Phase 1 시작**: Playwright 설치 및 기본 설정
3. **첫 테스트 작성**: 로그인 플로우부터 시작
4. **점진적 확장**: 성공 경험을 바탕으로 점진적 확대

---

## 10. 참고 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing)
- [MSW 공식 문서](https://mswjs.io/)

---

**작성일**: 2026-01-28  
**최종 수정일**: 2026-01-28
