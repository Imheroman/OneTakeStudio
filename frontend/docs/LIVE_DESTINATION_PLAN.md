# 라이브 송출·데스티네이션(채널) 연동 계획

백엔드는 팀원이 만든 코드를 **최소·보수적으로** 유지하고, **프론트만 수정**하여 버튼을 실제 기능과 연결합니다.  
**데스티네이션(채널) 기능을 먼저** 완성한 뒤, 라이브 송출을 연결하는 순서로 진행합니다.

---

## 원칙

- **백엔드**: 기존 API 스펙·경로 유지, 필요한 경우에만 최소 수정
- **프론트**: 백엔드 응답 형식에 맞춰 파싱·매핑, 버튼 → 실제 API 호출 연결
- **단계별**: 한 단계마다 테스트·커밋하기 좋게 끊어서 진행

---

## 현재 상태 요약

| 구분 | 백엔드 | 프론트 |
|------|--------|--------|
| **채널 목록** | Core: `GET /api/destinations` → `ApiResponse.success(..., data: DestinationResponse[])` | `GET /api/destinations` 호출, 응답을 `{ channels, total }` 형태로 기대 → **형식 불일치** |
| **채널 연결** | Core: `POST /api/destinations` (수동 등록), OAuth 경로는 별도 확인 필요 | `POST /api/channels/connect` 호출 → **게이트웨이에 `/api/channels/**` 없음** |
| **채널 해제** | Core: `DELETE /api/destinations/{destinationId}` (UUID) | `DELETE /api/destinations/${id}` → **id가 destinationId(UUID)이면 호환** |
| **라이브 송출** | Media: `POST /api/media/publish` (studioId, destinationIds) | `handleGoLive`는 로컬 상태만 변경, **API 미연동** |

---

## 단계별 계획

### 1단계: 채널 목록 API 연동 (프론트만)

- **목표**: 채널 관리 페이지에서 실제 Core `GET /api/destinations` 응답을 사용해 목록 표시
- **방법**: 백엔드 응답 `{ success, message, data: DestinationResponse[] }` 를 파싱하고, `data`를 프론트 `Channel` 타입으로 매핑
- **수정 범위**: 프론트만 (백엔드 수정 없음)
- **테스트**: 채널 페이지 접속 → 목록 로드·표시 확인 후 커밋

### 2단계: 채널 연결·해제 경로 및 동작 확인 ✅

- **목표**: 채널 추가/연결, 해제가 실제 API와 일치하도록 정리
- **확인 사항**  
  - 채널 “연결”이 OAuth인지, 수동 RTMP 입력인지에 따라  
    - OAuth: Core/게이트웨이에 `/api/channels/**` 또는 `/api/destinations/oauth/**` 등 실제 경로 확인 후 프론트 URL만 수정  
    - 수동: `POST /api/destinations` (CreateDestinationRequest) 사용하도록 프론트 연결  
  - 해제: `DELETE /api/destinations/{destinationId}` 에 `destinationId`(UUID) 전달하는지 확인
- **수정 범위**: 경로/페이로드만 맞추기 (가능하면 프론트만)
- **테스트**: 채널 추가·해제 한 번씩 수행 후 커밋

### 3단계: Go Live 버튼 → 송출 API 연동 ✅

- **목표**: 스튜디오 헤더의 “Go Live” 버튼 클릭 시 Media 송출 API 호출
- **방법**  
  1. 사용자 연동 채널 목록 조회 (1단계에서 사용하는 목록 API 또는 동일 스펙)  
  2. YouTube 등 송출 대상 destination id 목록 선택 (우선은 “첫 번째 YouTube” 등 단순 규칙 가능)  
  3. `POST /api/media/publish` (또는 게이트웨이 경로) 로 `studioId`, `destinationIds` 전달  
  4. 응답·에러 처리 후 `isLive` 상태 반영
- **수정 범위**: 프론트 (useStudioMain 또는 송출 전용 훅/API 함수), 필요 시 게이트웨이 경로만 확인
- **테스트**: 스튜디오 진입 → Go Live 클릭 → 요청 전송·상태 변경 확인 후 커밋

### 4단계 (선택): 송출 중지·상태 표시

- **목표**: “Live” 상태에서 송출 중지 버튼, 또는 송출 상태 조회
- **방법**: Media `POST /api/media/publish/stop`, `GET /api/media/publish/status` 등 기존 API에 맞춰 프론트에서 호출
- **테스트**: 송출 시작 → 중지/상태 확인 후 커밋

---

## API 경로 정리 (참고)

- **Core (게이트웨이)**  
  - `GET /api/destinations` → 연동 채널 목록  
  - `POST /api/destinations` → 채널 수동 등록  
  - `DELETE /api/destinations/{destinationId}` → 채널 해제  
- **Media (게이트웨이)**  
  - `Path=/api/v1/media/publish,**` → RewritePath `/api/v1/media/publish(?<segment>.*)` → `/api/media/publish${segment}` (media-service-publish-v1 라우트, media-service보다 먼저 매칭)  
  - Media 서비스: `@RequestMapping("/api/media/publish")`  
  - 프론트: `POST /api/v1/media/publish`, `POST /api/v1/media/publish/stop`, `GET /api/v1/media/publish/status` 호출  
  - StreamYard 스타일: Go Live 클릭 시 "어느 채널로 송출할까요?" 모달 → 채널 선택 후 Go Live

---

## 커밋 제안

- **1단계 완료**: `fix(channels): GET /api/destinations 응답 형식 맞춤 (ApiResponse.data → Channel[] 매핑)`  
- **2단계 완료**: `fix(channels): 채널 연결/해제 API 경로 및 페이로드 정리`  
- **3단계 완료**: `feat(studio): Go Live 버튼 → 송출 API 연동`  
- **4단계 완료**: `feat(studio): 송출 중지·상태 표시`

이 순서대로 진행하면 데스티네이션을 먼저 안정화한 뒤 라이브를 붙일 수 있고, 단계마다 끊어서 테스트·커밋하기 좋습니다.
