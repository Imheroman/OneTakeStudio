# 스튜디오 사이드바 API 응답 - 백엔드 → 프론트엔드

> **작성일**: 2026-01-29
> **대상**: 프론트엔드 팀
> **문의 원본**: `docs/architecture/백엔드_스튜디오_사이드바_문의사항.md`

---

## 요약

| 기능 | 상태 | 비고 |
|------|------|------|
| 채팅 (플랫폼 + 진행자) | ✅ **구현 완료** | WebSocket + REST API |
| 배너 | ❌ 미구현 | 목업 권장 |
| 에셋 | ❌ 미구현 | 목업 권장 |
| 스타일 | ❌ 미구현 | 로컬 상태 권장 |
| 노트 | ❌ 미구현 | 목업 권장 |
| 멤버 목록 | ✅ **구현 완료** | |
| 즐겨찾기 (친구) | ✅ **구현 완료** | 요청/수락 방식 |
| 다중 초대 | ❌ 미지원 | 1명씩 호출 |
| 프라이빗 채팅 | ✅ **구현 완료** | 채팅 API 활용 |
| 녹화 | ✅ **구현 완료** | title 필드 없음 |

---

## 1. 공통 사항

### 1.1 응답 형식

**Core Service** (`/api/auth/**`, `/api/studios/**`, `/api/favorites/**` 등):
```typescript
// ApiResponse 래퍼 사용
{
  "success": true,
  "message": "성공 메시지",
  "data": T  // 실제 데이터
}
```

**Media Service** (`/api/media/**`, `/api/recordings/**` 등):
```typescript
// ApiResponse 래퍼 사용
{
  "success": true,
  "message": null,
  "data": T
}
```

**즐겨찾기 API** (`/api/favorites/**`):
- 일부 엔드포인트는 래퍼 없이 직접 반환 (아래 상세 참조)

### 1.2 인증

```
Authorization: Bearer {JWT_TOKEN}
```

- **Core Service**: `Authorization` 헤더만 사용
- **Media Service**: Gateway가 `X-User-Id` 헤더 자동 추가 (프론트에서 별도 설정 불필요)

### 1.3 에러 응답

```typescript
{
  "resultCode": "FAILURE",
  "message": "에러 메시지"
}
```

### 1.4 CORS

- `localhost:3000` → `localhost:60000` 허용됨
- `allowedOriginPatterns: "*"` 설정 완료

### 1.5 날짜 형식

- ISO 8601: `"2026-01-29T14:30:00"`
- 타입: `LocalDateTime` (서버) → `string` (JSON)

---

## 2. 채팅 API (3.1 응답)

### ✅ 구현 완료

플랫폼 댓글 수집 + 진행자 채팅 모두 구현되어 있습니다.

### 2.1 실시간 채팅 (WebSocket)

**구독 경로**:
```
STOMP: /topic/chat/{studioId}
```

**메시지 수신 스키마**:
```typescript
interface ChatMessage {
  messageId: string;      // UUID
  studioId: number;
  platform: "YOUTUBE" | "TWITCH" | "CHZZK" | "INTERNAL";
  messageType: "NORMAL" | "DONATION" | "SYSTEM";
  userId: number | null;
  senderName: string;
  senderProfileUrl: string | null;
  content: string;
  donationAmount: number | null;
  donationCurrency: string | null;
  isHighlighted: boolean;
  createdAt: string;      // ISO 8601
}
```

### 2.2 채팅 메시지 전송 (방송 진행자)

```http
POST /api/media/chat
X-User-Id: {userId}   ← Gateway가 자동 추가
Content-Type: application/json
```

**Request Body**:
```typescript
{
  "studioId": 1,
  "content": "안녕하세요!",
  "platform": "INTERNAL"   // 선택: YOUTUBE, TWITCH, CHZZK, INTERNAL
}
```

**Response** (`ApiResponse<ChatMessage>`):
```typescript
{
  "success": true,
  "data": { /* ChatMessage */ }
}
```

### 2.3 채팅 히스토리 조회

```http
GET /api/media/chat/{studioId}?limit=100
```

**Response** (`ApiResponse<ChatMessage[]>`):
```typescript
{
  "success": true,
  "data": [ /* ChatMessage[] */ ]
}
```

### 2.4 플랫폼별 조회

```http
GET /api/media/chat/{studioId}/platform/{platform}
```

- `platform`: `YOUTUBE`, `TWITCH`, `CHZZK`, `INTERNAL`

### 2.5 플랫폼 채팅 연동 시작/종료

**YouTube 연동 시작**:
```http
POST /api/media/chat/integration/{studioId}/youtube/start
```
```typescript
{
  "accessToken": "...",
  "refreshToken": "...",
  "liveChatId": "..."
}
```

**Twitch 연동 시작**:
```http
POST /api/media/chat/integration/{studioId}/twitch/start
```
```typescript
{
  "accessToken": "...",
  "channelName": "...",
  "channelId": "..."
}
```

**치지직 연동 시작**:
```http
POST /api/media/chat/integration/{studioId}/chzzk/start
```
```typescript
{
  "channelId": "..."
}
```

**연동 종료**:
```http
POST /api/media/chat/integration/{studioId}/{platform}/stop
POST /api/media/chat/integration/{studioId}/stop-all
```

**연동 상태 조회**:
```http
GET /api/media/chat/integration/{studioId}/status
```

---

## 3. 배너 API (3.2 응답)

### ❌ 미구현

배너 CRUD API는 현재 구현되어 있지 않습니다.

**권장**: 프론트에서 **목업(MSW 등)으로 구현** 후, 추후 백엔드 연동 예정.

---

## 4. 에셋 API (3.3 응답)

### ❌ 미구현

에셋(로고, 오버레이, 비디오 클립) API는 현재 구현되어 있지 않습니다.

**권장**: 프론트에서 **목업(MSW 등)으로 구현** 후, 추후 백엔드 연동 예정.

---

## 5. 스타일 API (3.4 응답)

### ❌ 미구현

테마/색상/폰트 설정 저장 API는 현재 구현되어 있지 않습니다.

**권장**: 프론트에서 **로컬/세션 상태로만** 관리하고, 저장 없이 동작하도록 구현.

---

## 6. 노트 API (3.5 응답)

### ❌ 미구현

방송 노트 저장/조회 API는 현재 구현되어 있지 않습니다.

**권장**: 프론트에서 **목업(MSW 등)으로 구현** 후, 추후 백엔드 연동 예정.

---

## 7. 멤버 관리 API (3.6 응답)

### ✅ 구현 완료

### 7.1 멤버 목록 조회

```http
GET /api/studios/{studioId}/members
Authorization: Bearer {token}
```

**Response** (`ApiResponse<StudioMemberResponse[]>`):
```typescript
{
  "success": true,
  "message": "멤버 목록 조회 성공",
  "data": [
    {
      "memberId": 1,
      "userId": 123,
      "nickname": "사용자닉네임",
      "email": "user@example.com",
      "profileImageUrl": "https://...",
      "role": "owner" | "admin" | "member",
      "joinedAt": "2026-01-29T10:00:00"
    }
  ]
}
```

### 7.2 멤버 초대

```http
POST /api/studios/{studioId}/members/invite
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**:
```typescript
{
  "email": "invite@example.com",
  "role": "MEMBER"  // ADMIN, MEMBER
}
```

**Response**:
```typescript
{
  "success": true,
  "message": "초대가 발송되었습니다",
  "data": {
    "inviteId": "uuid-string",
    "studioId": 1,
    "email": "invite@example.com",
    "role": "member",
    "status": "pending",
    "expiresAt": "2026-02-05T10:00:00"
  }
}
```

### 7.3 멤버 강퇴

```http
POST /api/studios/{studioId}/members/{memberId}/kick
```

### 7.4 멤버 역할 변경

```http
PATCH /api/studios/{studioId}/members/{memberId}
```
```typescript
{ "role": "ADMIN" | "MEMBER" }
```

---

## 8. 즐겨찾기 (친구) API (3.7 응답)

### ✅ 구현 완료 (2026-01-29)

즐겨찾기는 **요청/수락 방식**으로 동작합니다.

### 8.1 즐겨찾기 목록 조회

```http
GET /api/favorites
Authorization: Bearer {token}
```

**Response** (래퍼 없음):
```typescript
{
  "favorites": [
    {
      "favoriteId": "uuid-string",
      "userId": "user-uuid",
      "nickname": "닉네임",
      "email": "user@example.com",
      "profileImageUrl": "https://...",
      "createdAt": "2026-01-29T10:00:00"
    }
  ],
  "total": 1,
  "maxCount": 10
}
```

### 8.2 사용자 검색

```http
GET /api/favorites/search?q=검색어
Authorization: Bearer {token}
```

**Response** (래퍼 없음):
```typescript
{
  "users": [
    {
      "id": "user-uuid",
      "nickname": "닉네임",
      "email": "user@example.com",
      "profileImageUrl": "https://..."
    }
  ]
}
```

### 8.3 즐겨찾기 요청 보내기

```http
POST /api/favorites
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**:
```typescript
{
  "userId": "target-user-uuid"
}
```

**Response** (래퍼 없음):
```typescript
{
  "message": "즐겨찾기 요청을 보냈습니다.",
  "favorite": null  // 수락 전까지 null
}
```

### 8.4 받은 요청 목록 조회

```http
GET /api/favorites/requests
Authorization: Bearer {token}
```

**Response** (래퍼 없음, 배열):
```typescript
[
  {
    "requestId": "uuid-string",
    "requesterUserId": "user-uuid",
    "requesterNickname": "닉네임",
    "requesterEmail": "user@example.com",
    "requesterProfileImageUrl": "https://...",
    "status": "PENDING",
    "createdAt": "2026-01-29T10:00:00"
  }
]
```

### 8.5 요청 수락/거절

```http
POST /api/favorites/requests/{requestId}/accept
POST /api/favorites/requests/{requestId}/decline
Authorization: Bearer {token}
```

**Response** (래퍼 없음):
```typescript
{ "message": "즐겨찾기 요청을 수락했습니다." }
{ "message": "즐겨찾기 요청을 거절했습니다." }
```

### 8.6 즐겨찾기 삭제

```http
DELETE /api/favorites/{userId}
Authorization: Bearer {token}
```

### 8.7 다중 초대 지원 여부

❌ **현재 미지원**

한 번에 여러 명을 초대하는 API는 현재 없습니다.

**권장**: 프론트에서 **1명씩 여러 번 호출**하는 방식으로 진행.

```typescript
// 예시: 다중 선택 후 순차 호출
for (const userId of selectedUserIds) {
  await inviteMember(studioId, { userId, role: "MEMBER" });
}
```

---

## 9. 프라이빗 채팅 API (3.8 응답)

### ✅ 기존 채팅 API 활용 가능

프라이빗 채팅은 기존 채팅 시스템에서 `platform: "INTERNAL"`로 구분하여 사용할 수 있습니다.

### 9.1 WebSocket 구독

```
STOMP: /topic/chat/{studioId}
```

`platform === "INTERNAL"` 메시지만 필터링하여 프라이빗 채팅으로 표시

### 9.2 메시지 전송

```http
POST /api/media/chat
```
```typescript
{
  "studioId": 1,
  "content": "멤버 전용 메시지",
  "platform": "INTERNAL"
}
```

---

## 10. 녹화 API (3.9 응답)

### ✅ 구현 완료

### 10.1 Gateway 경로 매핑

| Gateway 경로 | Media Service 경로 |
|--------------|-------------------|
| `POST /api/recordings/start` | `/api/media/record/start` |
| `POST /api/recordings/{studioId}/stop` | `/api/media/record/{studioId}/stop` |
| `GET /api/recordings/studio/{studioId}` | `/api/media/record/studio/{studioId}` |
| `GET /api/recordings/{recordingId}` | `/api/media/record/{recordingId}` |

### 10.2 녹화 시작

```http
POST /api/recordings/start
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**:
```typescript
{
  "studioId": 1
}
```

**Response** (`ApiResponse<RecordingResponse>`):
```typescript
{
  "success": true,
  "data": {
    "recordingId": "uuid-string",
    "studioId": 1,
    "userId": 123,
    "status": "RECORDING" | "PAUSED" | "COMPLETED" | "FAILED",
    "fileName": "recording_1_20260129_143000.mp4",
    "s3Url": "https://s3.../recording.mp4",
    "fileSize": 1024000,
    "durationSeconds": 3600,
    "startedAt": "2026-01-29T14:30:00",
    "endedAt": null,
    "createdAt": "2026-01-29T14:30:00",
    "errorMessage": null
  }
}
```

### 10.3 녹화 종료

```http
POST /api/recordings/{studioId}/stop
```

### 10.4 녹화 일시정지/재개

```http
POST /api/recordings/{studioId}/pause
POST /api/recordings/{studioId}/resume
```

### 10.5 녹화 목록 조회

```http
GET /api/recordings/studio/{studioId}
```

### 10.6 현재 활성 녹화 조회

```http
GET /api/recordings/studio/{studioId}/active
```

### 10.7 제목(title) 필드

❌ **현재 없음**

`RecordingResponse`에 `title` 필드는 현재 포함되어 있지 않습니다.

**권장**: "제목 수정" 기능은 프론트에서 **비활성화**하거나, 추후 백엔드 추가 시 연동.

---

## 11. 알림 API (추가 정보)

즐겨찾기 요청, 스튜디오 초대 등의 알림을 위한 API도 구현되어 있습니다.

### 11.1 알림 목록 조회

```http
GET /api/notifications
Authorization: Bearer {token}
```

### 11.2 읽지 않은 알림 개수

```http
GET /api/notifications/unread-count
```

### 11.3 알림 읽음 처리

```http
POST /api/notifications/{notificationId}/read
```

---

## 12. Zod 스키마 참고사항

### null vs undefined 처리

백엔드에서 `null`을 반환하는 경우가 있으므로, Zod 스키마에서 `nullable()` 사용 권장:

```typescript
// 권장
favorite: FavoriteSchema.nullable().optional()

// 비권장 (null 시 에러)
favorite: FavoriteSchema.optional()
```

---

## 문의사항

추가 문의가 있으시면 백엔드 팀에 연락 부탁드립니다.
