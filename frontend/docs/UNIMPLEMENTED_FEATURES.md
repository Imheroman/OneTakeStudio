# 미구현 기능 목록

> 현재 프론트엔드/백엔드 기준으로 구현되지 않은 기능을 정리합니다.  
> (송출·녹화·저장 관련)

---

## 1. 송출 + 클라우드 저장 동시 진행

| 항목 | 상태 | 설명 |
|------|------|------|
| Go Live 시 클라우드 저장 | ❌ 미구현 | RTMP 송출과 녹화(파일 저장)가 **별도 egress**로 동작함. 동시에 처리하는 로직 없음. |
| 백엔드 | - | `LiveKitEgressService`에 `startRtmpStream`(RTMP 전용), `startRoomCompositeRecording`(파일 전용)만 존재. 하나의 egress로 파일+RTMP 동시 출력하는 API 없음. |
| 프론트 | - | Go Live 시 “동시에 클라우드 저장” 옵션 없음. |

**구현 시 필요 작업**
- LiveKit egress에서 파일 출력 + RTMP 출력을 한 번에 요청하는 API 추가
- 프론트: Go Live 확인 모달에 “클라우드 저장 함께 하기” 체크박스 등 추가

---

## 2. 클라우드 저장 (녹화 → S3 등)

| 항목 | 상태 | 설명 |
|------|------|------|
| 녹화 결과 클라우드 저장 | ❌ 미구현 | 녹화는 egress가 **로컬 경로**(`/recordings`)에만 저장함. |
| S3 업로드 | ❌ 미구현 | `S3Config`는 존재하나, 녹화 완료 후 S3 업로드 로직 미구현. |
| egress → S3 직접 출력 | ❌ 미구현 | LiveKit egress의 S3 출력 옵션 설정 없음. |

**구현 시 필요 작업**
- egress 설정에서 S3 출력 추가 또는, 녹화 완료 웹훅 후 S3 업로드 파이프라인 구현
- media-service `RecordingService` / 웹훅 핸들러에 S3 업로드 연동

---

## 3. 스튜디오 생성 시 저장 위치(cloud vs local)

| 항목 | 상태 | 설명 |
|------|------|------|
| CreateStudioDialog 저장 위치 | ⚠️ UI만 존재 | “저장된 영상” 타입 선택 시 Cloud/Local 라디오 있으나, 백엔드에 이 값이 전달·반영되는지 불명확. |
| 저장 위치별 동작 차이 | ❓ 확인 필요 | 저장 위치에 따른 실제 동작 차이가 있는지 백엔드 스키마·로직 확인 필요. |

---

## 4. 녹화 결과 활용

| 항목 | 상태 | 설명 |
|------|------|------|
| 녹화 완료 후 파일 URL | ⚠️ 부분 구현 | `RecordingStoppedEvent`로 `fileUrl` 전달. core-service 연동 시 라이브러리 자동 등록 여부 확인 필요. |
| 녹화 목록에서 다운로드/재생 | ⚠️ 확인 필요 | `StudioRecordingPanel`에서 목록은 표시하나, 파일 URL로 다운로드/재생 버튼 연동 여부 확인 필요. |

---

## 5. 기타

| 항목 | 상태 | 설명 |
|------|------|------|
| 녹화 일시정지/재개 | ⚠️ 제한적 | API는 존재하나, LiveKit egress는 pause/resume을 직접 지원하지 않음. 상태만 관리. |
| YouTube 외 플랫폼 송출 | ⚠️ YouTube만 | `PublishService`에서 platform `youtube`만 필터링. Twitch, 치지직 등 추가 시 백엔드 확장 필요. |

---

## 참고: API 경로

- 녹화: `POST /api/recordings/start`, `POST /api/recordings/{studioId}/stop` (Gateway → media-service)
- 송출: `POST /api/publish` (또는 media-service publish API)
- 스튜디오: `POST /api/studios` (core-service)
