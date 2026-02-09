# 회원가입 오류 해결 정리

## 문제 1: CORS 보안 차단

### 오류 메시지
```
Access to fetch at 'http://localhost:8080/...' from origin 'null' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource
```

### 오류 판별법
메시지에 **"CORS policy"**, **"Access-Control-Allow-Origin"** 키워드가 있으면 CORS 문제

### 원인
서버가 `localhost:3000`, `localhost:8080`에서 오는 요청만 허용하도록 설정되어 있어, 로컬 HTML 파일(`file://`)에서의 요청이 차단됨

### 해결책
모든 origin에서의 요청을 허용하도록 CORS 설정 변경

### 구체적인 해결 방법
**파일:** `core-service/src/main/java/com/onetake/core/config/SecurityConfig.java`

```java
// 수정 전
configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:8080"));

// 수정 후
configuration.setAllowedOriginPatterns(List.of("*"));
```

---

## 문제 2: API 엔드포인트 불일치

### 오류 메시지
```
NoResourceFoundException: No static resource api/auth/signup
```

### 오류 판별법
메시지에 **"No static resource"** + **요청한 경로**가 있으면 해당 API 엔드포인트가 존재하지 않는 것

### 원인
HTML에서 `/api/auth/signup`으로 요청했으나, 서버의 실제 엔드포인트는 `/api/auth/register`

### 해결책
HTML의 요청 URL을 서버 엔드포인트와 일치시킴

### 구체적인 해결 방법
**파일:** `api-test-destination.html`

```javascript
// 수정 전
await apiCall('/api/auth/signup', 'POST', body, false, 'signupResponse');

// 수정 후
await apiCall('/api/auth/register', 'POST', body, false, 'signupResponse');
```

---

## 문제 3: 요청 필드명 불일치

### 오류 메시지
```
400 Bad Request
"username": "아이디는 필수입니다."
```
또는 `MethodArgumentNotValidException`

### 오류 판별법
**400 에러** + 메시지에 **필드 유효성 검사 실패** 내용이 있으면 필드명이 잘못되었거나 값이 누락된 것

### 원인
HTML에서 `loginId`로 전송했으나, 서버의 DTO는 `username` 필드를 기대함

### 해결책
HTML의 요청 필드명을 서버 DTO와 일치시킴

### 구체적인 해결 방법
**파일:** `api-test-destination.html`

```javascript
// 수정 전 (회원가입)
const body = {
    loginId: document.getElementById('signupId').value,
    password: document.getElementById('signupPassword').value,
    nickname: document.getElementById('signupNickname').value
};

// 수정 후 (회원가입)
const body = {
    username: document.getElementById('signupId').value,
    password: document.getElementById('signupPassword').value,
    nickname: document.getElementById('signupNickname').value
};
```

```javascript
// 수정 전 (로그인)
const body = {
    loginId: document.getElementById('loginId').value,
    password: document.getElementById('loginPassword').value
};

// 수정 후 (로그인)
const body = {
    username: document.getElementById('loginId').value,
    password: document.getElementById('loginPassword').value
};
```

---

## 오류 판별 요약

| 오류 키워드 | 의미 | 확인할 곳 |
|-------------|------|-----------|
| `CORS policy`, `Access-Control-Allow-Origin` | 서버가 요청 출처를 차단함 | 서버 CORS 설정 |
| `No static resource [경로]` | 해당 API 경로가 없음 | 요청 URL과 컨트롤러 매핑 비교 |
| `400 Bad Request` + 필드 유효성 메시지 | 필드명 불일치 또는 값 누락 | 요청 body와 서버 DTO 필드명 비교 |

---

## 수정 파일 요약

| 문제 | 원인 | 해결책 | 수정 파일 |
|------|------|--------|-----------|
| CORS 차단 | 허용된 origin 목록에 없음 | 모든 origin 허용 | `SecurityConfig.java` |
| 404 오류 | `/signup` ≠ `/register` | URL 통일 | `api-test-destination.html` |
| 400 오류 | `loginId` ≠ `username` | 필드명 통일 | `api-test-destination.html` |
