# Playwright 실제 API 테스트 빠른 시작 가이드

> 작성일: 2026-01-28

---

## 🚀 빠른 시작

### 1. 백엔드 서버 실행 확인

**필수 확인사항:**

```bash
# 백엔드 서버가 실행 중인지 확인
curl http://localhost:8080/actuator/health
```

서버가 실행 중이 아니면:
- Core Service 실행
- API Gateway 실행 (포트 8080)

### 2. 테스트용 계정 생성

실제 API 테스트를 위해 테스트용 계정이 필요합니다.

**백엔드에서 계정 생성:**
- 이메일: `e2e-test@example.com`
- 비밀번호: `Test1234!`
- 닉네임: `E2E Test User`

또는 회원가입 API를 통해 생성:

```bash
# 회원가입 API 호출 (예시)
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e-test@example.com",
    "password": "Test1234!",
    "nickname": "E2E Test User",
    "verificationCode": "123456"
  }'
```

### 3. 실제 API 테스트 실행

```bash
# 실제 API로 테스트 실행
npm run test:e2e:real-api
```

또는 환경 변수 직접 설정:

```bash
NEXT_PUBLIC_API_MOCKING=disabled npm run test:e2e -- --project=chromium-real-api
```

### 4. 테스트 결과 확인

```bash
# HTML 리포트 보기
npm run test:e2e:report
```

---

## 📝 테스트 파일 구조

### MSW 모킹 테스트
- 파일명: `*.spec.ts` (예: `login.spec.ts`)
- 실행: `npm run test:e2e:mocked`

### 실제 API 테스트
- 파일명: `*-real-api.spec.ts` (예: `login-real-api.spec.ts`)
- 실행: `npm run test:e2e:real-api`

---

## ⚠️ 주의사항

1. **백엔드 서버 필수**: 실제 API 테스트는 백엔드 서버가 실행 중이어야 함
2. **테스트 데이터**: 테스트용 계정이 미리 생성되어 있어야 함
3. **데이터 정리**: 테스트 후 생성된 데이터 정리 고려 (선택사항)
4. **병렬 실행**: 실제 API 테스트는 동시 실행 시 데이터 충돌 가능

---

## 🔧 문제 해결

### 백엔드 서버 연결 실패

```
Error: connect ECONNREFUSED 127.0.0.1:8080
```

**해결:**
1. 백엔드 서버 실행 확인
2. 포트 번호 확인
3. 방화벽 설정 확인

### CORS 에러

```
Access to fetch at 'http://localhost:8080/api/...' has been blocked by CORS policy
```

**해결:**
- 백엔드 `SecurityConfig`에서 CORS 설정 확인
- `Access-Control-Allow-Origin` 헤더 확인

### 401 Unauthorized

**해결:**
- 테스트용 계정이 올바르게 생성되었는지 확인
- 비밀번호가 올바른지 확인
- `tests/fixtures/test-users.ts`의 계정 정보 확인

---

## 📚 더 자세한 정보

- [전환 가이드](PLAYWRIGHT_REAL_API_MIGRATION.md)
- [테스트 전략](PLAYWRIGHT_TEST_STRATEGY.md)
