# OAuth 인증 가이드 (YouTube / 치지직)

## 개요

YouTube와 치지직 실시간 채팅 연동을 위한 OAuth 인증 방식 가이드입니다.

---

## Q&A: OAuth 인증 이해하기

### Q1. API 키만 있으면 되는 거 아니야?

**A.** 아니요. YouTube Live Chat API는 **OAuth 2.0 인증이 필수**입니다.

| 인증 방식 | 가능한 기능 |
|----------|------------|
| **API Key** | 공개 동영상/채널 검색 |
| **OAuth 2.0** | Live Chat 읽기/쓰기 |

API 키는 공개 데이터 조회용이고, 사용자 데이터(채팅)에 접근하려면 OAuth가 필요합니다.

---

### Q2. 치지직은 Client ID, Secret Key를 API 대신 쓰는데, 둘이 동일한 구조로 가는 거 맞지?

**A.** 네, 맞습니다. 둘 다 OAuth 기반이므로 **통일된 구조**로 처리합니다.

| 플랫폼 | 인증 방식 | 필요한 것 |
|--------|----------|----------|
| YouTube | OAuth 2.0 | Client ID + Secret → Access Token |
| 치지직 | OAuth 유사 | Client ID + Secret Key |

**공통 구조:**
```
1. Client ID + Secret 등록 (application.yml)
2. 사용자가 프론트에서 OAuth 로그인
3. Access Token 발급
4. Backend에서 토큰으로 채팅 API 호출
```

---

### Q3. OAuth로 연동하면 사용자마다 다르게 정보를 제공하는 거 아니야? 그러면 그때마다 다른 API를 호출해야 하는 거야?

**A.** 네, 맞습니다. 각 스트리머마다 **다른 토큰**으로 API를 호출합니다.

**구조:**
```
스트리머 A → OAuth 로그인 → A의 Access Token → A 방송 댓글 조회
스트리머 B → OAuth 로그인 → B의 Access Token → B 방송 댓글 조회
```

이게 정상적인 구조입니다. 각 스트리머가 **본인 방송 댓글만** 볼 수 있어야 하니까요.

---

### Q4. 그러면 내가 발급받은 Client ID랑 Secret은 무슨 역할을 하는 거야?

**A.** Client ID / Secret은 **앱(서비스) 인증용**입니다.

| 키 | 역할 | 비유 |
|----|------|------|
| **Client ID / Secret** | "이 앱이 YouTube API 쓸 자격 있음" | 사업자등록증 |
| **Access Token** | "이 사용자가 이 앱에 권한 줬음" | 고객 동의서 |

**OAuth 흐름:**
```
1. 스트리머가 로그인 클릭
2. YouTube: "이 앱(Client ID) 맞아?"  ← 앱 확인
3. 스트리머: "내 계정 접근 허용할게"  ← 사용자 동의
4. YouTube → Access Token 발급      ← 사용자별 토큰
5. Backend: 토큰으로 API 호출
```

**요약:**
- Client ID / Secret: **한 개** (서비스 전체 공용)
- Access Token: **사용자마다 다름**

---

### Q5. Google Cloud Console에서 Audience 설정은 Internal? External?

**A.** **External** 선택합니다.

| 유형 | 설명 | 사용 시 |
|------|------|--------|
| **Internal** | Google Workspace 조직 내 사용자만 | 회사 내부 전용 |
| **External** | 모든 Google 계정 사용자 | 일반 서비스 |

일반 사용자(스트리머)들이 YouTube 계정으로 로그인해서 쓸 거니까 **External**이 맞습니다.

**참고:** External 선택 시 처음엔 테스트 모드로:
- 테스트 사용자 100명까지만 등록 가능
- 프로덕션 배포 시 Google 검토 필요

---

### Q6. 다른 사람들의 댓글까지 받아볼 건데, External이 맞아?

**A.** 네, 맞습니다.

**흐름:**
```
스트리머(방송 주인) → OAuth 로그인 → 본인 방송의 모든 시청자 댓글 수신
```

스트리머 본인 계정으로 인증하면, 그 방송에 달리는 **모든 시청자 댓글**을 읽어올 수 있습니다.

---

### Q7. API로 댓글을 가져와서 고객들에게 실시간 댓글을 보내주고, 댓글 반응 정보를 수집해서 처리하는 방식이 맞아?

**A.** 네, 맞는 방식입니다.

**현재 구조:**
```
YouTube/치지직 API → Backend → 프론트/고객에게 실시간 전달
                  ↓
            댓글 수 집계 → AI 하이라이트 분석
```

**주의할 점:**

| 항목 | 설명 |
|------|------|
| **API 할당량** | YouTube는 일일 quota 10,000 units (폴링 주의) |
| **이용약관** | 댓글 원문 저장은 지양, 집계 데이터는 OK |
| **상업적 사용** | 프로덕션 배포 시 Google 검토 필요 |

**현재 설계:**
- 댓글 원문 저장 X
- 분당 댓글 수만 저장
- AI 분석용으로 활용

→ 정책상 문제없음

---

## 설정 구조

### application.yml

```yaml
# YouTube OAuth
youtube:
  oauth:
    client-id: YOUR_YOUTUBE_CLIENT_ID
    client-secret: YOUR_YOUTUBE_CLIENT_SECRET

# 치지직 OAuth
chzzk:
  oauth:
    client-id: YOUR_CHZZK_CLIENT_ID
    client-secret: YOUR_CHZZK_CLIENT_SECRET
```

### 사용자별 토큰 저장 (DB)

```
┌─────────────────────────────────────┐
│      platform_credentials 테이블    │
├─────────────────────────────────────┤
│ id: 1                               │
│ user_id: 100                        │
│ platform: YOUTUBE                   │
│ access_token: xxx                   │
│ refresh_token: yyy                  │
│ live_chat_id: zzz                   │
│ expires_at: 2026-02-02 15:00:00     │
├─────────────────────────────────────┤
│ id: 2                               │
│ user_id: 100                        │
│ platform: CHZZK                     │
│ access_token: aaa                   │
│ refresh_token: bbb                  │
│ channel_id: ccc                     │
│ expires_at: 2026-02-02 16:00:00     │
└─────────────────────────────────────┘
```

---

## OAuth 인증 흐름

### 1. 프론트엔드 → OAuth 로그인 요청

```
GET https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://your-app.com/callback
  &response_type=code
  &scope=https://www.googleapis.com/auth/youtube.readonly
  &access_type=offline
```

### 2. 사용자 동의 후 → 콜백으로 code 수신

```
https://your-app.com/callback?code=AUTHORIZATION_CODE
```

### 3. Backend → Access Token 교환

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&redirect_uri=https://your-app.com/callback
```

### 4. 응답 → 토큰 저장

```json
{
  "access_token": "ya29.xxx",
  "refresh_token": "1//xxx",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 5. 토큰 만료 시 → Refresh Token으로 갱신

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=1//xxx
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

---

## 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ YouTube     │    │ 치지직      │    │ 채팅 화면   │          │
│  │ 로그인 버튼 │    │ 로그인 버튼 │    │             │          │
│  └──────┬──────┘    └──────┬──────┘    └──────▲──────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │ OAuth 로그인     │ OAuth 로그인     │ 실시간 댓글
          ▼                  ▼                  │
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  OAuth Callback Handler                  │    │
│  │  - Authorization Code → Access Token 교환               │    │
│  │  - 토큰 DB 저장                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              ChatIntegrationService                      │    │
│  │  - 사용자별 토큰으로 API 호출                           │    │
│  │  - YouTube / 치지직 폴링                                │    │
│  │  - 댓글 수 집계                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌────────────┐      ┌────────────┐      ┌────────────┐
   │ YouTube    │      │ 치지직     │      │ AI Service │
   │ Live Chat  │      │ Chat API   │      │ 하이라이트 │
   │ API        │      │            │      │ 분석       │
   └────────────┘      └────────────┘      └────────────┘
```

---

## YouTube OAuth 설정 방법

### 1. Google Cloud Console 접속
- https://console.cloud.google.com/

### 2. 프로젝트 생성/선택

### 3. YouTube Data API v3 활성화
- API 및 서비스 → 라이브러리 → "YouTube Data API v3" 검색 → 활성화

### 4. OAuth 동의 화면 설정
- API 및 서비스 → OAuth 동의 화면
- User Type: **External** 선택
- 앱 이름, 이메일 등 입력
- 범위 추가: `youtube.readonly`

### 5. OAuth 2.0 클라이언트 ID 생성
- API 및 서비스 → 사용자 인증 정보
- 사용자 인증 정보 만들기 → OAuth 클라이언트 ID
- 애플리케이션 유형: 웹 애플리케이션
- 승인된 리디렉션 URI: `https://your-domain.com/api/oauth/youtube/callback`

### 6. Client ID, Client Secret 저장
- application.yml에 등록

---

## 치지직 OAuth 설정 방법

### 1. 치지직 개발자 센터 접속
- https://developers.chzzk.naver.com/

### 2. 애플리케이션 등록

### 3. Client ID, Client Secret 발급

### 4. Redirect URI 등록
- `https://your-domain.com/api/oauth/chzzk/callback`

### 5. application.yml에 등록

---

## 체크리스트

### YouTube
- [ ] Google Cloud 프로젝트 생성
- [ ] YouTube Data API v3 활성화
- [ ] OAuth 동의 화면 설정 (External)
- [ ] OAuth 클라이언트 ID 생성
- [ ] Redirect URI 등록
- [ ] Client ID / Secret을 application.yml에 등록

### 치지직
- [ ] 치지직 개발자 센터 앱 등록
- [ ] Client ID / Secret 발급
- [ ] Redirect URI 등록
- [ ] Client ID / Secret을 application.yml에 등록

### Backend
- [ ] OAuth Callback Controller 구현
- [ ] 토큰 저장 테이블 생성
- [ ] 토큰 갱신 로직 구현
- [ ] 사용자별 토큰으로 채팅 API 호출
