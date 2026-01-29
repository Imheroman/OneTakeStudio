# 백엔드 API 명세서

> 작성일: 2026-01-28  
> 기준: API Gateway (포트 60000)를 통한 백엔드 API

## 아키텍처 개요

프론트엔드는 **API Gateway (포트 60000)**만 바라봅니다. API Gateway가 내부적으로 다음 서비스로 라우팅합니다:

- **Core Service** (포트 8080): 인증, 사용자, 스튜디오, 워크스페이스, 알림, 채널(destinations)
- **Media Service**: 미디어 스트리밍, 녹화, 송출
- **Video Service** (미구현): 쇼츠 API 예정. 현재 백엔드에 ShortsService 없음 → MSW 전용
- **Eureka Server** (포트 8761): 서비스 디스커버리

### API Gateway 라우팅 규칙

```
http://localhost:60000/api/auth/**          → Core Service
http://localhost:60000/api/users/**          → Core Service
http://localhost:60000/api/studios/**        → Core Service
http://localhost:60000/api/workspace/**      → Core Service
http://localhost:60000/api/notifications/**  → Core Service
http://localhost:60000/api/destinations/**   → Core Service (채널)
http://localhost:60000/api/v1/shorts/**      → (미구현) video-service 추가 시 라우팅 예정
http://localhost:60000/api/v1/media/**       → Media Service
http://localhost:60000/api/streams/**        → Media Service
http://localhost:60000/api/recordings/**     → Media Service
http://localhost:60000/api/publish/**        → Media Service
```

### 프론트엔드 설정

- **환경 변수**: `NEXT_PUBLIC_API_URL=http://localhost:60000`
- **MSW 모킹**: `NEXT_PUBLIC_API_MOCKING=enabled` (백엔드 미구현 API용)

---

## 공통 응답 형식

모든 API는 `ApiResponse<T>` 형식을 사용합니다:

```typescript
{
  success: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
}
```

**예외:** 일부 API는 래퍼 없이 직접 데이터를 반환합니다:
- `/api/workspace/{userId}/studios/recent` → `RecentStudioListResponse` 직접 반환
- `/api/notifications` → `NotificationListResponse` 직접 반환

---

## 1. 인증 API (`/api/auth`)

### 1.1 이메일 인증 코드 발송
- **엔드포인트**: `POST /api/auth/send-verification`
- **요청**: `{ email: string }`
- **응답**: `ApiResponse<Void>`
- **상태**: ✅ 프론트엔드 사용 중

### 1.2 이메일 인증 코드 확인
- **엔드포인트**: `POST /api/auth/verify-email`
- **요청**: `{ email: string, code: string }`
- **응답**: `ApiResponse<Void>`
- **상태**: ✅ 프론트엔드 사용 중

### 1.3 회원가입
- **엔드포인트**: `POST /api/auth/register`
- **요청**: `{ email: string, verificationCode: string, password: string, nickname: string }`
- **응답**: `ApiResponse<Void>`
- **상태**: ✅ 프론트엔드 사용 중

### 1.4 로그인
- **엔드포인트**: `POST http://localhost:60000/api/auth/login`
- **요청**: `{ email: string, password: string }`
- **응답**: `ApiResponse<LoginResponse>`
  ```typescript
  {
    success: true,
    message: "로그인 성공",
    data: {
      accessToken: string,
      refreshToken: string,
      user: {
        userId: string,
        email: string,
        nickname: string,
        profileImageUrl: string | null
      }
    }
  }
  ```
- **상태**: ✅ 프론트엔드 사용 중 (MSW로도 모킹 가능)
- **라우팅**: API Gateway → Core Service

### 1.5 토큰 갱신
- **엔드포인트**: `POST /api/auth/refresh`
- **요청**: `{ refreshToken: string }`
- **응답**: `ApiResponse<TokenRefreshResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

### 1.6 이메일 중복 확인
- **엔드포인트**: `GET /api/auth/check-email?email={email}`
- **응답**: `ApiResponse<CheckEmailResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

### 1.7 비밀번호 재설정 요청
- **엔드포인트**: `POST /api/auth/password-reset`
- **요청**: `{ email: string }`
- **응답**: `ApiResponse<Void>`
- **상태**: ⚠️ 프론트엔드 미사용

### 1.8 비밀번호 재설정 확인
- **엔드포인트**: `POST /api/auth/password-reset/confirm`
- **요청**: `{ token: string, newPassword: string }`
- **응답**: `ApiResponse<Void>`
- **상태**: ⚠️ 프론트엔드 미사용

### 1.9 OAuth 로그인 (Google/Kakao/Naver)
- **엔드포인트**: `POST /api/auth/oauth/{provider}` 또는 `POST /api/auth/oauth/{provider}/callback`
- **요청**: `{ code: string, redirectUri: string }` (callback)
- **응답**: `ApiResponse<LoginResponse>`
- **상태**: ⚠️ 프론트엔드에서 다른 방식 사용 중

---

## 2. 사용자 API (`/api/users`)

### 2.1 내 프로필 조회
- **엔드포인트**: `GET /api/users/me`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<UserProfileResponse>`
- **상태**: ⚠️ 프론트엔드 미사용 (주석 처리됨)

### 2.2 내 프로필 수정
- **엔드포인트**: `PUT /api/users/me`
- **인증**: 필요 (JWT)
- **요청**: `{ nickname?: string, profileImageUrl?: string }`
- **응답**: `ApiResponse<UserProfileResponse>`
- **상태**: ⚠️ 프론트엔드 미사용 (주석 처리됨)

### 2.3 사용자 프로필 조회
- **엔드포인트**: `GET /api/users/{userId}`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<UserProfileResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

---

## 3. 워크스페이스 API (`/api/workspace`)

### 3.1 최근 스튜디오 목록
- **엔드포인트**: `GET /api/workspace/{userId}/studios/recent`
- **인증**: 필요 (JWT)
- **응답**: `RecentStudioListResponse` (ApiResponse 래퍼 없음)
  ```typescript
  {
    studios: [
      {
        id: number,
        title: string,
        date: string
      }
    ]
  }
  ```
- **상태**: ✅ 프론트엔드 사용 중

### 3.2 대시보드 조회
- **엔드포인트**: `GET /api/workspace/dashboard`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<DashboardResponse>`
  ```typescript
  {
    success: true,
    message: "대시보드 조회 성공",
    data: {
      recentStudios: RecentStudioResponse[],
      connectedDestinationCount: number,
      totalStudioCount: number
    }
  }
  ```
- **상태**: ⚠️ 프론트엔드 미사용

---

## 4. 스튜디오 API (`/api/studios`)

### 4.1 스튜디오 생성
- **엔드포인트**: `POST /api/studios`
- **인증**: 필요 (JWT)
- **요청**: `{ name: string, template?: string }`
- **응답**: `ApiResponse<StudioDetailResponse>`
- **상태**: ✅ 프론트엔드 사용 중 (백엔드 스펙에 맞게 수정됨)

### 4.2 내 스튜디오 목록 조회
- **엔드포인트**: `GET /api/studios`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<StudioResponse[]>`
- **상태**: ⚠️ 프론트엔드 미사용

### 4.3 스튜디오 상세 조회
- **엔드포인트**: `GET /api/studios/{studioId}`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<StudioDetailResponse>`
- **상태**: ✅ 프론트엔드 사용 중

### 4.4 스튜디오 수정
- **엔드포인트**: `PATCH /api/studios/{studioId}`
- **인증**: 필요 (JWT)
- **요청**: `{ name?: string, thumbnail?: string }`
- **응답**: `ApiResponse<StudioDetailResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

### 4.5 스튜디오 삭제
- **엔드포인트**: `DELETE /api/studios/{studioId}`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<Void>`
- **상태**: ⚠️ 프론트엔드 미사용

---

## 5. 스튜디오 멤버 API (`/api/studios/{studioId}/members`)

### 5.1 멤버 목록 조회
- **엔드포인트**: `GET /api/studios/{studioId}/members`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<StudioMemberResponse[]>`
- **상태**: ⚠️ 프론트엔드 미사용

### 5.2 멤버 초대
- **엔드포인트**: `POST /api/studios/{studioId}/members/invite`
- **인증**: 필요 (JWT)
- **요청**: `{ email: string }`
- **응답**: `ApiResponse<InviteResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

### 5.3 멤버 강퇴
- **엔드포인트**: `POST /api/studios/{studioId}/members/{memberId}/kick`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<Void>`
- **상태**: ⚠️ 프론트엔드 미사용

### 5.4 멤버 역할 변경
- **엔드포인트**: `PATCH /api/studios/{studioId}/members/{memberId}`
- **인증**: 필요 (JWT)
- **요청**: `{ role: string }`
- **응답**: `ApiResponse<StudioMemberResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

---

## 6. 씬 API (`/api/studios/{studioId}/scenes`)

### 6.1 씬 목록 조회
- **엔드포인트**: `GET /api/studios/{studioId}/scenes`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<SceneResponse[]>`
- **상태**: ⚠️ 프론트엔드 미사용

### 6.2 씬 생성
- **엔드포인트**: `POST /api/studios/{studioId}/scenes`
- **인증**: 필요 (JWT)
- **요청**: `{ name: string, layout?: SceneLayoutDto }`
- **응답**: `ApiResponse<SceneResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

### 6.3 씬 수정
- **엔드포인트**: `PUT /api/studios/{studioId}/scenes/{sceneId}`
- **인증**: 필요 (JWT)
- **요청**: `{ name?: string, layout?: SceneLayoutDto }`
- **응답**: `ApiResponse<SceneResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

### 6.4 씬 삭제
- **엔드포인트**: `DELETE /api/studios/{studioId}/scenes/{sceneId}`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<Void>`
- **상태**: ⚠️ 프론트엔드 미사용

---

## 7. 채널 API (`/api/destinations`)

> **주의**: 프론트엔드는 `/api/channels`를 사용하지만, 백엔드는 `/api/destinations`를 사용합니다.

### 7.1 내 연동 채널 목록 조회
- **엔드포인트**: `GET /api/destinations`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<DestinationResponse[]>`
- **프론트엔드**: `/api/channels` 사용 중 → **마이그레이션 필요**

### 7.2 신규 송출 채널 등록
- **엔드포인트**: `POST /api/destinations`
- **인증**: 필요 (JWT)
- **요청**: `{ platform: string, channelId?: string, channelName?: string, rtmpUrl?: string, streamKey?: string }`
- **응답**: `ApiResponse<DestinationResponse>`
- **프론트엔드**: `/api/channels/connect` 사용 중 → **마이그레이션 필요**

### 7.3 채널 조회
- **엔드포인트**: `GET /api/destinations/{destinationId}`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<DestinationResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

### 7.4 채널 정보 수정
- **엔드포인트**: `PUT /api/destinations/{destinationId}`
- **인증**: 필요 (JWT)
- **요청**: `{ channelName?: string, rtmpUrl?: string, streamKey?: string }`
- **응답**: `ApiResponse<DestinationResponse>`
- **상태**: ⚠️ 프론트엔드 미사용

### 7.5 채널 연동 해제
- **엔드포인트**: `DELETE /api/destinations/{destinationId}`
- **인증**: 필요 (JWT)
- **응답**: `ApiResponse<Void>`
- **프론트엔드**: `/api/channels/{id}` 사용 중 → **마이그레이션 필요**

---

## 8. 알림 API (`/api/notifications`)

### 8.1 알림 목록 조회
- **엔드포인트**: `GET /api/notifications`
- **인증**: 필요 (JWT)
- **응답**: `NotificationListResponse` (ApiResponse 래퍼 없음)
  ```typescript
  {
    notifications: [
      {
        id: string,
        type: string,
        title: string,
        message: string,
        time?: string,
        createdAt?: string,
        read?: boolean
      }
    ]
  }
  ```
- **상태**: ✅ 프론트엔드 사용 중

---

## 9. 미구현 API (프론트엔드에서 사용 중이지만 백엔드에 없음)

### 9.1 즐겨찾기 API
- **프론트엔드**: `/api/favorites` (GET, POST, DELETE)
- **프론트엔드**: `/api/favorites/search?q={query}` (GET)
- **백엔드**: ❌ 미구현
- **상태**: ⚠️ 백엔드 구현 필요 또는 기능 제거

### 9.2 비디오 라이브러리 API
- **프론트엔드**: `/api/library/videos?type={type}`
- **백엔드**: ❌ 미구현
- **상태**: ⚠️ 백엔드 구현 필요

### 9.3 스토리지 API
- **프론트엔드**: `/api/storage` (GET)
- **프론트엔드**: `/api/storage/files` (GET)
- **백엔드**: ❌ 미구현
- **상태**: ⚠️ 백엔드 구현 필요

### 9.4 쇼츠 API
- **프론트엔드**: `/api/v1/shorts/generate` (POST)
- **프론트엔드**: `/api/v1/shorts/status` (GET)
- **백엔드**: ❌ 미구현
- **상태**: ⚠️ 백엔드 구현 필요

---

## 10. Media Service API (`/api/v1/media/**`)

Media Service는 별도 서비스이며, API Gateway를 통해 라우팅됩니다.

### 10.1 스트림 API
- **엔드포인트**: `/api/v1/media/stream/**`
- **상태**: ⚠️ 프론트엔드 미사용

### 10.2 녹화 API
- **엔드포인트**: `/api/v1/media/record/**`
- **상태**: ⚠️ 프론트엔드 미사용

### 10.3 송출 API
- **엔드포인트**: `/api/v1/media/publish/**`
- **상태**: ⚠️ 프론트엔드 미사용

---

## API 경로 매핑 요약

| 프론트엔드 경로 | 백엔드 경로 | 상태 |
|----------------|------------|------|
| `/api/auth/login` | `/api/auth/login` | ✅ 일치 |
| `/api/auth/register` | `/api/auth/register` | ✅ 일치 |
| `/api/auth/send-verification` | `/api/auth/send-verification` | ✅ 일치 |
| `/api/auth/verify-email` | `/api/auth/verify-email` | ✅ 일치 |
| `/api/workspace/{userId}/studios/recent` | `/api/workspace/{userId}/studios/recent` | ✅ 일치 |
| `/api/studios` (POST) | `/api/studios` (POST) | ✅ 일치 |
| `/api/studios/{id}` (GET) | `/api/studios/{id}` (GET) | ✅ 일치 |
| `/api/notifications` | `/api/notifications` | ✅ 일치 |
| `/api/channels` | `/api/destinations` | ❌ 불일치 |
| `/api/channels/connect` | `/api/destinations` (POST) | ❌ 불일치 |
| `/api/channels/{id}` (DELETE) | `/api/destinations/{id}` (DELETE) | ❌ 불일치 |
| `/api/favorites` | ❌ 미구현 | ❌ 없음 |
| `/api/favorites/search` | ❌ 미구현 | ❌ 없음 |
| `/api/library/videos` | ❌ 미구현 | ❌ 없음 |
| `/api/storage` | ❌ 미구현 | ❌ 없음 |
| `/api/storage/files` | ❌ 미구현 | ❌ 없음 |
| `/api/v1/shorts/**` | ❌ 미구현 | ❌ 없음 |
