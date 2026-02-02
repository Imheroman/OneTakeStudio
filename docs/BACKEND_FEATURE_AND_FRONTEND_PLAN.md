# 백엔드 기능 파악 및 프론트엔드 연동 계획

## 작성일
2026-02-01

## 개요
백엔드(core-service, media-service)와 머지 후 제공되는 API를 정리하고, 프론트엔드에서 연동·구현할 항목을 정리한 문서입니다.

---

## 1. Core Service API 요약

### 1.1 인증 (Auth)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| POST | /api/auth/logout | 로그아웃 |
| POST | /api/auth/refresh | 토큰 갱신 |
| GET | /api/auth/check-email | 이메일 중복 확인 |
| POST | /api/auth/send-verification | 인증 메일 발송 |
| POST | /api/auth/verify-email | 이메일 인증 |
| POST | /api/auth/password-reset | 비밀번호 재설정 요청 |
| POST | /api/auth/password-reset/confirm | 비밀번호 재설정 확인 |
| POST | /api/auth/oauth/{google,kakao,naver} | OAuth 로그인 |
| POST | /api/auth/oauth/{provider}/callback | OAuth 콜백 |

**프론트 연동:** 로그인/회원가입은 이미 `/api/auth/register`, `/api/auth/login` 사용 중. OAuth 콜백 경로 일치 확인.

### 1.2 사용자 (Users)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/users/me | 내 프로필 |
| PUT | /api/users/me | 프로필 수정 |
| GET | /api/users/{userId} | 다른 사용자 프로필 |

### 1.3 스튜디오 (Studios)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/studios | 스튜디오 생성 |
| GET | /api/studios | 내 스튜디오 목록 |
| GET | /api/studios/{studioId} | 스튜디오 상세 |
| DELETE | /api/studios/{studioId} | 스튜디오 삭제 |
| GET | /api/studios/{studioId}/note | 스튜디오 노트 |
| PUT | /api/studios/{studioId}/note | 스튜디오 노트 수정 |
| GET/POST/DELETE | /api/studios/{studioId}/assets | 에셋 |
| GET/DELETE | /api/studios/{studioId}/invites | 초대 목록 |
| GET, POST /invite, POST /{memberId}/kick, DELETE /me | /api/studios/{studioId}/members | 멤버 |
| GET/POST/PUT/DELETE | /api/studios/{studioId}/scenes | 씬 |

### 1.4 워크스페이스 & 알림
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/workspace/{userId}/studios/recent | 최근 스튜디오 |
| GET | /api/workspace/dashboard | 대시보드 |
| GET | /api/notifications | 알림 목록 |

### 1.5 송출 채널 (Destinations)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/destinations | 목록 |
| POST | /api/destinations | 생성 |
| GET | /api/destinations/{id} | 상세 |
| PUT | /api/destinations/{id} | 수정 |
| DELETE | /api/destinations/{id} | 삭제 |

**프론트:** 채널 관리 화면은 이미 `/api/destinations` 사용 중.

### 1.6 즐겨찾기 (Favorites)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/favorites | 즐겨찾기 목록 |
| POST | /api/favorites | 즐겨찾기 요청 보내기 |
| DELETE | /api/favorites/{userId} | 즐겨찾기 삭제 (대상 사용자 ID) |
| GET | /api/favorites/search?q= | 사용자 검색 |
| GET | /api/favorites/requests | 받은 요청 목록 |
| POST | /api/favorites/requests/{requestId}/accept | 수락 |
| POST | /api/favorites/requests/{requestId}/decline | 거절 |

**주의:** DELETE 시 백엔드는 `userId`(즐겨찾기 대상 사용자 ID)를 사용. 프론트에서 삭제 시 전달하는 `id`가 사용자 ID인지 확인 필요.

### 1.7 초대 (Invites)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/invites/received | 받은 초대 목록 |
| POST | /api/invites/{inviteId}/accept | 수락 |
| POST | /api/invites/{inviteId}/reject | 거절 |

### 1.8 라이브러리 (Library) — Core
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/library/recordings | 녹화 목록 (page, size, studioId 선택) |
| GET | /api/library/recordings/{recordingId} | 녹화 상세 |
| POST | /api/library/recordings | 녹화 생성(등록) |
| PATCH | /api/library/recordings/{recordingId} | 녹화 수정 |
| DELETE | /api/library/recordings/{recordingId} | 녹화 삭제 |
| GET | /api/library/recordings/{recordingId}/download | 다운로드 URL |
| GET | /api/library/clips | 클립 목록 |
| GET | /api/library/storage | 저장 용량 (usedBytes, limitBytes 등) |

**응답 형식:** `ApiResponse<T>` → `{ resultCode, success, message, data }`.  
목록: `data.recordings`, `data.pagination` (page, size, totalElements, totalPages, hasNext, hasPrevious).  
Recording: recordingId, studioId, userId, title, description, thumbnailUrl, s3Url, fileSize, durationSeconds, status(RECORDING|PROCESSING|READY|DELETED|FAILED), createdAt, updatedAt.

**프론트 연동:**  
- 기존 프론트는 `/api/library/videos` 사용 → **백엔드는 `/api/library/recordings`** 이므로 경로 및 응답 매핑 필요.  
- Gateway에 `/api/library/**` 라우트 필요 (현재 없음).

---

## 2. Media Service API 요약

Gateway 재작성 경로:
- `/api/streams/**` → `/api/media/stream/**`
- `/api/recordings/**` → `/api/media/record/**`
- `/api/publish/**` → `/api/media/publish/**`
- `/api/media/chat/**` → 그대로 media-service

### 2.1 스트림 (Stream)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/media/stream/join | 스트림 참가(토큰 발급) |
| POST | /api/media/stream/{studioId}/leave | 퇴장 |
| POST | /api/media/stream/{studioId}/end | 스트림 종료 |
| GET | /api/media/stream/{studioId}/session | 세션 조회 |
| GET | /api/media/stream/{studioId}/history | 히스토리 |
| GET | /api/media/ice-servers | ICE 서버 |

### 2.2 녹화 (Record) — Media
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/media/record/start | 녹화 시작 |
| POST | /api/media/record/{studioId}/stop | 녹화 중지 |
| POST | /api/media/record/{studioId}/pause | 일시정지 |
| POST | /api/media/record/{studioId}/resume | 재개 |
| GET | /api/media/record/{recordingId} | 녹화 정보 |
| GET | /api/media/record/studio/{studioId}/active | 활성 녹화 |
| GET | /api/media/record/studio/{studioId} | 스튜디오 녹화 목록 |

### 2.3 송출 (Publish)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/media/publish | 송출 시작 |
| POST | /api/media/publish/stop | 송출 중지 |
| GET | /api/media/publish/status | 송출 상태 |

### 2.4 채팅 (Chat)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/media/chat | 메시지 전송 |
| GET | /api/media/chat/{studioId} | 채팅 목록 등 |
| GET | /api/media/chat/{studioId}/platform/{platform} | 플랫폼별 |
| GET | /api/media/chat/{studioId}/recent | 최근 메시지 |
| GET | /api/media/chat/{studioId}/highlighted | 하이라이트 |
| POST | /api/media/chat/{messageId}/highlight | 하이라이트 |
| DELETE | /api/media/chat/{messageId} | 메시지 삭제 |
| GET | /api/media/chat/{studioId}/stats | 통계 |

### 2.5 채팅 연동 (Integration)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/media/chat/integration/{studioId}/youtube/start | YouTube 연동 시작 |
| POST | /api/media/chat/integration/{studioId}/twitch/start | Twitch |
| POST | /api/media/chat/integration/{studioId}/chzzk/start | 치지직 |
| POST | /api/media/chat/integration/{studioId}/{platform}/stop | 플랫폼별 중지 |
| POST | /api/media/chat/integration/{studioId}/stop-all | 전체 중지 |
| GET | /api/media/chat/integration/{studioId}/status | 연동 상태 |

### 2.6 미디어 설정, 화면 공유, 뷰어 등
- /api/media/settings, /api/media/screen-share, /api/media/viewer, /api/media/ingress, Webhook 등 (문서화는 필요 시 추가).

---

## 3. API Gateway 라우트 현황

- **Core:** `/api/auth/**`, `/api/users/**`, `/api/studios/**`, `/api/workspace/**`, `/api/notifications/**`, `/api/destinations/**`, `/api/dashboard`, `/api/favorites/**`  
- **누락:** `/api/library/**`, `/api/invites/**` → **추가 필요.**

---

## 4. 프론트엔드 연동 작업 목록

### 4.1 완료/기존 연동
- 로그인, 회원가입(register), OAuth 콜백
- 워크스페이스 최근 스튜디오, 알림, 즐겨찾기 요청 수락/거절
- 스튜디오 CRUD, 노트, 멤버, 에셋, 씬
- 송출 채널(destinations)
- 스트림 join/leave, 녹화 start/stop, 송출 start/stop/status, 채팅/연동

### 4.2 구현 필요
1. **API Gateway**  
   - Core Service에 `/api/library/**`, `/api/invites/**` 추가.

2. **라이브러리(비디오) 페이지**  
   - 호출: `GET /api/library/recordings?page=0&size=20` (및 선택 시 `studioId`).  
   - 응답: `ApiResponse<RecordingListResponse>` → `data.recordings`, `data.pagination`.  
   - 매핑: Recording → Video (recordingId→id, title, date from createdAt, duration from durationSeconds, status 매핑, thumbnailUrl, type 기본값 등).  
   - 프론트 스키마: `ApiResponse` + `RecordingListResponse` 형태로 파싱 후 `videos`로 변환.

3. **스토리지 페이지**  
   - 호출: `GET /api/library/storage` (Gateway 라우트 추가 후).  
   - 응답: `ApiResponse<StorageResponse>` → usedBytes, limitBytes, usedPercentage, usedFormatted, limitFormatted.  
   - 매핑: StorageData { used: usedBytes, total: limitBytes, available 등 }.  
   - `/api/storage/files`는 백엔드 없음 → 최근 파일은 빈 배열 또는 library/recordings 일부로 대체.

4. **즐겨찾기 삭제**  
   - 백엔드: `DELETE /api/favorites/{userId}`.  
   - 프론트에서 삭제 시 사용하는 `id`가 대상 사용자 ID인지 확인 후, 필요 시 목록/스키마를 userId 기준으로 맞추기.

5. **비디오 상세/다운로드/클립**  
   - 상세: `GET /api/library/recordings/{recordingId}` → 기존 비디오 상세 스키마와 매핑.  
   - 다운로드: `GET /api/library/recordings/{recordingId}/download` (URL 응답 사용).  
   - 클립 생성 등: 백엔드 `/api/library/clips` 스펙 확인 후 연동.

---

## 5. 참고 문서

- `docs/CORE_SERVICE_API.md` — 인증/사용자 API 상세
- `docs/workspace-api-integration.md` — 워크스페이스/알림/경로 통일
- `docs/2026-01-31/todo-next.md` — WebSocket 송출 이벤트, 딜레이, UI 개선 등
