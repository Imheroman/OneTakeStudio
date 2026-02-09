# User ID (UUID) 가이드

## 개요

OneTakeStudio에서는 사용자 식별을 위해 **두 가지 ID**를 사용합니다.

| 필드 | 타입 | 용도 | 노출 여부 |
|------|------|------|----------|
| `id` | Long (1, 2, 3...) | DB 내부 PK | 절대 노출 안함 |
| `userId` | UUID (문자열) | 외부 식별자 | API 응답, URL에 사용 |

---

## 왜 UUID를 사용하는가?

### 보안 문제: 순차 ID 노출

```
❌ 위험한 방식
GET /api/users/1
GET /api/users/2
GET /api/users/3

→ 공격자가 ID를 1부터 순서대로 시도하면 모든 사용자 정보 조회 가능
→ "현재 152번 사용자까지 있구나" 추측 가능
```

### 해결: UUID 사용

```
✅ 안전한 방식
GET /api/users/2f7e50af-774c-49bf-82ca-07eb702e85d9
GET /api/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890

→ 무작위 문자열이라 추측 불가능
→ 다른 사용자의 UUID를 알 수 없음
```

---

## 백엔드 구조

### User 엔티티

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;                    // DB 내부용 (외부 노출 X)

    @Column(unique = true, nullable = false)
    private String userId;              // 외부 노출용 UUID

    private String email;               // 로그인용
    private String nickname;
    // ...
}
```

### UUID 생성 시점

```java
@PrePersist
public void prePersist() {
    if (this.userId == null) {
        this.userId = UUID.randomUUID().toString();
    }
}
```
→ 회원가입 시 DB 저장 직전에 자동 생성

---

## API 응답 예시

### 로그인 응답

```json
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
    "user": {
      "userId": "2f7e50af-774c-49bf-82ca-07eb702e85d9",
      "email": "user@gmail.com",
      "nickname": "은태현",
      "profileImageUrl": "https://..."
    }
  }
}
```

### 프로필 조회 응답

```json
{
  "success": true,
  "data": {
    "userId": "2f7e50af-774c-49bf-82ca-07eb702e85d9",
    "email": "user@gmail.com",
    "nickname": "은태현",
    "profileImageUrl": "https://...",
    "createdAt": "2026-01-26T21:30:00"
  }
}
```

---

## JWT 토큰 구조

```json
{
  "sub": "2f7e50af-774c-49bf-82ca-07eb702e85d9",  // userId (UUID)
  "email": "user@gmail.com",
  "nickname": "은태현",
  "type": "access",
  "iat": 1769431331,
  "exp": 1769434931
}
```

→ 토큰의 `sub`(subject)에 UUID 저장

---

## API 엔드포인트

### 사용자 관련 API

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/users/me` | 내 프로필 조회 | 토큰 필요 |
| PUT | `/api/users/me` | 내 프로필 수정 | 토큰 필요 |
| GET | `/api/users/{userId}` | 특정 사용자 조회 | 토큰 필요 |

### URI 예시

```
# 내 프로필 (토큰으로 식별)
GET /api/users/me

# 다른 사용자 프로필 (UUID 사용)
GET /api/users/2f7e50af-774c-49bf-82ca-07eb702e85d9
```

---

## 프론트엔드 가이드

### 1. 로그인 시 userId 저장

```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();

if (data.success) {
  // 토큰 저장
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);

  // 사용자 정보 저장 (userId 포함)
  localStorage.setItem('user', JSON.stringify(data.data.user));
}
```

### 2. 내 정보 조회 (userId 필요 없음)

```javascript
// /me 엔드포인트는 토큰으로 사용자 식별
const response = await fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

### 3. 다른 사용자 조회 (userId 필요)

```javascript
// 백엔드 응답에서 받은 userId 사용
const userId = "2f7e50af-774c-49bf-82ca-07eb702e85d9";

const response = await fetch(`/api/users/${userId}`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

### 4. 주의사항

```javascript
// ❌ 잘못된 방식 - 숫자 ID 사용
fetch('/api/users/1');

// ✅ 올바른 방식 - UUID 사용
fetch('/api/users/2f7e50af-774c-49bf-82ca-07eb702e85d9');

// ✅ 내 정보는 /me 사용
fetch('/api/users/me');
```

---

## 요약

| 상황 | 사용할 것 |
|------|----------|
| 내 정보 조회/수정 | `/api/users/me` + 토큰 |
| 다른 사용자 조회 | `/api/users/{userId}` (백엔드 응답의 UUID 사용) |
| 로그인/회원가입 | 이메일 + 비밀번호 |

**프론트엔드는 userId를 직접 생성할 필요 없이, 백엔드 응답에서 받은 값을 그대로 사용하면 됩니다.**

---

## 전체 흐름

```
[회원가입]
   ↓
DB 저장 시 UUID 자동 생성 (userId = "2f7e50af-...")
   ↓
[로그인]
   ↓
응답에 userId 포함 → 프론트 저장
   ↓
[API 요청]
   ↓
토큰 전송 → 백엔드가 토큰에서 userId 추출 → 사용자 식별
```

---

*작성일: 2026-01-26*
