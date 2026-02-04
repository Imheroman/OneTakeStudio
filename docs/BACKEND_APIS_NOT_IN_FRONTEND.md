# 프론트에서 구현되지 않은 백엔드 API

백엔드(core-service, media-service)에는 있으나 **프론트엔드에서 호출하지 않는** API 목록입니다.  
(경로는 백엔드 컨트롤러 기준)

---

## Core Service

### Auth (`/api/auth`)
| Method | 경로 | 비고 |
|--------|------|------|
| POST | `/api/auth/logout` | 로그아웃 시 프론트는 store만 비우고 백엔드 호출 없음 |
| POST | `/api/auth/refresh` | 401 시 refresh 대신 로그아웃 후 로그인 페이지로 이동 |
| GET | `/api/auth/check-email` | 이메일 중복/가입 여부 확인 |
| POST | `/api/auth/password-reset` | 비밀번호 재설정 요청 (forgot-password 페이지에서 주석 처리) |
| POST | `/api/auth/password-reset/confirm` | 비밀번호 재설정 확인 |

### User (`/api/users`)
| Method | 경로 | 비고 |
|--------|------|------|
| GET | `/api/users/{userId}` | 다른 사용자 프로필 조회 |

### Studio (`/api/studios`)
| Method | 경로 | 비고 |
|--------|------|------|
| GET | `/api/studios` | 스튜디오 목록 조회 (프론트는 워크스페이스 recent만 사용) |
| PATCH | `/api/studios/{studioId}` | 스튜디오 정보 수정 |
| DELETE | `/api/studios/{studioId}` | 스튜디오 삭제 |

### Studio Member (`/api/studios/{studioId}/members`)
| Method | 경로 | 비고 |
|--------|------|------|
| DELETE | `.../members/me` | 스튜디오 나가기 |

### Scenes (`/api/studios/{studioId}/scenes`)
| Method | 경로 | 비고 |
|--------|------|------|
| GET | `.../scenes` | 씬 목록만 단독 조회 (스튜디오 상세에 포함되어 있을 수 있음) |

### Destination (`/api/destinations`)
| Method | 경로 | 비고 |
|--------|------|------|
| PUT | `/api/destinations/{destinationId}` | 채널(목적지) 정보 수정 (프론트는 생성/삭제만 사용) |

### Storage (`/api/storage`) — Core 전용
| Method | 경로 | 비고 |
|--------|------|------|
| GET | `/api/storage` | 스토리지 용량/정보 (프론트는 `/api/library/storage` 사용) |
| GET | `/api/storage/files` | 스토리지 파일 목록 |

### Library (`/api/library`)
| Method | 경로 | 비고 |
|--------|------|------|
| POST | `/api/library/recordings` | 녹화 메타데이터 생성 |
| PATCH | `/api/library/recordings/{recordingId}` | 녹화 정보 수정(제목 등) |
| DELETE | `/api/library/recordings/{recordingId}` | 녹화 삭제 |
| GET | `/api/library/clips` | 클립 목록 조회 (프론트는 클립 생성만 호출) |

### Notification (`/api/notifications`)
| Method | 경로 | 비고 |
|--------|------|------|
| PATCH | `/api/notifications/{notificationId}/read` | 알림 읽음 처리 |

---

## Media Service

### Chat Integration (`/api/media/chat/integration`)
| Method | 경로 | 비고 |
|--------|------|------|
| GET | `.../{studioId}/status` | 채팅 연동 상태 조회 |

### Ingress (`/api/media/ingress`)
| Method | 경로 | 비고 |
|--------|------|------|
| POST | `.../rtmp` | RTMP 인그레스 생성 (OBS 등 외부 툴용) |
| POST | `.../whip` | WHIP 인그레스 |
| GET | (ingress 목록) | |
| DELETE | `.../{ingressId}` | 인그레스 삭제 |

### Recording — Media (`/api/media/record`)
| Method | 경로 | 비고 |
|--------|------|------|
| GET | `.../files/{fileName}` | 녹화 파일 직접 조회 (프론트는 Core library/recordings 사용) |

### Screen Share (`/api/media/screen-share`)
| Method | 경로 | 비고 |
|--------|------|------|
| POST | `.../start` | 화면 공유 시작 |
| POST | `.../stop` | 화면 공유 중지 |
| GET | `.../active` | 활성 화면 공유 상태 |

### Viewer (`/api/media/viewer`)
| Method | 경로 | 비고 |
|--------|------|------|
| GET | `.../{studioId}/current` | 현재 시청자 |
| GET | `.../{studioId}/aggregated` | 집계 |
| GET | `.../{studioId}/platform/{platform}` | 플랫폼별 |
| GET | `.../{studioId}/total` | 총 시청자 |
| GET | `.../{studioId}/stats` | 통계 |

### Settings — Media (`/api/media/settings`)
| Method | 경로 | 비고 |
|--------|------|------|
| GET | `...` | 미디어 설정 조회 |
| PUT | `...` | 미디어 설정 수정 |
| POST | `.../session/{studioId}/init` | 세션 초기화 |
| GET | `.../session/{studioId}` | 세션 조회 |
| PUT | `.../session` | 세션 수정 |
| POST | `.../session/{studioId}/video/toggle` | 비디오 토글 |
| POST | `.../session/{studioId}/audio/toggle` | 오디오 토글 |
| POST | `.../session/{studioId}/mute/toggle` | 뮤트 토글 |
| GET | `.../session/{studioId}/participants` | 참가자 목록 |
| DELETE | `.../session/{studioId}` | 세션 삭제 |

### 기타 Media (내부/웹훅)
- `POST /api/media/studio/{studioId}/broadcast`, `.../lock/broadcast`, `.../presence/broadcast` — 스튜디오 상태 브로드캐스트
- `POST /api/internal/studio/{studioId}/lock/acquired`, `.../released` — 내부용 락
- `POST /api/media/webhook/livekit` — LiveKit 웹훅

---

## 요약

| 구분 | 미구현 API 수(대략) | 우선 연동 추천 예시 |
|------|---------------------|----------------------|
| Core | 약 20개 이상 | `auth/refresh`, `auth/logout`, `notifications/{id}/read`, library 녹화 PATCH/DELETE, 스튜디오 삭제/수정, 스튜디오 나가기 |
| Media | 약 25개 이상 | 채팅 연동 status, 화면 공유, 뷰어 통계, 세션/설정 관련 (필요 시) |

프론트에서 **우선 구현**을 고려할 만한 것:
1. **POST /api/auth/refresh** — 401 시 로그아웃 대신 토큰 갱신
2. **POST /api/auth/logout** — 서버 쪽 토큰/세션 무효화
3. **PATCH /api/notifications/{id}/read** — 알림 읽음 처리
4. **DELETE /api/library/recordings/{id}**, **PATCH /api/library/recordings/{id}** — 라이브러리에서 녹화 수정·삭제
5. **DELETE /api/studios/{studioId}/members/me** — 스튜디오 나가기
6. **GET /api/media/chat/integration/{studioId}/status** — 채팅 연동 상태 표시
