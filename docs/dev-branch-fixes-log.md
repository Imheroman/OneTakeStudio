# Dev 브랜치 수정 및 이슈 해결 로그

## 날짜: 2026-01-28

---

## 1. Sidebar Home 링크 버그 수정

### 문제
- 워크스페이스에서 Sidebar의 **Home** 메뉴를 클릭하면 워크스페이스가 아닌 **로그인 페이지**로 이동

### 원인
- `frontend/src/widgets/workspace/sidebar/index.tsx` (line 22)
- `user?.id`로 접근하고 있었으나, User 타입에는 `id` 필드가 없음
- User 타입 정의: `{ userId, email, nickname, profileImageUrl }` (schemas.ts)
- `user.id`가 항상 `undefined`로 평가되어 fallback인 `/login`으로 이동

### 해결
```tsx
// 수정 전
const workspaceLink = user?.id ? `/workspace/${user.id}` : "/login";

// 수정 후
const workspaceLink = user?.userId ? `/workspace/${user.userId}` : "/login";
```

### 파일
- `frontend/src/widgets/workspace/sidebar/index.tsx`

---

## 2. OAuth redirect-uri 포트 불일치 수정

### 문제
- Google OAuth 로그인 시 `redirect_uri_mismatch` 에러 발생
- 프론트엔드가 `localhost:3000`에서 실행 중인데, 백엔드 OAuth redirect-uri가 `localhost:3001`로 설정되어 있었음

### 원인
- `core-service/src/main/resources/application.yml`의 OAuth 설정에서 세 제공자(Google, Kakao, Naver) 모두 redirect-uri가 `http://localhost:3001/oauth/callback`로 되어 있었음
- 프론트엔드 표준 포트는 3000

### 해결
- 세 제공자 모두 redirect-uri를 `http://localhost:3000/oauth/callback`으로 변경

### 추가 필요 작업 (수동)
- **Google Cloud Console**: OAuth 2.0 Client ID의 Authorized redirect URIs에 `http://localhost:3000/oauth/callback` 추가 필요
- **Kakao Developers**: 카카오 로그인 Redirect URI 설정 확인
- **Naver Developers**: Callback URL 설정 확인

### 파일
- `core-service/src/main/resources/application.yml`

---

## 3. 프론트엔드 .env.local 파일 추가

### 문제
- OAuth 로그인 버튼 클릭 시 `client_id=undefined` 에러
- 프론트엔드에서 환경 변수를 읽지 못함

### 원인
- `frontend/.env.local` 파일이 존재하지 않았음
- Next.js는 `.env.local`에서 `NEXT_PUBLIC_*` 환경 변수를 로드

### 해결
- `frontend/.env.local` 생성:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google Client ID>
NEXT_PUBLIC_KAKAO_CLIENT_ID=<Kakao Client ID>
NEXT_PUBLIC_NAVER_CLIENT_ID=<Naver Client ID>
```

### 참고
- `.env.local`은 `.gitignore`에 포함되어 있으므로 커밋되지 않음
- 각 개발자가 로컬에 직접 생성해야 함

---

## 4. Next.js Jest Worker Crash (캐시 손상)

### 문제
- 워크스페이스 페이지 접근 시 500 Internal Server Error
- 콘솔에 `Jest worker encountered 2 child process exceptions, exceeding retry limit` 에러

### 원인
- Next.js의 `.next` 디렉토리(빌드 캐시)가 손상됨
- 여러 Next.js dev 인스턴스가 동시에 실행되면서 lock 충돌 발생

### 해결
1. 기존 Next.js 프로세스 종료
2. `.next` 디렉토리 삭제
3. `npm run dev`로 재시작

```bash
# 프로세스 확인 및 종료
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# 캐시 삭제 후 재시작
rm -rf frontend/.next
cd frontend && npm run dev
```

---

## 5. Workspace API 경로 불일치 (미해결 - 추후 작업)

### 현상
- 워크스페이스 페이지에서 최근 스튜디오 목록이 빈 배열로 표시됨 (에러는 catch 처리됨)

### 원인
| 항목 | 프론트엔드 | 백엔드 |
|------|-----------|--------|
| API 경로 | `GET /api/v1/workspace/{userId}/studios/recent` | `GET /api/studios/recent` |
| 응답 형식 | `{ studios: [{ id, title, date }] }` | `ApiResponse<List<RecentStudioResponse>>` |
| Gateway 라우트 | `/api/v1/workspace/**` 필요 | `/api/studios/**`만 등록 |

### 상태
- 프론트엔드 코드의 API 경로에 맞춰 백엔드를 수정하거나, 프론트엔드를 수정해야 함
- 워크스페이스 전체 작업 시 함께 해결 예정

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/widgets/workspace/sidebar/index.tsx` | `user.id` → `user.userId` 버그 수정 |
| `core-service/src/main/resources/application.yml` | OAuth redirect-uri 3001 → 3000 |
| `.idea/compiler.xml` | api-gateway, eureka-server 모듈 추가 |
| `.idea/encodings.xml` | api-gateway, eureka-server, media-service 인코딩 설정 |
| `docs/dev-branch-fixes-log.md` | 본 문서 (신규) |
