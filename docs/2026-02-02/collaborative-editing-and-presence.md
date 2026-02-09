# 2026-02-02 개발 작업 내역

## 개요

오늘 작업은 크게 다음 영역에서 진행되었습니다:

1. 스튜디오 초대 시스템 버그 수정
2. 실시간 온라인 멤버 표시 기능 구현
3. 워크스페이스 Role 표시 및 자동 갱신
4. 각종 에러 처리 개선

---

## 1. 워크스페이스 Role Badge 표시 수정

### 문제

워크스페이스 홈 화면의 최근 스튜디오 목록에서 Role 컬럼이 표시되지 않음

### 해결

테이블 행에 RoleBadge 셀 추가, colSpan 조정

### 수정 파일

- `frontend/src/widgets/workspace/workspace-home/ui/WorkspaceHome.tsx`

### 변경 내용

```tsx
// 테이블 행에 Role 셀 추가
<TableCell>
  <RoleBadge role={studio.role} />
</TableCell>

// 빈 상태 colSpan 3 → 4로 변경
<TableCell colSpan={4} className="h-24 text-center">
```

---

## 2. 스튜디오 초대 수락/거절 API 수정

### 문제

스튜디오 초대 수락 시 400 Bad Request 발생

- 잘못된 엔드포인트 사용: `/api/favorites/requests/{id}/accept`
- 올바른 엔드포인트: `/api/invites/{inviteId}/accept`

### 해결

알림 타입별로 다른 API 엔드포인트 사용하도록 수정

### 수정 파일

- `frontend/src/app/(main)/layout.tsx`
- `frontend/src/entities/notification/model/schemas.ts`
- `core-service/src/main/java/com/onetake/core/notification/dto/NotificationResponse.java`

### 변경 내용

#### 프론트엔드 - 알림 액션 분기 처리

```typescript
// layout.tsx - 알림 타입별 액션 분기
notif.type === "friend_request"
  ? {
      accept: () => apiClient.post(`/api/favorites/requests/${notif.id}/accept`, ...),
      decline: () => apiClient.post(`/api/favorites/requests/${notif.id}/decline`, ...),
    }
  : notif.type === "studio_invite" && notif.referenceId
    ? {
        accept: () => apiClient.post(`/api/invites/${notif.referenceId}/accept`, ...),
        decline: () => apiClient.post(`/api/invites/${notif.referenceId}/reject`, ...),
      }
    : undefined
```

#### 알림 스키마에 referenceId 추가

```typescript
// schemas.ts
export const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  referenceId: z.string().nullable().optional(), // 초대 ID 등 참조 ID
  time: z.string(),
  createdAt: z.string().optional(),
  read: z.boolean().optional(),
  isRead: z.boolean().optional(),
});
```

#### 백엔드 - NotificationResponse에 referenceId 추가

```java
// NotificationResponse.java
@Builder
public record NotificationResponse(
    String id,
    String type,
    String title,
    String message,
    String referenceId,  // 추가
    String time,
    String createdAt,
    boolean read
) {}
```

---

## 3. 초대 수락 후 알림 자동 삭제

### 문제

스튜디오 초대를 수락해도 알림이 그대로 남아있음

### 해결

1. 백엔드: InviteController에서 수락/거절 시 알림 삭제
2. 프론트엔드: 로컬 상태에서도 알림 제거

### 수정 파일

- `core-service/src/main/java/com/onetake/core/studio/controller/InviteController.java`
- `core-service/src/main/java/com/onetake/core/notification/repository/NotificationRepository.java`
- `frontend/src/app/(main)/layout.tsx`

### 변경 내용

#### 백엔드 - 초대 수락/거절 시 알림 삭제

```java
// InviteController.java
@PostMapping("/{inviteId}/accept")
public ResponseEntity<ApiResponse<StudioMemberResponse>> acceptInvite(
        @CurrentUser CustomUserDetails userDetails,
        @PathVariable String inviteId) {

    StudioMemberResponse member = studioMemberService.acceptInvite(userDetails.getUserId(), inviteId);

    // 초대 관련 알림 삭제
    notificationService.deleteByReferenceId(inviteId);

    return ResponseEntity.ok(ApiResponse.success("초대를 수락했습니다", member));
}
```

#### 백엔드 - @Modifying 어노테이션 추가

```java
// NotificationRepository.java
@Modifying
void deleteByReferenceId(String referenceId);
```

#### 프론트엔드 - 로컬 알림 제거

```typescript
// layout.tsx
const removeNotification = useCallback((notifId: string) => {
  setApiNotifications((prev) => prev.filter((n) => n.id !== notifId));
}, []);

// 수락 액션에서 호출
accept: async () => {
  await apiClient.post(`/api/invites/${notif.referenceId}/accept`, ...);
  removeNotification(notif.id);
  window.dispatchEvent(new CustomEvent("studio-invite-accepted"));
  closeNotifications();
}
```

---

## 4. 워크스페이스 자동 갱신 (Custom Event)

### 문제

스튜디오 초대를 수락해도 워크스페이스 홈의 최근 스튜디오 목록이 갱신되지 않음

### 해결

Custom Event를 사용하여 초대 수락 시 워크스페이스 데이터 갱신 트리거

### 수정 파일

- `frontend/src/app/(main)/layout.tsx`
- `frontend/src/features/workspace/workspace-home/model/useWorkspaceHome.ts`

### 변경 내용

#### 이벤트 발행 (layout.tsx)

```typescript
// 초대 수락 성공 시
window.dispatchEvent(new CustomEvent("studio-invite-accepted"));
```

#### 이벤트 구독 (useWorkspaceHome.ts)

```typescript
useEffect(() => {
  const handleInviteAccepted = () => {
    fetchRecentStudios();
  };

  window.addEventListener("studio-invite-accepted", handleInviteAccepted);
  return () => {
    window.removeEventListener("studio-invite-accepted", handleInviteAccepted);
  };
}, [fetchRecentStudios]);
```

---

## 5. 404/403 에러 Graceful 처리

### 문제

1. 이미 처리된 초대를 거절하려고 할 때 404 에러
2. 권한 없이 초대 목록 조회 시 403 에러

### 해결

에러를 graceful하게 처리하여 사용자 경험 개선

### 수정 파일

- `frontend/src/app/(main)/layout.tsx`
- `frontend/src/shared/api/studio-members.ts`

### 변경 내용

#### 404 에러 처리 - 이미 처리된 초대

```typescript
// layout.tsx - decline 핸들러
decline: async () => {
  try {
    await apiClient.post(`/api/invites/${notif.referenceId}/reject`, ...);
    removeNotification(notif.id);
    closeNotifications();
  } catch (error: unknown) {
    // 404 에러는 이미 처리된 초대 - 알림만 제거
    const status = (error as { status?: number })?.status;
    if (status === 404) {
      removeNotification(notif.id);
      closeNotifications();
      return;
    }
    alert("스튜디오 초대 거절에 실패했습니다.");
  }
}
```

#### 403 에러 처리 - 권한 없음

```typescript
// studio-members.ts
export async function getStudioInvites(studioId: string | number): Promise<InviteResponse[]> {
  try {
    const res = await apiClient.get(`/api/studios/${studioId}/invites`, ...);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error: unknown) {
    // 403 에러는 권한 없음 - 빈 배열 반환
    const axiosError = error as { response?: { status?: number } };
    if (axiosError?.response?.status === 403) {
      return [];
    }
    throw error;
  }
}
```

---

## 6. 실시간 온라인 멤버 표시 기능

### 기능 설명

스튜디오에 접속 중인 멤버를 실시간으로 표시 (초록색 점)

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  useStudioStateSync Hook                                         │
│  ├─ WebSocket 연결 (STOMP over SockJS)                          │
│  ├─ /topic/studio/{id}/presence 구독                            │
│  ├─ MEMBER_JOINED 메시지 수신 → 목록에 추가                      │
│  ├─ MEMBER_LEFT 메시지 수신 → 목록에서 제거                      │
│  └─ CURRENT_MEMBERS 메시지 수신 → 전체 목록 초기화               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (ws://localhost:8082/ws/media)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (media-service)                       │
├─────────────────────────────────────────────────────────────────┤
│  StudioPresenceService                                           │
│  ├─ ConcurrentHashMap<studioId, Map<userId, OnlineMember>>      │
│  ├─ memberJoined() → 목록 추가 + MEMBER_JOINED 브로드캐스트     │
│  │                 → CURRENT_MEMBERS 신규 접속자에게 전송        │
│  └─ memberLeft() → 목록 제거 + MEMBER_LEFT 브로드캐스트          │
│                                                                  │
│  StudioStateWebSocketController                                  │
│  └─ @MessageMapping("/studio/{studioId}/presence")              │
└─────────────────────────────────────────────────────────────────┘
```

### 메시지 타입

| 타입              | 설명             | 전송 시점                                |
| ----------------- | ---------------- | ---------------------------------------- |
| `MEMBER_JOINED`   | 멤버 입장 알림   | 새 사용자 접속 시 전체 브로드캐스트      |
| `MEMBER_LEFT`     | 멤버 퇴장 알림   | 사용자 연결 해제 시 전체 브로드캐스트    |
| `CURRENT_MEMBERS` | 현재 접속자 목록 | 새 사용자 접속 시 해당 사용자에게만 전송 |

### 신규 파일

- `media-service/src/main/java/com/onetake/media/studio/service/StudioPresenceService.java`

### 수정 파일

- `media-service/src/main/java/com/onetake/media/studio/dto/StudioStateMessage.java`
- `media-service/src/main/java/com/onetake/media/studio/controller/StudioStateWebSocketController.java`
- `frontend/src/hooks/studio/useStudioStateSync.ts`
- `frontend/src/widgets/studio/studio-sidebar/panels/StudioMemberPanel.tsx`
- `frontend/src/widgets/studio/studio-sidebar/ui/StudioSidebar.tsx`
- `frontend/src/widgets/studio/studio-main/ui/StudioMain.tsx`
- `frontend/src/features/studio/studio-main/model/useStudioMain.ts`

### 백엔드 구현

#### StudioPresenceService.java (신규)

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class StudioPresenceService {

    private final SimpMessagingTemplate messagingTemplate;

    // 스튜디오별 접속자 목록
    private final Map<Long, Map<String, OnlineMember>> studioMembers = new ConcurrentHashMap<>();

    public record OnlineMember(String odUserId, String nickname, LocalDateTime joinedAt) {}

    public void memberJoined(Long studioId, String userId, String nickname) {
        Map<String, OnlineMember> members = studioMembers.computeIfAbsent(studioId, k -> new ConcurrentHashMap<>());

        if (members.containsKey(userId)) return;

        // 현재 접속자 목록 (새 멤버 추가 전)
        List<Map<String, Object>> currentMembers = members.values().stream()
                .map(m -> Map.of("odUserId", m.odUserId(), "nickname", m.nickname(), "joinedAt", m.joinedAt().toString()))
                .toList();

        // 새 멤버 추가
        OnlineMember newMember = new OnlineMember(userId, nickname, LocalDateTime.now());
        members.put(userId, newMember);

        // 1. MEMBER_JOINED 브로드캐스트
        StudioStateMessage joinedMessage = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.MEMBER_JOINED)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/presence", joinedMessage);

        // 2. CURRENT_MEMBERS 전송 (신규 접속자에게)
        List<Map<String, Object>> allMembers = new ArrayList<>(currentMembers);
        allMembers.add(Map.of("odUserId", userId, "nickname", nickname, "joinedAt", newMember.joinedAt().toString()));

        StudioStateMessage currentMembersMessage = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.CURRENT_MEMBERS)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .payload(Map.of("members", allMembers))
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/presence", currentMembersMessage);
    }

    public void memberLeft(Long studioId, String userId, String nickname) {
        Map<String, OnlineMember> members = studioMembers.get(studioId);
        if (members == null) return;

        members.remove(userId);

        StudioStateMessage leftMessage = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.MEMBER_LEFT)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/presence", leftMessage);
    }
}
```

#### StudioStateMessage - CURRENT_MEMBERS 타입 추가

```java
public enum StudioStateType {
    // ... 기존 타입들
    MEMBER_JOINED,
    MEMBER_LEFT,
    CURRENT_MEMBERS  // 신규 추가
}
```

### 프론트엔드 구현

#### useStudioStateSync.ts - 프레즌스 처리

```typescript
export interface OnlineMember {
  odUserId: string;
  nickname: string;
  joinedAt: string;
}

// 프레즌스 구독
client.subscribe(`/topic/studio/${studioId}/presence`, (message: IMessage) => {
  const presenceMessage: StudioStateMessage = JSON.parse(message.body);

  if (presenceMessage.type === "CURRENT_MEMBERS") {
    // 서버에서 전송한 현재 접속자 목록으로 초기화
    const members = presenceMessage.payload?.members ?? [];
    setOnlineMembers(
      members.map((m) => ({
        odUserId: m.odUserId,
        nickname: m.nickname,
        joinedAt: m.joinedAt,
      }))
    );
  } else if (presenceMessage.type === "MEMBER_JOINED") {
    setOnlineMembers((prev) => {
      if (prev.some((m) => m.odUserId === presenceMessage.userId)) return prev;
      return [
        ...prev,
        {
          odUserId: presenceMessage.userId,
          nickname: presenceMessage.nickname,
          joinedAt: presenceMessage.timestamp,
        },
      ];
    });
  } else if (presenceMessage.type === "MEMBER_LEFT") {
    setOnlineMembers((prev) =>
      prev.filter((m) => m.odUserId !== presenceMessage.userId)
    );
  }
});
```

#### StudioMemberPanel.tsx - 온라인 상태 UI

```tsx
// 온라인 상태 확인
const isOnline = (m: StudioMemberResponse) =>
  onlineMembers.some(
    (online) => online.nickname === m.nickname || online.nickname === m.email
  );

// 온라인 상태 표시 (초록 점)
{
  isOnline(m) && (
    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-700 rounded-full" />
  );
}
```

---

## 7. 타임스탬프 형식 호환 수정

### 문제

프론트엔드에서 보내는 ISO 8601 UTC 형식 (`2026-02-02T07:00:05.252Z`)을 백엔드의 `LocalDateTime`이 파싱하지 못함

### 에러 메시지

```
Cannot deserialize value of type `java.time.LocalDateTime` from String "2026-02-02T07:00:05.252Z":
Text '2026-02-02T07:00:05.252Z' could not be parsed, unparsed text found at index 19
```

### 해결

`StudioStateMessage`의 `timestamp` 필드를 `LocalDateTime` → `String`으로 변경

### 수정 파일

- `media-service/src/main/java/com/onetake/media/studio/dto/StudioStateMessage.java`
- `media-service/src/main/java/com/onetake/media/studio/service/StudioPresenceService.java`
- `media-service/src/main/java/com/onetake/media/studio/service/StudioStateService.java`
- `media-service/src/main/java/com/onetake/media/studio/controller/StudioStateWebSocketController.java`

### 변경 내용

```java
// Before
@JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
@Builder.Default
private LocalDateTime timestamp = LocalDateTime.now();

// After
@Builder.Default
private String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
```

---

## 8. Fast Refresh 문제 수정

### 문제

대시보드에서 Fast Refresh 메시지가 계속 나타남

### 원인

1. navbar.tsx에서 중복 `useShortsPolling()` 호출
2. 불필요한 `console.log` 출력

### 해결

중복 호출 및 console.log 제거

### 수정 파일

- `frontend/src/widgets/layout/navbar.tsx`
- `frontend/src/features/workspace/workspace-home/model/useWorkspaceHome.ts`

---

## 수정 파일 전체 목록

### Backend (core-service)

| 파일                                                  | 변경 유형 | 설명                            |
| ----------------------------------------------------- | --------- | ------------------------------- |
| `notification/dto/NotificationResponse.java`          | 수정      | referenceId 필드 추가           |
| `notification/service/NotificationService.java`       | 수정      | toResponse에서 referenceId 매핑 |
| `notification/repository/NotificationRepository.java` | 수정      | @Modifying 어노테이션 추가      |
| `studio/controller/InviteController.java`             | 수정      | 수락/거절 시 알림 삭제          |

### Backend (media-service)

| 파일                                                    | 변경 유형 | 설명                                             |
| ------------------------------------------------------- | --------- | ------------------------------------------------ |
| `studio/service/StudioPresenceService.java`             | **신규**  | 온라인 멤버 추적 서비스                          |
| `studio/dto/StudioStateMessage.java`                    | 수정      | CURRENT_MEMBERS 타입 추가, timestamp String 변경 |
| `studio/controller/StudioStateWebSocketController.java` | 수정      | PresenceService 연동                             |
| `studio/service/StudioStateService.java`                | 수정      | timestamp 형식 변경                              |

### Frontend

| 파일                                                          | 변경 유형 | 설명                                            |
| ------------------------------------------------------------- | --------- | ----------------------------------------------- |
| `app/(main)/layout.tsx`                                       | 수정      | 초대 API 분기, 알림 제거, 에러 처리             |
| `entities/notification/model/schemas.ts`                      | 수정      | referenceId 필드 추가                           |
| `entities/studio/model/schemas.ts`                            | 수정      | Source 스키마에 원격 소스 필드 추가             |
| `shared/api/studio-members.ts`                                | 수정      | 403 에러 graceful 처리                          |
| `hooks/studio/index.ts`                                       | 수정      | useStudioLiveKit export 추가                    |
| `hooks/studio/useStudioLiveKit.ts`                            | **신규**  | LiveKit 실시간 미디어 공유 훅                   |
| `hooks/studio/useStudioStateSync.ts`                          | 수정      | CURRENT_MEMBERS 처리, OnlineMember 타입         |
| `hooks/studio/useSourceStreams.ts`                            | 수정      | getRemoteStream 옵션 추가 (원격 소스 지원)      |
| `widgets/studio/studio-sidebar/panels/StudioMemberPanel.tsx`  | 수정      | 온라인 상태 UI                                  |
| `widgets/studio/studio-sidebar/ui/StudioSidebar.tsx`          | 수정      | onlineMembers props 전달                        |
| `widgets/studio/studio-main/ui/StudioMain.tsx`                | 수정      | onlineMembers, getRemoteStream 전달             |
| `features/studio/studio-main/model/useStudioMain.ts`          | 수정      | LiveKit 연동, 원격 소스 병합, publish/unpublish |
| `features/workspace/workspace-home/model/useWorkspaceHome.ts` | 수정      | 초대 수락 이벤트 리스너                         |
| `widgets/workspace/workspace-home/ui/WorkspaceHome.tsx`       | 수정      | Role 셀 추가                                    |
| `widgets/layout/navbar.tsx`                                   | 수정      | 중복 polling 제거                               |

---

## 9. 실시간 미디어 공유 구현

### 기능 설명

호스트 또는 게스트가 추가한 미디어 소스(웹캠, 화면 공유, 마이크)를 다른 참가자들이 실시간으로 볼 수 있도록 구현

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  useStudioLiveKit Hook                                           │
│  ├─ LiveKit Room 자동 연결                                       │
│  ├─ 로컬 트랙 publish (비디오/오디오/화면공유)                    │
│  ├─ 원격 트랙 subscribe (다른 참가자 미디어)                      │
│  └─ remoteSources 상태 관리                                      │
│                                                                  │
│  useStudioMain Hook                                              │
│  ├─ remoteSources → sources 상태 병합                            │
│  ├─ handleAddSourceConfirm → publishTrack 호출                   │
│  └─ handleRemoveSource → unpublishTrack 호출                     │
│                                                                  │
│  useSourceStreams Hook                                           │
│  ├─ 로컬 소스: getUserMedia/getDisplayMedia                      │
│  └─ 원격 소스: getRemoteStream (LiveKit)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ LiveKit WebRTC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LiveKit Server                              │
├─────────────────────────────────────────────────────────────────┤
│  Room: studio-{studioId}                                         │
│  ├─ 참가자 관리                                                  │
│  ├─ 미디어 라우팅                                                │
│  └─ Selective Forwarding Unit (SFU)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Token API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (media-service)                       │
├─────────────────────────────────────────────────────────────────┤
│  StreamController                                                │
│  └─ POST /api/streams/join → LiveKit 토큰 발급                   │
└─────────────────────────────────────────────────────────────────┘
```

### 메시지/이벤트 흐름

| 이벤트              | 설명                | 동작                                        |
| ------------------- | ------------------- | ------------------------------------------- |
| `TrackSubscribed`   | 원격 트랙 구독      | remoteSources에 추가, sources에 병합        |
| `TrackUnsubscribed` | 원격 트랙 구독 해제 | remoteSources에서 제거                      |
| 소스 추가           | 사용자가 소스 추가  | publishTrack 호출, WebSocket 브로드캐스트   |
| 소스 제거           | 사용자가 소스 제거  | unpublishTrack 호출, WebSocket 브로드캐스트 |

### 신규 파일

- `frontend/src/hooks/studio/useStudioLiveKit.ts`

### 수정 파일

- `frontend/src/hooks/studio/index.ts`
- `frontend/src/hooks/studio/useSourceStreams.ts`
- `frontend/src/entities/studio/model/schemas.ts`
- `frontend/src/features/studio/studio-main/model/useStudioMain.ts`
- `frontend/src/widgets/studio/studio-main/ui/StudioMain.tsx`

### 백엔드 (기존 사용)

LiveKit 토큰 발급 API는 이미 구현되어 있음:

- `media-service/src/main/java/com/onetake/media/stream/controller/StreamController.java`

### 프론트엔드 구현

#### useStudioLiveKit.ts (신규)

```typescript
export interface RemoteSource {
  id: string;
  participantId: string;
  participantName: string;
  trackSid: string;
  type: "video" | "audio" | "screen";
  track: RemoteTrack;
}

export function useStudioLiveKit(
  options: UseStudioLiveKitOptions
): UseStudioLiveKitReturn {
  const { studioId, userId, nickname, enabled = true } = options;

  const [remoteSources, setRemoteSources] = useState<RemoteSource[]>([]);
  const [publishedTracks, setPublishedTracks] = useState<LocalPublishedTrack[]>(
    []
  );

  // LiveKit Room 자동 연결
  useEffect(() => {
    if (!enabled || !studioId) return;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // 원격 트랙 구독 이벤트
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      // remoteSources에 추가
    });

    // 원격 트랙 구독 해제 이벤트
    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      // remoteSources에서 제거
    });

    // Room 연결
    const tokenResponse = await joinStream({
      studioId,
      participantName: nickname,
    });
    await room.connect(tokenResponse.livekitUrl, tokenResponse.token);
  }, [enabled, studioId, userId, nickname]);

  // 비디오/오디오/화면공유 트랙 publish 함수
  const publishVideoTrack = async (sourceId, deviceId) => {
    /* ... */
  };
  const publishAudioTrack = async (sourceId, deviceId) => {
    /* ... */
  };
  const publishScreenTrack = async (sourceId) => {
    /* ... */
  };
  const unpublishTrack = async (sourceId) => {
    /* ... */
  };

  // 원격 소스의 MediaStream 가져오기
  const getRemoteStream = (trackSid) => {
    /* ... */
  };

  return {
    isConnected,
    remoteSources,
    publishedTracks,
    publishVideoTrack,
    publishAudioTrack,
    publishScreenTrack,
    unpublishTrack,
    getRemoteStream,
  };
}
```

#### useStudioMain.ts - 원격 소스 병합

```typescript
// 원격 소스를 sources 상태에 병합
useEffect(() => {
  if (!remoteSources.length) return;

  setSources((prev) => {
    const localSources = prev.filter((s) => !s.isRemote);
    const newRemoteSources: Source[] = remoteSources.map((rs) => ({
      id: rs.id,
      type: rs.type,
      name: `${rs.participantName}의 ${
        rs.type === "video" ? "카메라" : "화면"
      }`,
      isVisible: true,
      isRemote: true,
      trackSid: rs.trackSid,
      participantId: rs.participantId,
      participantName: rs.participantName,
    }));
    return [...localSources, ...newRemoteSources];
  });

  // 원격 소스를 자동으로 스테이지에 추가
  setOnStageSourceIds((prev) => {
    const newIds = remoteSources
      .map((rs) => rs.id)
      .filter((id) => !prev.includes(id));
    return [...prev, ...newIds];
  });
}, [remoteSources]);
```

#### useStudioMain.ts - 소스 추가 시 publish

```typescript
const handleAddSourceConfirm = useCallback(
  async (type: "video" | "audio" | "screen", deviceId?: string) => {
    // ... 기존 로직 ...

    // LiveKit에 트랙 publish (다른 참가자와 미디어 공유)
    if (isLiveKitConnected) {
      if (type === "video") {
        await publishVideoTrack(id, resolvedDeviceId);
      } else if (type === "screen") {
        await publishScreenTrack(id);
      } else if (type === "audio") {
        await publishAudioTrack(id, resolvedDeviceId);
      }
    }
  },
  [
    ,
    /* ... */ isLiveKitConnected,
    publishVideoTrack,
    publishScreenTrack,
    publishAudioTrack,
  ]
);
```

#### useSourceStreams.ts - 원격 소스 지원

```typescript
export interface UseSourceStreamsOptions {
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  /** 원격 소스의 MediaStream을 가져오는 콜백 (LiveKit) */
  getRemoteStream?: (trackSid: string) => MediaStream | null;
}

// 원격 소스인 경우 getRemoteStream 사용
if (source.isRemote && source.trackSid && getRemoteStream) {
  const remoteStream = getRemoteStream(source.trackSid);
  if (remoteStream) {
    setStreamsMap((prev) => new Map(prev).set(id, remoteStream));
  }
  return;
}
```

#### schemas.ts - Source 스키마 확장

```typescript
export const SourceSchema = z.object({
  id: z.string(),
  type: SourceTypeSchema,
  name: z.string(),
  isVisible: z.boolean(),
  deviceId: z.string().optional(),
  fit: SourceFitSchema.optional(),
  /** LiveKit 트랙 SID (원격 소스인 경우) */
  trackSid: z.string().optional(),
  /** 원격 소스 여부 */
  isRemote: z.boolean().optional(),
  /** 원격 소스의 참가자 ID */
  participantId: z.string().optional(),
  /** 원격 소스의 참가자 이름 */
  participantName: z.string().optional(),
});
```

---

## 테스트 방법

### 1. 스튜디오 초대 수락 테스트

1. 사용자 A가 사용자 B를 스튜디오에 초대
2. 사용자 B가 알림에서 초대 수락
3. 확인 사항:
   - 알림이 사라짐
   - 워크스페이스 홈의 최근 스튜디오에 추가됨
   - Role이 표시됨

### 2. 온라인 멤버 표시 테스트

1. 두 개의 브라우저에서 같은 스튜디오 접속
2. 확인 사항:
   - 멤버 패널에서 접속 중인 멤버에 초록색 점 표시
   - "N명 접속 중" 카운트 표시
3. 한 브라우저 닫기
4. 확인 사항:
   - 다른 브라우저에서 해당 멤버의 초록색 점 사라짐

### 3. 실시간 미디어 공유 테스트

1. 두 개의 브라우저에서 같은 스튜디오 접속 (호스트 A, 게스트 B)
2. 호스트 A가 웹캠 소스 추가
3. 확인 사항:
   - 게스트 B의 화면에 호스트 A의 웹캠이 자동으로 추가됨
   - "A님의 카메라"라는 이름으로 표시
4. 게스트 B가 화면 공유 추가
5. 확인 사항:
   - 호스트 A의 화면에 게스트 B의 화면 공유가 자동으로 추가됨
6. 호스트 A가 웹캠 소스 제거
7. 확인 사항:
   - 게스트 B의 화면에서 해당 소스가 자동으로 제거됨

---

## 재시작 필요 서비스

오늘 변경 사항 적용을 위해 다음 서비스 재시작 필요:

1. **core-service** - 알림 삭제 기능
2. **media-service** - 온라인 멤버 추적 기능
