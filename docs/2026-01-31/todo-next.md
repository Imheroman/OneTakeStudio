# 다음에 이어서 할 작업

## 우선순위 높음

### 1. 프론트엔드 WebSocket 연동
백엔드에서 WebSocket 이벤트 발행은 완료됨. 프론트엔드에서 구독 필요.

**구현 내용:**
```typescript
// usePublishEvents.ts
import { useEffect } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export const usePublishEvents = (studioId: number, onEvent: (event: PublishEvent) => void) => {
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8082/ws/media'),
      onConnect: () => {
        client.subscribe(`/topic/studio/${studioId}/publish`, (message) => {
          const event = JSON.parse(message.body);
          onEvent(event);
        });
      },
    });
    client.activate();
    return () => client.deactivate();
  }, [studioId]);
};

// 사용 예시
usePublishEvents(studioId, (event) => {
  switch (event.type) {
    case 'PUBLISH_ENDED_EXTERNALLY':
      toast.warning(event.message); // "스트림이 외부에서 종료되었습니다"
      setIsLive(false);
      break;
    case 'PUBLISH_FAILED':
      toast.error(`송출 실패: ${event.message}`);
      setIsLive(false);
      break;
  }
});
```

**이벤트 타입:**
- `PUBLISH_STARTED`: 송출 시작
- `PUBLISH_STOPPED`: 정상 종료
- `PUBLISH_FAILED`: 에러 발생
- `PUBLISH_ENDED_EXTERNALLY`: 외부 종료

---

### 2. 딜레이 최적화 테스트
현재 Room Composite 방식은 20-40초 딜레이 발생.

**테스트 항목:**
- [ ] YouTube Studio에서 "초저지연" 설정 후 테스트
- [ ] 720p (MEDIUM) 설정으로 딜레이 감소 확인
- [ ] 480p (LOW) 설정으로 최소 딜레이 확인

**향후 개선 방안 (필요시):**
- Track Composite 방식으로 변경
- 프론트엔드 직접 RTMP 송출 (브라우저 → RTMP 변환)

---

### 3. 송출 상태 UI 개선
프론트엔드에서 송출 상태 표시 개선 필요.

**구현 항목:**
- [ ] 라이브 상태 뱃지 (빨간색 "LIVE")
- [ ] 송출 시간 표시 (00:00:00)
- [ ] YouTube 스트림 상태 표시 (연결됨/연결 끊김)
- [ ] 송출 종료 시 확인 다이얼로그

---

## 우선순위 중간

### 4. 비디오 품질 설정 UI 연동
백엔드에서 VideoQuality 적용은 완료됨. 프론트엔드 설정 UI 확인 필요.

**확인 항목:**
- [ ] 스튜디오 설정에서 비디오 품질 변경 가능한지
- [ ] 변경된 설정이 API로 저장되는지
- [ ] 송출 시 설정이 적용되는지

---

### 5. 에러 핸들링 개선
**구현 항목:**
- [ ] 송출 실패 시 상세 에러 메시지 표시
- [ ] 재시도 버튼 제공
- [ ] 네트워크 오류 시 자동 재연결

---

## 우선순위 낮음

### 6. 멀티 플랫폼 송출
현재 YouTube만 지원. Twitch, 치지직 추가 필요.

**확인 항목:**
- [ ] Twitch RTMP URL/Stream Key 형식 확인
- [ ] 치지직 RTMP URL/Stream Key 형식 확인
- [ ] 플랫폼별 비트레이트 제한 확인

---

### 7. 녹화 기능 테스트
Egress 녹화 기능 테스트 필요.

**테스트 항목:**
- [ ] 녹화 시작/중지
- [ ] 녹화 파일 저장 확인
- [ ] 녹화 파일 다운로드

---

## 참고 사항

### WebSocket 엔드포인트
```
ws://localhost:8082/ws/media (SockJS)
```

### 토픽 구조
```
/topic/studio/{studioId}/publish  - 송출 이벤트
/topic/studio/{studioId}/chat     - 채팅 (기존)
```

### 이벤트 데이터 형식
```json
{
  "type": "PUBLISH_ENDED_EXTERNALLY",
  "studioId": 1,
  "publishSessionId": "uuid-xxxx",
  "message": "스트림이 외부에서 종료되었습니다",
  "timestamp": "2026-01-31T00:30:00"
}
```
