# Playwright Phase 1 설정 완료 ✅

> 작성일: 2026-01-28

---

## ✅ 완료된 작업

### 1. Playwright 설치
- ✅ `@playwright/test` 패키지 설치 완료
- ✅ `package.json`에 테스트 스크립트 추가

### 2. 설정 파일 생성
- ✅ `playwright.config.ts` 생성
  - 기본 URL: `http://localhost:3000`
  - Chromium 브라우저 설정
  - 개발 서버 자동 실행 설정
  - 리포트 설정 (HTML, List)

### 3. 프로젝트 구조 생성
```
frontend/
├── tests/
│   ├── auth/
│   │   └── login.spec.ts          # 로그인 테스트
│   ├── pages/
│   │   └── LoginPage.ts           # 로그인 페이지 POM
│   ├── utils/
│   │   └── test-helpers.ts        # 테스트 헬퍼 함수
│   ├── fixtures/                  # 향후 사용
│   └── README.md                  # 테스트 가이드
└── playwright.config.ts
```

### 4. 첫 테스트 작성
- ✅ 로그인 페이지 테스트 (`tests/auth/login.spec.ts`)
  - 페이지 로드 확인
  - 입력 필드 표시 확인
  - 로그인 성공/실패 시나리오
  - 유효성 검사 테스트
  - 회원가입 링크 테스트

### 5. Page Object Model
- ✅ `LoginPage` 클래스 생성
  - 재사용 가능한 메서드
  - 명확한 선택자 관리

### 6. 테스트 헬퍼 함수
- ✅ `test-helpers.ts` 생성
  - `loginAsUser()` - 로그인 헬퍼
  - `logout()` - 로그아웃 헬퍼
  - `navigateTo()` - 페이지 이동 헬퍼
  - `waitForAPIResponse()` - API 응답 대기 헬퍼

### 7. Git 설정
- ✅ `.gitignore`에 Playwright 결과 파일 추가

---

## 🚀 다음 단계

### 1. 브라우저 설치 (필수)

터미널에서 다음 명령어 실행:

```bash
cd frontend
npx playwright install chromium
```

또는 모든 브라우저 설치:

```bash
npx playwright install
```

### 2. 첫 테스트 실행

개발 서버가 실행 중이어야 합니다:

```bash
# 터미널 1: 개발 서버 실행
npm run dev

# 터미널 2: 테스트 실행
npm run test:e2e
```

### 3. UI 모드로 테스트 확인 (권장)

시각적으로 테스트를 확인하고 싶다면:

```bash
npm run test:e2e:ui
```

### 4. 테스트 결과 확인

테스트 실행 후 리포트 확인:

```bash
npm run test:e2e:report
```

---

## 📝 테스트 실행 전 확인사항

1. **개발 서버 실행**: `npm run dev`로 `http://localhost:3000` 접근 가능해야 함
2. **MSW 설정**: MSW가 정상 작동하는지 확인
3. **환경 변수**: `.env.local`에 `NEXT_PUBLIC_API_URL` 설정 확인

---

## 🔧 문제 해결

### 브라우저 설치 실패

Windows에서 권한 문제가 발생할 수 있습니다. 관리자 권한으로 실행하거나:

```bash
# PowerShell을 관리자 권한으로 실행 후
cd frontend
npx playwright install chromium
```

### 테스트가 실패하는 경우

1. **개발 서버 확인**: `http://localhost:3000` 접근 가능한지 확인
2. **MSW 확인**: 브라우저 콘솔에서 MSW가 활성화되었는지 확인
3. **스크린샷 확인**: `test-results/` 디렉토리의 스크린샷 확인
4. **로그 확인**: 테스트 실행 시 출력되는 에러 메시지 확인

### 로그인 테스트 실패

MSW 핸들러가 올바르게 설정되어 있는지 확인:

```typescript
// src/mock/handlers.ts에서 로그인 핸들러 확인
http.post(`${BASE_URL}/api/v1/auth/login`, async ({ request }) => {
  // ...
});
```

---

## 📊 현재 상태

- ✅ Phase 1: 기반 구축 **완료**
- 🔄 Phase 2: 핵심 플로우 테스트 (다음 단계)
  - 워크스페이스 접근 테스트
  - 기본 네비게이션 테스트

---

## 🎯 다음 작업 (Phase 2)

1. **워크스페이스 테스트 작성**
   - `tests/workspace/workspace.spec.ts`
   - `tests/pages/WorkspacePage.ts`

2. **네비게이션 테스트 작성**
   - `tests/navigation.spec.ts`

3. **테스트 안정성 개선**
   - Flaky 테스트 방지
   - 더 나은 대기 전략

---

## 📚 참고 자료

- [테스트 전략 문서](./PLAYWRIGHT_TEST_STRATEGY.md)
- [테스트 가이드](../tests/README.md)
- [Playwright 공식 문서](https://playwright.dev/)

---

**다음 단계**: 브라우저 설치 후 첫 테스트를 실행해보세요! 🚀
