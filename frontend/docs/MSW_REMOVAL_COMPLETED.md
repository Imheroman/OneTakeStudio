# MSW 삭제 및 백엔드 API 연결 완료

## 완료된 작업

### 1. MSW 핸들러 삭제 (실제 API 사용 중인 기능)
다음 API들의 MSW 핸들러를 삭제했습니다:
- ✅ `/api/auth/login` - 실제 API 사용 중
- ✅ `/api/auth/signup` - 구버전 (이미 `/api/auth/register`로 전환)
- ✅ `/api/workspace/:userId/studios/recent` - 실제 API 사용 중
- ✅ `/api/notifications` - 실제 API 사용 중
- ✅ `/api/favorites` (GET, POST, DELETE) - 실제 API 사용 중
- ✅ `/api/favorites/search` - 실제 API 사용 중
- ✅ `/api/channels` (GET, POST, DELETE) - 실제 API 사용 중
- ✅ `/api/studios` (POST, GET) - 실제 API 사용 중
- ✅ `/api/v1/shorts/generate` - 실제 API 사용 중
- ✅ `/api/v1/shorts/status` - 실제 API 사용 중

### 2. 코드 구조 개선
- ✅ `shorts-configurator.tsx`: `fetch` → `apiClient`로 변경
- ✅ 쇼츠 생성 요청/응답 스키마 추가
- ✅ MSW 관련 주석 정리
- ✅ 사용하지 않는 MSW 상태 변수 삭제 (favorites, channels, shortsServerState)

### 3. 워크스페이스 홈 페이지 API 연결
- ✅ 최근 스튜디오 목록 API 연결 확인 및 에러 처리 개선
- ✅ 스튜디오 생성 API 백엔드 스펙에 맞게 수정
  - 요청: `{ name: string, template?: string }` (백엔드 스펙)
  - 응답: `ApiResponse<StudioDetailResponse>`
- ✅ 스튜디오 조회 API 백엔드 스펙에 맞게 수정
  - 응답: `ApiResponse<StudioDetailResponse>`

### 4. 스키마 업데이트
- ✅ `StudioDetailResponseSchema` 추가 (백엔드 응답 형식)
- ✅ `CreateStudioRequestSchema` 수정 (백엔드 요청 형식)
- ✅ `ShortsGenerateRequestSchema`, `ShortsGenerateResponseSchema` 추가

## 남아있는 MSW 핸들러

다음 API들은 백엔드 구현 확인 후 삭제 예정:
- `/api/storage` - 백엔드 구현 확인 필요
- `/api/storage/files` - 백엔드 구현 확인 필요
- `/api/library/videos` - 백엔드 구현 확인 필요

## 주요 변경 파일

### 삭제/수정된 파일
- `src/mock/handlers.ts` - 실제 API 사용 중인 핸들러 삭제
- `src/widgets/shorts/shorts-configurator.tsx` - fetch → apiClient
- `src/features/studio/studio-creation/ui/StudioCreation.tsx` - 백엔드 API 스펙에 맞게 수정
- `src/features/studio/studio-main/ui/StudioMain.tsx` - 백엔드 API 스펙에 맞게 수정
- `src/features/workspace/workspace-home/ui/WorkspaceHome.tsx` - 에러 처리 개선

### 추가/수정된 스키마
- `src/entities/studio/model/schemas.ts` - 백엔드 스펙에 맞게 수정
- `src/entities/video/model/schemas.ts` - 쇼츠 생성 스키마 추가

## 다음 단계

1. **남은 MSW 핸들러 삭제** (백엔드 구현 확인 후)
   - 스토리지 API
   - 라이브러리 API

2. **MSW 완전 제거** (모든 API 전환 완료 후)
   - `src/mock/` 디렉토리 삭제
   - `package.json`에서 `msw` 제거
   - `src/app/layout.tsx`에서 `MSWComponent` 제거

3. **테스트 정리**
   - MSW 관련 테스트 파일 정리
   - 실제 API 테스트로 완전 전환
