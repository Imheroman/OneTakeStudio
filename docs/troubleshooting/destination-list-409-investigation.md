# 채널 목록·409(이미 등록된 채널) 오류 탐색 요약

## 현상 (해결: 409 제거 → 200/201로 기존 데이터 반환)
- **POST** `/api/destinations`: 같은 채널 재등록 시 **409 Conflict** ("이미 등록된 채널입니다") → **조치**: 이미 등록된 활성 채널이면 409 대신 **201 Created + 기존 Destination 응답** 반환. 프론트는 성공 플로우로 목록 갱신·모달 닫기.
- **GET** `/api/destinations`: 목록이 비어 보이거나, 409 후 "목록 새로고침" 안내만 뜨고 리스트에 안 뜸 → **조치**: POST가 409를 반환하지 않으므로, 재등록 시에도 201 + 데이터를 받고 `fetchChannels()`로 목록이 갱신됨.

---

## 1. 백엔드·DB 로직 점검 결과

### 1.1 사용자 식별 (GET vs POST 동일)
- **API Gateway**: JWT에서 `subject`(UUID), `iid`(내부 Long) 추출 → `X-User-Uuid`, `X-User-Id` 헤더로 전달
- **Core Service**: Gateway 헤더를 쓰지 않고, **JWT를 직접 파싱** (`JwtAuthenticationFilter` → `JwtUtil.getUserId(token)` = subject)
- **DestinationController**: `@CurrentUser CustomUserDetails` → `userDetails.getUserId()` (UUID 문자열)
- **DestinationService**: `getInternalUserId(userId)`로 `UserRepository.findByUserId(userId)` → `User.getId()` (Long) 사용

→ GET 목록 조회와 POST 채널 등록이 **같은 JWT, 같은 userId(UUID) → 같은 internalUserId**로 동작함.  
→ 사용자 불일치로 인한 빈 목록 가능성은 낮음.

### 1.2 채널 중복 판단·저장
- **중복 여부**: `existsByUserIdAndPlatformAndChannelIdAndIsActiveTrue(internalUserId, platform, channelId)` (활성만)
- **목록 조회**: `findByUserIdAndIsActiveTrue(internalUserId)` (활성만)
- **재연결**: `findByUserIdAndPlatformAndChannelId`(isActive 무관)로 비활성 행 찾아서 `activate()` 후 반환

→ 409가 나왔다는 것은 **이미 해당 유저·플랫폼·채널ID 조합의 활성 행이 DB에 있다**는 뜻이며,  
동일 조건으로 GET을 호출하면 **같은 행이 목록에 포함되어야 함**.

### 1.3 적용한 백엔드 수정
- **platform / channelId 정규화**  
  - `createDestination` 진입 시 `platform`은 **trim + 소문자**, `channelId`는 **trim** 후 저장·조회에 사용  
  - 대소문자·앞뒤 공백 차이로 인한 "같은 채널인데 중복 아님" / "다른 채널인데 중복으로 판단" 방지
- **로깅 보강**  
  - `getMyDestinations`: 조회 결과 개수 로그  
    `연동 채널 목록 조회 결과: userId=..., internalUserId=..., count=...`  
  - 409 발생 시: `이미 등록된 채널: userId=..., platform=..., channelId=...`  
  → Core Service 로그로 GET이 0건인지 N건인지, 409 시 어떤 키로 조회했는지 확인 가능.

---

## 2. DB에서 확인할 것

1. **해당 사용자의 활성 채널이 실제로 있는지**
   - `connected_destinations` 테이블에서  
     `user_id` = (해당 유저의 내부 Long ID),  
     `is_active = 1`  
     인 행 존재 여부
2. **platform / channel_id 값**
   - 프론트에서 보내는 값(정규화 후 `youtube`, `UC...`)과 동일한지,  
   - 기존에 대문자·공백이 섞여 저장돼 있지 않은지  
   → 백엔드에서 이제 저장 시 소문자·trim 적용했으므로, 새로 넣는 데이터는 통일됨.

---

## 3. 프론트엔드 쪽 가능성 (이미 대응한 부분)

- **GET 응답 검증 실패**  
  - `createdAt` 등 형식 차이로 Zod 검증 실패 → `setChannels`가 호출되지 않아 목록이 비어 보일 수 있음  
  - **대응**: 스키마에 `createdAt` 문자열/배열 둘 다 허용, 백엔드 `DestinationResponse`에 `@JsonFormat`으로 ISO 문자열 출력.  
  - 추가로 **raw GET 폴백**: 검증 실패 시 `axiosInstance.get("/api/destinations")`로 받아 `safeMapRawDestinationsToChannels(res.data?.data)`로 목록 갱신.
- **409 후 목록 갱신**  
  - 409 발생 시 `fetchChannels()` 호출 후 "목록을 새로고침했습니다" 안내.  
  - 위 raw 폴백으로 검증 실패해도 목록은 갱신되도록 처리.

---

## 4. 재현 시 체크리스트

1. **Core Service 로그**
   - 채널 목록 요청 시: `연동 채널 목록 조회 결과: ... count=?`  
     → count가 0이면 DB에 활성 행이 없거나, internalUserId가 다름.
   - 409 발생 시: `이미 등록된 채널: userId=..., platform=..., channelId=...`  
     → 이 조합으로 DB에 행이 있는지 확인.
2. **DB**
   - `SELECT * FROM connected_destinations WHERE user_id = ? AND is_active = 1;`  
     (user_id는 `users.id` 값)
3. **브라우저**
   - GET `/api/destinations` 응답 본문: `data` 배열에 항목이 있는지,  
     `createdAt`이 문자열인지 배열인지.

---

## 5. 요약

| 구간           | 점검 내용                                      | 조치 |
|----------------|------------------------------------------------|------|
| 사용자 일치    | GET/POST 동일 JWT → 동일 userId → 동일 internalUserId | 추가 수정 없음 |
| platform/channelId | 대소문자·공백으로 중복/미표시 발생 가능        | 저장·조회 시 정규화(소문자, trim) 적용 |
| GET 목록 빈 이유 | 응답 검증 실패 시 setChannels 미호출           | raw GET 폴백 + createdAt 스키마/직렬화 정리 |
| 디버깅         | 목록이 왜 비어 있는지 추적 어려움              | GET 결과 count·409 시 키 로깅 추가 |

이 문서는 **DB·백엔드·프론트를 확장 탐색**한 결과를 정리한 것이며, 위 조치 적용 후에도 현상이 남으면 Core Service 로그의 `count`와 DB의 `connected_destinations`를 함께 보면 원인 범위를 더 줄일 수 있다.
