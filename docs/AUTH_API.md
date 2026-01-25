# Auth API 명세서

## Base URL
```
http://localhost:8080
```

## 공통 Response 형식
```json
{
  "success": true,
  "message": "메시지",
  "data": { ... }  // 없을 수도 있음
}
```

## 에러 Response
```json
{
  "success": false,
  "message": "에러 메시지"
}
```

---

## 1. 회원가입

### `POST /api/auth/register`

#### Request
```json
{
  "username": "testuser01",
  "password": "password123",
  "nickname": "테스터"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| username | String | O | 4-20자, 영문/숫자/언더스코어(_)만 가능 |
| password | String | O | 최소 8자 이상 |
| nickname | String | O | 2-20자 |

#### Response (성공)
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다."
}
```

#### Response (실패 - 유효성 검증)
```json
{
  "success": false,
  "message": "아이디는 4-20자의 영문, 숫자, 언더스코어만 가능합니다."
}
```

#### Response (실패 - 중복 아이디)
```json
{
  "success": false,
  "message": "이미 사용 중인 아이디입니다."
}
```

---

## 2. 로그인

### `POST /api/auth/login`

#### Request
```json
{
  "username": "testuser01",
  "password": "password123"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| username | String | O | 아이디 |
| password | String | O | 비밀번호 |

#### Response (성공)
```json
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
    "user": {
      "userId": 1,
      "username": "testuser01",
      "nickname": "테스터",
      "profileImageUrl": null
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| accessToken | String | JWT Access Token (유효기간: 1시간) |
| refreshToken | String | JWT Refresh Token (유효기간: 7일) |
| user.userId | Long | 사용자 고유 ID |
| user.username | String | 아이디 |
| user.nickname | String | 닉네임 |
| user.profileImageUrl | String | 프로필 이미지 URL (없으면 null) |

#### Response (실패)
```json
{
  "success": false,
  "message": "아이디 또는 비밀번호가 올바르지 않습니다."
}
```

---

## 3. 토큰 갱신

### `POST /api/auth/refresh`

Access Token이 만료되었을 때 Refresh Token으로 새 토큰을 발급받습니다.

#### Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| refreshToken | String | O | 로그인 시 발급받은 Refresh Token |

#### Response (성공)
```json
{
  "success": true,
  "message": "토큰 갱신 성공",
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
  }
}
```

#### Response (실패)
```json
{
  "success": false,
  "message": "유효하지 않은 Refresh Token입니다."
}
```

---

## 4. 아이디 중복 확인

### `GET /api/auth/check-username`

#### Request (Query Parameter)
```
GET /api/auth/check-username?username=testuser01
```

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| username | String | O | 확인할 아이디 |

#### Response (사용 가능)
```json
{
  "success": true,
  "message": "사용 가능한 아이디입니다.",
  "data": true
}
```

#### Response (이미 사용 중)
```json
{
  "success": true,
  "message": "이미 사용 중인 아이디입니다.",
  "data": false
}
```

---

## 인증이 필요한 API 호출 방법

로그인 후 발급받은 `accessToken`을 Header에 포함해서 요청합니다.

### Header
```
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
```

### 예시 (JavaScript fetch)
```javascript
const response = await fetch('http://localhost:8080/api/some-protected-endpoint', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### 예시 (Axios)
```javascript
// axios instance 설정
const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 인터셉터로 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 에러 시 토큰 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // 원래 요청 재시도
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return api.request(error.config);
        } catch (e) {
          // 리프레시도 실패하면 로그아웃 처리
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## JWT Token 정보

### Access Token Payload
```json
{
  "sub": "1",
  "username": "testuser01",
  "nickname": "테스터",
  "type": "access",
  "iat": 1700000000,
  "exp": 1700003600
}
```

| 필드 | 설명 |
|------|------|
| sub | 사용자 ID |
| username | 아이디 |
| nickname | 닉네임 |
| type | 토큰 타입 (access) |
| iat | 발급 시간 (Unix timestamp) |
| exp | 만료 시간 (Unix timestamp) |

### Refresh Token Payload
```json
{
  "sub": "1",
  "type": "refresh",
  "iat": 1700000000,
  "exp": 1700604800
}
```

---

## 에러 코드

| HTTP Status | 설명 |
|-------------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (유효성 검증 실패) |
| 401 | 인증 실패 (토큰 없음/만료/잘못됨) |
| 500 | 서버 에러 |
