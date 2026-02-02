#git 스튜디오 기능 점진 구현 계획

백엔드 구현 상태를 기준으로, 필요한 기능을 단계별로 구현하고 중간 커밋 포인트를 둡니다.

---

## 백엔드 구현 현황

### Core Service (스튜디오/씬)
- **Studio**: CRUD, 상세 조회 시 `scenes` 포함
- **Scene**: `GET/POST/PUT/DELETE` `/api/studios/{studioId}/scenes`
  - `SceneResponse`: sceneId(Long), name, thumbnail, isActive, sortOrder, layout(SceneLayoutDto), createdAt
  - `CreateSceneRequest`: name, layout(optional)
  - `UpdateSceneRequest`: name, layout, sortOrder(optional)
- **소스**: 백엔드에 Source 엔티티 없음. 씬의 `layout`(JSON: type + elements)에 소스 구성을 저장 가능

### Media Service (스트림/녹화/송출)
- **Stream**: `POST /api/v1/media/stream/join`(토큰), leave, end, session, history, ice-servers
- **Recording**: `POST /api/v1/media/record/start`, `/{studioId}/stop`, pause, resume, 목록/상세
- **Publish**: `POST /api/v1/media/publish`, stop, status

### API Gateway
- `/api/studios/**` → core-service
- `/api/v1/media/**` → media-service (JWT에서 `X-User-Id` 추가)

---

## Phase 1: 씬 CRUD 및 씬 전환 (커밋 1) ✅

**목표**: 스튜디오 진입 시 백엔드 씬 목록 표시, 씬 추가/삭제/선택(전환).

- [x] 프론트: Scene 응답/요청 스키마 정리 (sceneId ↔ id 문자열 매핑)
- [x] useStudioMain: 씬 목록 = `studio.scenes` (이미 포함), `handleAddScene` → POST 씬 생성 후 목록 갱신
- [x] useStudioMain: `handleRemoveScene` → DELETE 씬 후 목록 갱신
- [x] useStudioMain: `handleSceneSelect` → 로컬 state만 (activeSceneId), 필요 시 추후 백엔드 isActive 연동
- [x] ScenesPanel: 기존 UI 유지, 씬 id는 `String(sceneId)` 사용

**커밋 메시지 제안**:  
`feat(studio): 씬 CRUD API 연동 및 씬 전환`

---

## Phase 2: 소스 등록 및 씬별 반영 (커밋 2) ✅

**목표**: 웹캠/마이크 등 소스 추가, ON/OFF, 선택한 씬의 layout에 소스 구성 저장.

- [x] 소스 추가: “Add Source” → 디바이스 선택(비디오/오디오) → getUserMedia로 소스 목록에 추가
- [x] 소스 ON/OFF: 기존 `handleSourceToggle` 유지, 프리뷰 반영
- [x] 씬 전환 시: 해당 씬의 `layout.elements`를 소스 목록과 매핑 (id, type, visible 등)
- [x] 씬 수정 시: 현재 active 씬의 layout을 현재 소스 구성으로 PUT 업데이트

**커밋 메시지 제안**:  
`feat(studio): 소스 추가(웹캠/마이크) 및 씬별 레이아웃 저장`

---

## Phase 3: 오디오 레벨 시각화 (커밋 3) ✅

**목표**: 마이크 입력 레벨을 시각적으로 표시(레벨 미터).

- [x] Web Audio API: getUserMedia(audio) → AudioContext → AnalyserNode → 주기적 레벨 샘플
- [x] ControlBar 마이크 버튼 옆에 세로 레벨 미터(막대) 표시
- [x] 백엔드 없음, 프론트 전용 (useAudioLevel 훅)

**커밋 메시지 제안**:  
`feat(studio): 마이크 오디오 레벨 시각화`

---

## Phase 4: 녹화 (로컬 / 클라우드) (커밋 4) ✅

**목표**: 로컬 녹화(MediaRecorder + 캔버스/스트림)와 클라우드 녹화(media-service API) 연동.

- [x] **로컬 녹화**: 프리뷰 캔버스 또는 합성 스트림을 `captureStream()` / MediaRecorder로 녹화, 파일 다운로드
- [x] **클라우드 녹화**: `POST /api/recordings/start` (studioId, outputFormat, quality 등), 중지 시 `POST /api/recordings/{studioId}/stop`
- [x] ControlBar 또는 전용 영역: “녹화” 버튼 → 로컬/클라우드 선택 후 시작/중지

**커밋 메시지 제안**:  
`feat(studio): 로컬/클라우드 녹화 연동`

---

## 이후 검토 (Phase 5+)

- **Go Live**: media-service Publish/Stream API와 연동 (토큰 발급, 송출 시작/중지)
- **씬 활성 상태 저장**: 백엔드에 “현재 활성 씬” 저장 API 있으면 연동, 없으면 프론트만 유지

---

## 진행 순서 요약

| 단계   | 내용                     | 커밋 포인트                    |
|--------|--------------------------|---------------------------------|
| Phase 1 | 씬 CRUD, 씬 전환         | `feat(studio): 씬 CRUD API 연동 및 씬 전환` |
| Phase 2 | 소스 등록, 씬별 layout   | `feat(studio): 소스 추가 및 씬별 레이아웃 저장` |
| Phase 3 | 오디오 레벨 시각화       | `feat(studio): 마이크 오디오 레벨 시각화` |
| Phase 4 | 로컬/클라우드 녹화       | `feat(studio): 로컬/클라우드 녹화 연동` |
