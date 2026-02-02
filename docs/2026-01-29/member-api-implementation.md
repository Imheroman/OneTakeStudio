# Member API 구현 (be-member 브랜치 머지)

## 날짜: 2026-01-29

---

## 개요

스튜디오 멤버 초대/수락/거절/탈퇴 관련 API 6개 구현

**작업자**: 이지언
**브랜치**: be-member → be-dev 머지

---

## 새로운 API 엔드포인트 (6개)

### 1. 받은 초대 관리 (InviteController)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/api/invites/received` | 받은 초대 목록 조회 | 필수 |
| POST | `/api/invites/{inviteId}/accept` | 초대 수락 | 필수 |
| POST | `/api/invites/{inviteId}/reject` | 초대 거절 | 필수 |

### 2. 스튜디오 초대 관리 (StudioInviteController)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/api/studios/{studioId}/invites` | 스튜디오 초대 목록 조회 | HOST/MANAGER |
| DELETE | `/api/studios/{studioId}/invites/{inviteId}` | 초대 취소 | HOST/MANAGER |

### 3. 멤버 관리 (StudioMemberController)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| DELETE | `/api/studios/{studioId}/members/me` | 스튜디오 탈퇴 | 필수 |

---

## 생성된 파일 (12개)

### Controller (3개)
```
core-service/src/main/java/com/onetake/core/studio/controller/
├── InviteController.java           ← 받은 초대 조회/수락/거절
├── StudioInviteController.java     ← 스튜디오 초대 목록/취소
└── StudioMemberController.java     ← 스튜디오 탈퇴 (기존 파일에 추가)
```

### Service (1개)
```
core-service/src/main/java/com/onetake/core/studio/service/
└── StudioMemberService.java        ← 멤버 관련 비즈니스 로직
```

### DTO (1개)
```
core-service/src/main/java/com/onetake/core/studio/dto/
└── ReceivedInviteResponse.java     ← 받은 초대 응답 DTO
```

### Exception (4개)
```
core-service/src/main/java/com/onetake/core/studio/exception/
├── InviteNotFoundException.java     ← 초대를 찾을 수 없음
├── InviteExpiredException.java      ← 초대가 만료됨
├── InviteNotForUserException.java   ← 초대 대상 불일치
└── HostCannotLeaveException.java    ← 호스트 탈퇴 불가
```

### 테스트 페이지 (2개)
```
docs/api-test/
├── auth-test.html           ← 인증 API 테스트 페이지
└── member-api-test.html     ← 멤버 API 테스트 페이지
```

### 수정된 파일 (1개)
```
GlobalExceptionHandler.java  ← 새 예외 클래스 처리 추가
```

---

## API 상세

### GET /api/invites/received
**받은 초대 목록 조회**

```json
// Response
{
  "success": true,
  "message": "받은 초대 목록 조회 성공",
  "data": [
    {
      "inviteId": "uuid-string",
      "studioId": 1,
      "studioName": "스튜디오 이름",
      "studioThumbnail": "https://...",
      "inviterNickname": "초대자 닉네임",
      "role": "MANAGER",
      "expiresAt": "2026-02-05T09:58:35"
    }
  ]
}
```

### POST /api/invites/{inviteId}/accept
**초대 수락**

```json
// Response
{
  "success": true,
  "message": "초대를 수락했습니다",
  "data": {
    "memberId": 1,
    "userId": 1,
    "nickname": "닉네임",
    "email": "user@example.com",
    "role": "MANAGER",
    "joinedAt": "2026-01-29T10:00:00"
  }
}
```

### POST /api/invites/{inviteId}/reject
**초대 거절**

```json
// Response
{
  "success": true,
  "message": "초대를 거절했습니다"
}
```

### GET /api/studios/{studioId}/invites
**스튜디오 초대 목록 조회** (HOST/MANAGER만 가능)

```json
// Response
{
  "success": true,
  "message": "초대 목록 조회 성공",
  "data": [
    {
      "inviteId": "uuid-string",
      "inviteeEmail": "invited@example.com",
      "role": "MEMBER",
      "status": "PENDING",
      "expiresAt": "2026-02-05T09:58:35",
      "createdAt": "2026-01-29T09:58:35"
    }
  ]
}
```

### DELETE /api/studios/{studioId}/invites/{inviteId}
**초대 취소** (HOST/MANAGER만 가능)

```json
// Response
{
  "success": true,
  "message": "초대가 취소되었습니다"
}
```

### DELETE /api/studios/{studioId}/members/me
**스튜디오 탈퇴** (HOST는 탈퇴 불가)

```json
// Response
{
  "success": true,
  "message": "스튜디오에서 탈퇴했습니다"
}
```

---

## 비즈니스 로직

### 초대 만료
- 초대는 7일 후 자동 만료 (`INVITE_EXPIRY_DAYS = 7`)
- 만료된 초대 수락 시 `InviteExpiredException` 발생

### 권한 검증
- 초대 수락/거절: 초대받은 본인만 가능
- 초대 목록 조회/취소: HOST 또는 MANAGER만 가능
- 스튜디오 탈퇴: HOST는 탈퇴 불가

### 중복 검증
- 이미 멤버인 사용자는 다시 초대 불가
- 이미 초대된 이메일은 중복 초대 불가

---

## 예외 처리

| 예외 클래스 | HTTP Status | 상황 |
|------------|-------------|------|
| `InviteNotFoundException` | 404 | 초대를 찾을 수 없음 |
| `InviteExpiredException` | 400 | 초대가 만료됨 |
| `InviteNotForUserException` | 403 | 다른 사용자의 초대 |
| `HostCannotLeaveException` | 400 | 호스트 탈퇴 시도 |

---

## 테스트 방법

### 브라우저 테스트 페이지
```
docs/api-test/member-api-test.html
```
- 로그인 후 JWT 토큰으로 API 테스트 가능
- 모든 Member API 테스트 지원

### curl 테스트
```bash
# 받은 초대 목록 조회
curl -X GET http://localhost:8080/api/invites/received \
  -H "Authorization: Bearer {token}"

# 초대 수락
curl -X POST http://localhost:8080/api/invites/{inviteId}/accept \
  -H "Authorization: Bearer {token}"

# 초대 거절
curl -X POST http://localhost:8080/api/invites/{inviteId}/reject \
  -H "Authorization: Bearer {token}"

# 스튜디오 초대 목록
curl -X GET http://localhost:8080/api/studios/{studioId}/invites \
  -H "Authorization: Bearer {token}"

# 초대 취소
curl -X DELETE http://localhost:8080/api/studios/{studioId}/invites/{inviteId} \
  -H "Authorization: Bearer {token}"

# 스튜디오 탈퇴
curl -X DELETE http://localhost:8080/api/studios/{studioId}/members/me \
  -H "Authorization: Bearer {token}"
```

---

## 커밋 정보

```
원본 커밋: 9291ec7 (be-member)
머지 커밋: 4ab1d26 (be-dev)
파일: 12개 추가 (+1,835 lines)
```
