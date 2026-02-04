# StreamService 댓글 카운터 연동

## 기능 개요

StreamService에 CommentCounterService를 연동하여 녹화 없이 스트리밍만 할 때도 실시간 댓글 집계가 가능하도록 구현했습니다.

## 동작 방식

### 1. 스트림 활성화 시 (`activateSession`)
- 참가자가 룸에 참여하면 `activateSession()` 메서드가 호출됨
- 세션 활성화와 동시에 `commentCounterService.startCounting(studioId)` 호출
- 해당 스튜디오의 댓글 집계 시작

### 2. 스트림 종료 시 (`endStream`)
- 스트림 종료 시 `commentCounterService.stopCounting(studioId)` 호출
- 저장 없이 카운터만 중지 (녹화 중인 경우 RecordingService에서 별도 저장)

## 구현 상세

### 의존성 주입
```java
private final CommentCounterService commentCounterService;
```

### activateSession 메서드
```java
@Transactional
public void activateSession(String roomName, String participantIdentity) {
    streamSessionRepository.findByRoomName(roomName)
            .ifPresent(session -> {
                if (session.getParticipantIdentity().equals(participantIdentity)) {
                    session.activate();

                    // 댓글 카운터 시작
                    commentCounterService.startCounting(session.getStudioId());

                    log.info("Stream session activated: roomName={}, participant={}",
                            roomName, participantIdentity);
                }
            });
}
```

### endStream 메서드
```java
@Transactional
public void endStream(Long studioId) {
    streamSessionRepository.findByStudioIdAndStatus(studioId, SessionStatus.ACTIVE)
            .ifPresent(session -> {
                session.close();
                liveKitService.deleteRoom(session.getRoomName());

                // 댓글 카운터 중지 (저장 없이)
                commentCounterService.stopCounting(studioId);

                log.info("Stream ended for studio {}", studioId);
            });
}
```

## 사용 흐름

1. **스트리밍만 하는 경우**
   - joinStream → activateSession (카운터 시작) → 댓글 수신 → endStream (카운터 중지)
   - 댓글 통계는 저장되지 않음

2. **녹화와 함께 스트리밍하는 경우**
   - joinStream → activateSession (카운터 시작) → startRecording → 댓글 수신
   - → stopRecording (RecordingService에서 saveAndStopCounting 호출)
   - 댓글 통계가 recording_id와 연결되어 저장됨

## 에러 처리

- CommentCounterService는 카운터가 없는 상태에서 `incrementCount()` 호출 시 자동으로 카운터를 시작하는 안전장치가 있음
- `stopCounting()`은 카운터가 없어도 예외 없이 안전하게 처리됨
