# OneTakeStudio API 명세서

## API 목록

## Core Service APIs

### 인증 (Auth)

| 메서드 | URL | 설명 | 인증 |
|--------|-----|------|------|
| POST | /api/auth/register | 회원가입 (인증 코드 발송) | X |
| POST | /api/auth/verify-email | 이메일 인증 코드 확인 | X |
| POST | /api/auth/resend-verification | 인증 코드 재발송 | X |
| POST | /api/auth/login | 로그인 | X |
| POST | /api/auth/forgot-password | 비밀번호 재설정 요청 | X |
| POST | /api/auth/reset-password | 비밀번호 재설정 | X |
| POST | /api/auth/refresh | 토큰 갱신 | X |
| POST | /api/auth/logout | 로그아웃 | O |

#### POST /api/auth/register - 회원가입
```json
// Request
{
  "email": "user@example.com",
  "password": "password123!",
  "nickname": "테스트유저"
}

// Response (200 OK)
{
  "success": true,
  "message": "인증 코드가 이메일로 발송되었습니다. 5분 내에 인증해주세요."
}
```

#### POST /api/auth/verify-email - 이메일 인증
```json
// Request
{
  "email": "user@example.com",
  "code": "123456"
}

// Response (200 OK)
{
  "success": true,
  "message": "이메일 인증이 완료되었습니다. 로그인해주세요."
}
```

#### POST /api/auth/login - 로그인
```json
// Request
{
  "email": "user@example.com",
  "password": "password123!"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "테스트유저",
      "profileImageUrl": null
    }
  }
}
```

#### POST /api/auth/forgot-password - 비밀번호 재설정 요청
```json
// Request
{
  "email": "user@example.com"
}

// Response (200 OK)
{
  "success": true,
  "message": "비밀번호 재설정 링크가 이메일로 발송되었습니다."
}
```

#### POST /api/auth/reset-password - 비밀번호 재설정
```json
// Request
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "newPassword123!"
}

// Response (200 OK)
{
  "success": true,
  "message": "비밀번호가 변경되었습니다."
}
```


### 사용자 (User)


### 스튜디오 (Studio)


### 씬/레이아웃 (Scene)


### 멤버/협업 (Member & Collaboration)


### 송출채널 (Destination)


---

## Media Service APIs

### 녹화/클립 (Recording & Clips)


### 채팅 (Chat)


### 알림 (Notification)


### 스토리지/에셋 (Storage & Assets)


---

## AI Service APIs


---

## 주요 API 엔드포인트 상세

자세한 API 스펙은 개별 HTML 파일을 참조하세요.

위치: `/mnt/user-data/uploads/API명세서_C206.zip` (압축 해제 후 사용)
