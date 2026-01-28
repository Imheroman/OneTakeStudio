# MSW 정리 작업 요약

## 완료된 작업

### 1. 구버전 API 핸들러 삭제
- ✅ `/api/auth/signup` 핸들러 삭제 (이미 `/api/auth/register`로 전환 완료)

### 2. 코드 주석 정리
- ✅ `entities/storage/model/schemas.ts` - MSW 관련 주석 제거
- ✅ `entities/notification/model/schemas.ts` - MSW 관련 주석 정리
- ✅ `widgets/shorts/shorts-configurator.tsx` - MSW 관련 주석 제거
- ✅ `app/(main)/mypage/page.tsx` - MSW 관련 주석 제거
- ✅ `mock/handlers.ts` - BASE_URL 주석 개선

## 다음 단계

### Phase 2: 백엔드 API 구현 확인 후 MSW 핸들러 삭제
각 기능별로 백엔드 API 구현 여부를 확인하고, 구현 완료된 것부터 MSW 핸들러를 삭제합니다.

**우선순위:**
1. **즐겨찾기 API** - 이미 실제 API 사용 중 (`FavoriteManagement.tsx`)
2. **채널 API** - 이미 실제 API 사용 중 (`ChannelManagement.tsx`)
3. **스튜디오 API** - 이미 실제 API 사용 중 (`StudioMain.tsx`, `StudioCreation.tsx`)
4. **쇼츠 API** - 이미 실제 API 사용 중 (`shorts-configurator.tsx`, `useShortsPolling.ts`)
5. **알림 API** - 이미 실제 API 사용 중 (`app/(main)/layout.tsx`)
6. **워크스페이스 API** - 백엔드 구현 확인 필요
7. **스토리지 API** - 백엔드 구현 확인 필요
8. **라이브러리 API** - 백엔드 구현 확인 필요

### Phase 3: MSW 완전 제거 (모든 API 전환 완료 후)
모든 API가 실제 백엔드로 전환되면:
1. `src/mock/` 디렉토리 전체 삭제
2. `package.json`에서 `msw` 의존성 제거
3. `src/app/layout.tsx`에서 `MSWComponent` 제거
4. 환경 변수 및 테스트 설정 정리

## 참고 문서
- [MSW_REMOVAL_PLAN.md](./MSW_REMOVAL_PLAN.md) - 상세 삭제 계획
