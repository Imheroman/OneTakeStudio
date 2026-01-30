# 즐겨찾기 요청/수락 시스템 구현

## 개요

파트너 즐겨찾기 기능을 요청/수락 방식으로 구현하여, 상대방의 동의 후에만 즐겨찾기에 추가되도록 변경.

**커밋**: `f509507 feat: 즐겨찾기 요청/수락 시스템 및 인증 개선`

---

## 구현 기능

### 1. 즐겨찾기 요청 흐름

```
A가 B에게 요청 → B의 알림에 표시 → B가 수락/거절 → 수락 시 A의 즐겨찾기에 B 추가
```

### 2. API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/favorites` | 즐겨찾기 목록 조회 |
| POST | `/api/favorites` | 즐겨찾기 요청 보내기 |
| DELETE | `/api/favorites/{userId}` | 즐겨찾기 삭제 |
| GET | `/api/favorites/search?q=` | 사용자 검색 |
| GET | `/api/favorites/requests` | 받은 요청 목록 |
| POST | `/api/favorites/requests/{id}/accept` | 요청 수락 |
| POST | `/api/favorites/requests/{id}/decline` | 요청 거절 |
| GET | `/api/notifications` | 알림 목록 |

### 3. 생성된 파일

#### Backend (core-service)
```
favorite/
├── controller/FavoriteController.java
├── dto/
│   ├── AddFavoriteRequest.java
│   ├── AddFavoriteResponse.java
│   ├── FavoriteListResponse.java
│   ├── FavoriteRequestResponse.java
│   └── FavoriteResponse.java
├── entity/
│   ├── Favorite.java
│   └── FavoriteRequest.java
├── repository/
│   ├── FavoriteRepository.java
│   └── FavoriteRequestRepository.java
└── service/FavoriteService.java

notification/
├── entity/Notification.java
├── repository/NotificationRepository.java
└── service/NotificationService.java

user/dto/UserSearchResponse.java
```

#### Frontend
```
src/
├── middleware.ts                    # Next.js 인증 미들웨어
├── shared/
│   ├── lib/jwt.ts                   # JWT 유틸리티
│   └── providers/AuthProvider.tsx   # 인증 Provider
└── (수정된 파일들)
```

---

## 트러블슈팅

### 1. 사용자 검색 API 없음

**문제**: 프론트엔드가 `/api/favorites/search?q=검색어`를 호출하지만 백엔드에 API 없음

**해결**:
- `UserRepository`에 검색 메서드 추가
- `UserService`에 `searchUsers()` 메서드 추가
- `FavoriteController`에 검색 엔드포인트 추가
- API Gateway에 `/api/favorites/**` 라우팅 추가

```java
@Query("SELECT u FROM User u WHERE u.isActive = true AND " +
        "(LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "LOWER(u.nickname) LIKE LOWER(CONCAT('%', :query, '%')))")
List<User> searchByEmailOrNickname(@Param("query") String query);
```

### 2. Zod 스키마 `null` 검증 실패

**문제**: 백엔드가 `favorite: null`을 반환하면 프론트엔드 Zod 검증 실패
- `optional()`은 `undefined`만 허용, `null`은 허용하지 않음

**해결**: `nullable()` 추가
```typescript
// Before
favorite: FavoriteSchema.optional()

// After
favorite: FavoriteSchema.nullable().optional()
```

### 3. 알림 뱃지 카운트 업데이트 안됨

**문제**: 알림을 수락/거절해도 뱃지 숫자가 그대로 유지됨

**해결**: `top-nav/index.tsx`에서 알림 패널 상태 변경 시 카운트 새로고침
```typescript
useEffect(() => {
  fetchNotificationCount();
}, [fetchNotificationCount, isNotificationOpen]);
```

### 4. Lombok `@Builder.Default` 작동 안함

**문제**: `Notification` 엔티티에서 `isRead` 필드가 `null`로 저장됨
- `@Builder.Default`가 Builder 패턴에서 제대로 작동하지 않는 경우 있음

**해결**: 팩토리 메서드에서 명시적으로 값 설정
```java
public static Notification createFriendRequest(...) {
    return Notification.builder()
            // ...
            .isRead(false)  // 명시적 설정 추가
            .build();
}
```

### 5. 기존 요청 삭제 후 새 요청 시 Unique Constraint 위반

**문제**: 거절된 요청이 있는 상태에서 재요청 시 서버 오류 (500)
- `delete()` 후 바로 `save()` 하면 flush가 안 되어 unique constraint 위반

**해결**: `EntityManager.flush()` 추가
```java
if (existingRequest.isPresent()) {
    favoriteRequestRepository.delete(existingRequest.get());
    entityManager.flush(); // 삭제 즉시 반영
}
```

### 6. 토큰 만료 후에도 페이지 접근 가능

**문제**: JWT 토큰이 만료되어도 프론트엔드에서 보호된 페이지 접근 가능

**해결**:
1. `jwt.ts` - JWT 파싱 및 만료 체크 유틸리티 추가
2. `useAuthStore.ts` - `checkAuth()`, `isAuthenticated()` 메서드 추가
3. `middleware.ts` - 서버사이드 인증 체크 (쿠키 기반)
4. `AuthProvider.tsx` - 주기적 토큰 만료 체크
5. `client.ts` - 401 응답 시 자동 로그아웃

```typescript
// jwt.ts
export function isTokenExpired(token: string | null, bufferSeconds = 60): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + bufferSeconds;
}
```

---

## 테스트 결과

### API 테스트

```bash
# 1. 즐겨찾기 요청 보내기
POST /api/favorites
→ {"message":"즐겨찾기 요청을 보냈습니다.","favorite":null}

# 2. 중복 요청 시도
POST /api/favorites
→ {"resultCode":"FAILURE","message":"이미 요청을 보냈습니다. 상대방의 수락을 기다려주세요."}

# 3. 사용자 검색
GET /api/favorites/search?q=gmail
→ {"users":[{"id":"...","nickname":"동언님","email":"kimde1852@gmail.com"}]}

# 4. 즐겨찾기 목록 (수락 전)
GET /api/favorites
→ {"favorites":[],"total":0,"maxCount":10}
```

### 전체 흐름 검증

| 단계 | 동작 | 결과 |
|------|------|------|
| 1 | A가 B 검색 | ✅ 검색 결과 표시 |
| 2 | A가 B에게 요청 | ✅ 성공 메시지 |
| 3 | A가 다시 요청 | ✅ 중복 에러 |
| 4 | B의 알림 조회 | ✅ friend_request 타입 표시 |
| 5 | B가 수락 | ✅ A의 즐겨찾기에 B 추가 |
| 6 | B가 거절 | ✅ 요청만 거절됨 |

---

## 데이터베이스 테이블

### favorites
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT | PK |
| favorite_id | VARCHAR(36) | UUID |
| owner_id | BIGINT | FK (users) |
| target_id | BIGINT | FK (users) |
| created_at | DATETIME | 생성일시 |

### favorite_requests
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT | PK |
| request_id | VARCHAR(36) | UUID |
| requester_id | BIGINT | FK (users) |
| target_id | BIGINT | FK (users) |
| status | VARCHAR(20) | PENDING, ACCEPTED, DECLINED |
| created_at | DATETIME | 생성일시 |
| responded_at | DATETIME | 응답일시 |

### notifications
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT | PK |
| notification_id | VARCHAR(36) | UUID |
| user_id | BIGINT | FK (users) |
| type | VARCHAR(30) | FRIEND_REQUEST, STUDIO_INVITE, ... |
| title | VARCHAR(100) | 제목 |
| message | VARCHAR(500) | 내용 |
| reference_id | VARCHAR(36) | 참조 ID (요청 ID 등) |
| is_read | BOOLEAN | 읽음 여부 |
| created_at | DATETIME | 생성일시 |

---

## 참고사항

1. **Unique Constraint**: `favorite_requests` 테이블에 `(requester_id, target_id)` unique constraint 있음
   - 거절 후 재요청 허용을 위해 기존 요청 삭제 후 새 요청 생성

2. **알림 삭제**: 요청 수락/거절 시 해당 알림도 함께 삭제됨

3. **최대 즐겨찾기**: 10명까지 등록 가능 (`MAX_FAVORITES = 10`)

4. **토큰 만료 버퍼**: 만료 60초 전부터 만료로 처리 (`bufferSeconds = 60`)
