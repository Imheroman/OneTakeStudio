# Playwright E2E 테스트

이 디렉토리는 Playwright를 사용한 End-to-End 테스트를 포함합니다.

## 📁 디렉토리 구조

```
tests/
├── auth/              # 인증 관련 테스트
│   └── login.spec.ts
├── pages/             # Page Object Model
│   └── LoginPage.ts
├── utils/             # 테스트 헬퍼 함수
│   └── test-helpers.ts
├── fixtures/          # 테스트 픽스처 (향후 추가)
└── README.md         # 이 파일
```

## 🚀 빠른 시작

### 1. 브라우저 설치

```bash
npx playwright install chromium
```

### 2. 테스트 실행

```bash
# 모든 테스트 실행
npm run test:e2e

# UI 모드로 실행 (시각적으로 테스트 확인)
npm run test:e2e:ui

# 디버그 모드로 실행
npm run test:e2e:debug

# 테스트 리포트 보기
npm run test:e2e:report
```

## 📝 테스트 작성 가이드

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

- 기본 URL: `http://localhost:3000` (환경 변수로 변경 가능)
- 브라우저: Chromium (기본)
- 재시도: CI 환경에서만 2회

## 📊 테스트 커버리지

현재 커버리지:
- ✅ 로그인 플로우
- 🔄 워크스페이스 플로우 (작성 중)
- 🔄 스튜디오 플로우 (예정)
- 🔄 라이브러리 플로우 (예정)

## 🐛 문제 해결

### 테스트가 실패하는 경우

1. 개발 서버가 실행 중인지 확인: `npm run dev`
2. 브라우저가 설치되었는지 확인: `npx playwright install`
3. 스크린샷 확인: `test-results/` 디렉토리
4. 리포트 확인: `npm run test:e2e:report`

### Flaky 테스트

- `waitFor` 사용으로 안정적인 대기
- `data-testid` 속성 사용 권장
- 네트워크 요청 완료 대기: `waitForLoadState('networkidle')`

## 📚 참고 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [테스트 전략 문서](../docs/PLAYWRIGHT_TEST_STRATEGY.md)
