# Zod 검증 적용 후 오류 체크리스트

## ✅ 완료된 항목

### 1. 엔티티 스키마 정의
- ✅ Studio 엔티티 스키마
- ✅ User 엔티티 스키마
- ✅ Channel 엔티티 스키마
- ✅ Video 엔티티 스키마
- ✅ Favorite 엔티티 스키마

### 2. API 클라이언트 검증 로직
- ✅ GET 요청 검증
- ✅ POST 요청 검증
- ✅ PUT 요청 검증
- ✅ DELETE 요청 검증
- ✅ PATCH 요청 검증

### 3. 적용된 API 호출
- ✅ Studio 생성/조회
- ✅ Channel 목록/연결/해제
- ✅ Video 목록
- ✅ Favorite 목록/추가/삭제
- ✅ Login/Signup

---

## ⚠️ 확인 필요 항목

### 1. 아직 zod 스키마를 적용하지 않은 API 호출

#### 1.1 Notifications API
**위치:**
- `app/(main)/layout.tsx` (line 30)
- `widgets/workspace/top-nav/index.tsx` (line 24)

**현재 코드:**
```typescript
apiClient.get<{ notifications: Notification[] }>("/api/v1/notifications")
```

**필요 작업:**
- Notification 엔티티 스키마 생성 필요
- 또는 임시로 `z.object({ notifications: z.array(z.any()) })` 사용

#### 1.2 Workspace Studios API
**위치:**
- `features/workspace/workspace-home/ui/WorkspaceHome.tsx` (line 40)

**현재 코드:**
```typescript
apiClient.get<{ studios: Studio[] }>(`/api/v1/workspace/${userId}/studios/recent`)
```

**필요 작업:**
- `StudioListResponseSchema` 생성 또는 기존 `StudioSchema` 배열 사용

#### 1.3 User Search API
**위치:**
- `widgets/favorites/invite-member-dialog/ui/InviteMemberDialog.tsx` (line 67, 94)

**현재 코드:**
```typescript
apiClient.get<UserSearchResponse>(`/api/v1/favorites/search?q=...`)
```

**필요 작업:**
- 이미 `UserSearchResponseSchema`가 정의되어 있음 → 적용 필요

#### 1.4 OAuth Callback API
**위치:**
- `app/(main)/channels/oauth/callback/page.tsx` (line 45)

**현재 코드:**
```typescript
apiClient.get<{ channel: any; message: string; redirectUrl?: string }>(...)
```

**필요 작업:**
- OAuth Callback 응답 스키마 생성 필요

#### 1.5 Storage API
**위치:**
- `app/(main)/storage/page.tsx` (line 57-58)

**현재 코드:**
```typescript
apiClient.get<StorageData>("/api/v1/storage")
apiClient.get<{ files: StorageFile[] }>("/api/v1/storage/files")
```

**필요 작업:**
- Storage 엔티티 스키마 생성 필요 (또는 임시 스키마 사용)

---

### 2. MSW 핸들러와 스키마 일치 여부 확인

#### 2.1 Studio API
- ✅ `POST /api/v1/studios` - `CreateStudioResponseSchema`와 일치 확인 필요
- ✅ `GET /api/v1/studios/:id` - `StudioDetailSchema`와 일치 확인 필요

#### 2.2 Channel API
- ✅ `GET /api/v1/channels` - `ChannelListResponseSchema`와 일치 확인 필요
- ✅ `POST /api/v1/channels/connect` - `ConnectChannelResponseSchema`와 일치 확인 필요
- ⚠️ `DELETE /api/v1/channels/:id` - 응답 스키마 확인 필요 (현재 `z.any().optional()`)

#### 2.3 Favorite API
- ✅ `GET /api/v1/favorites` - `FavoriteListResponseSchema`와 일치 확인 필요
- ⚠️ `POST /api/v1/favorites` - 응답 스키마 확인 필요 (현재 `z.object({ message: z.string().optional() })`)
- ⚠️ `DELETE /api/v1/favorites/:id` - 응답 스키마 확인 필요 (현재 `z.any().optional()`)
- ✅ `GET /api/v1/favorites/search` - `UserSearchResponseSchema`와 일치 확인 필요

#### 2.4 Video API
- ✅ `GET /api/v1/library/videos` - `VideoListResponseSchema`와 일치 확인 필요

#### 2.5 Auth API
- ✅ `POST /api/v1/auth/login` - `AuthResponseSchema`와 일치 확인 필요
- ✅ `POST /api/v1/auth/signup` - `AuthResponseSchema`와 일치 확인 필요

---

### 3. DELETE 요청 응답 처리

**현재 구현:**
```typescript
await apiClient.delete(
  `/api/v1/favorites/${id}`,
  z.object({ message: z.string().optional() }).optional(),
);
```

**문제점:**
- DELETE 요청은 보통 응답 본문이 없거나 빈 객체일 수 있음
- `z.any().optional()` 또는 `z.void()` 사용 고려

**권장 수정:**
```typescript
// 옵션 1: 응답이 없는 경우
await apiClient.delete(`/api/v1/favorites/${id}`, z.void());

// 옵션 2: 응답이 선택적인 경우
await apiClient.delete(`/api/v1/favorites/${id}`, z.object({ message: z.string().optional() }).optional());

// 옵션 3: 빈 객체 허용
await apiClient.delete(`/api/v1/favorites/${id}`, z.object({}).optional());
```

---

### 4. 런타임 검증 오류 처리

**현재 구현:**
- 검증 실패 시 에러를 throw하고 있음
- 사용자에게 명확한 에러 메시지 표시 필요

**확인 사항:**
- [ ] 콘솔에 `[API Validation Error]` 로그가 출력되는지 확인
- [ ] 사용자에게 적절한 에러 메시지가 표시되는지 확인
- [ ] MSW 핸들러의 응답 형식이 스키마와 일치하는지 확인

---

### 5. 타입 안정성 확인

**확인 사항:**
- [ ] 모든 API 호출에서 타입 추론이 정상 작동하는지 확인
- [ ] `z.infer<typeof Schema>`로 추론된 타입이 기존 인터페이스와 일치하는지 확인
- [ ] TypeScript 컴파일 오류가 없는지 확인

---

## 🔧 권장 수정 사항

### 1. Notification 스키마 생성
```typescript
// entities/notification/model/schemas.ts
export const NotificationSchema = z.object({
  id: z.string(),
  type: z.enum(["friend_request", "studio_invite", "system"]),
  title: z.string(),
  message: z.string(),
  createdAt: z.string(),
  read: z.boolean().optional(),
});

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
});
```

### 2. Storage 스키마 생성
```typescript
// entities/storage/model/schemas.ts
export const StorageFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  uploadedAt: z.string(),
});

export const StorageDataSchema = z.object({
  total: z.number(),
  used: z.number(),
  available: z.number(),
});

export const StorageFilesResponseSchema = z.object({
  files: z.array(StorageFileSchema),
});
```

### 3. OAuth Callback 스키마 생성
```typescript
// entities/channel/model/schemas.ts에 추가
export const OAuthCallbackResponseSchema = z.object({
  channel: ChannelSchema.optional(),
  message: z.string(),
  redirectUrl: z.string().url().optional(),
});
```

### 4. DELETE 응답 스키마 통일
```typescript
// shared/api/schemas.ts
export const DeleteResponseSchema = z.object({
  message: z.string().optional(),
}).optional();
```

---

## 🐛 발견된 문제점

### 1. Favorite 추가 응답 불일치
**MSW 핸들러 (line 374-380):**
```typescript
return HttpResponse.json({
  message: "즐겨찾기에 추가되었습니다.",
  favorite: newFavorite,  // ← 이 필드가 스키마에 없음
}, { status: 201 });
```

**현재 스키마:**
```typescript
z.object({ message: z.string().optional() })
```

**해결 방법:**
- 스키마에 `favorite` 필드 추가 또는 MSW 핸들러에서 제거

### 2. DELETE 응답 처리
**MSW 핸들러 (line 384-400):**
- DELETE 요청은 빈 응답 또는 `{ message }` 반환 가능
- 현재 `z.any().optional()` 사용 중

**권장:**
```typescript
z.object({ message: z.string().optional() }).optional()
```

### 3. Workspace Studios 응답 형식 불일치
**MSW 핸들러 (line 129-140):**
```typescript
{
  studios: [
    { id: 1, title: "...", date: "..." },  // id가 number, date 필드 존재
  ]
}
```

**문제:**
- `StudioSchema`는 `id: string`, `date` 필드 없음
- 별도의 `RecentStudioSchema` 필요

---

## 📝 체크리스트

### 즉시 수정 필요
- [ ] Favorite 추가 응답 스키마 수정 (favorite 필드 추가)
- [ ] Workspace Studios 스키마 생성 (id: number, date 필드 포함)

### 점진적 적용
- [ ] Notification API에 스키마 적용
- [ ] User Search API에 스키마 적용 (이미 스키마 있음)
- [ ] OAuth Callback API에 스키마 적용
- [ ] Storage API에 스키마 적용

### 검증 및 테스트
- [ ] MSW 핸들러 응답 형식 검증
- [ ] DELETE 요청 응답 처리 개선
- [ ] 런타임 검증 오류 테스트
- [ ] 타입 안정성 최종 확인

---

*작성일: 2026-01-26*
