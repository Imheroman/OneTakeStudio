# OneTakeStudio 기능명세서

> **상세 기능명세서**: `assets/기능명세서_C206.pdf` 참조

## 도메인 개요

| 도메인 ID | 기능 그룹 | 목적 | MSA 서비스 |
|-----------|-----------|------|------------|
| **C** (Common) | 공통 기능 | 세션 상태, GNB, 알림 | Core + Media |
| **A** (Auth) | 인증 및 계정 생성 | 서비스 진입 권한 확인 | **Core Service** |
| **W** (Workspace) | 방송국 환경 및 자산 관리 | 사용자 직속 방송 데이터 관리 | **Core Service** |
| **S** (Studio) | 방송 송출 실무 | 실시간 액션 수행 | Core + **Media Service** |
| **L** (Library) | 녹화 및 클립 관리 | 영상 편집, AI 쇼츠 생성 | **Media Service** + AI |

---

## 기능 ID 매핑 (MSA 서비스별)

### Core Service (코어 서비스)

#### Common (C)
- **C01**: 세션 상태 감지
- **C02**: 글로벌 내비게이션 (GNB)
- **C03**: 통합 알림 센터

#### Auth (A)
- **A01**: 아이디/비밀번호 로그인
- **A03**: 로그인 인증 처리 (JWT 토큰 발급)
- **A05**: 간편 회원가입 (아이디/비밀번호/닉네임만 입력)
  - ❌ 이메일 입력 불필요
  - ❌ 이메일 인증 없음
  - ❌ 소셜 로그인 없음 (Google, Kakao, Naver 제외)
  - ❌ 비밀번호 찾기/재설정 없음

#### Workspace (W)
- **W01**: 대시보드 자동 진입
- **W02**: 파트너 즐겨찾기
- **W03**: 프로필 이미지 관리
- **W04**: 기본 정보 수정
- **W05**: 변경 사항 저장/알림
- **W06**: 네비게이션 상태 표시
- **W12**: 연동 채널 리스트 조회
- **W13**: 신규 송출 채널 추가
- **W14**: 연동 계정 관리 및 해제
- **W15**: 스튜디오 신규 생성
- **W16**: 최근 스튜디오 리스트 조회

#### Studio (S) - 메타데이터
- **S01**: 송출 타입 선택 및 모드 분기
- **S02**: 라이브 스트리밍 상세 설정
- **S03**: 녹화 프로젝트 상세 설정
- **S18**: 파트너 초대 및 권한 제어
- **S19**: 파트너 초대 및 세션 공유
- **S20**: 백스테이지 권한 및 모니터링

---

### Media Service (미디어 서비스)

#### Workspace (W) - 스토리지
- **W07**: 스토리지 현황 시각화
- **W08**: 자동 삭제 정책 및 알림
- **W09**: 파일 관리 및 삭제
- **W10**: 파일 필터링 및 검색
- **W11**: 파일 타입별 아이콘 매핑

#### Studio (S) - 실시간 방송
- **S04**: 장치 자동 초기화 및 감지
- **S05**: 퀵 레이아웃 및 장면(Scene) 관리
- **S06**: 퀵 레이아웃 프리셋 선택
- **S07**: 멀티 장면(Scene) 리스트
- **S08**: 커스텀 레이아웃 편집
- **S09**: 소스 레이어 관리
- **S10**: 실시간 하드웨어 제어
- **S11**: 통합 플랫폼 채팅창
- **S12**: 실시간 시청 지표 모니터링
- **S13**: 브랜드 에셋 관리
- **S14**: 비디오 클립 삽입
- **S15**: 브랜드 스타일 설정
- **S16**: 실시간 배너 연출
- **S17**: 실시간 방송 노트
- **S21**: 프라이빗 채팅
- **S22**: 실시간 송출(Go Live)
- **S23**: 녹화 및 라이브러리 자동 이관

#### Library (L)
- **L01**: 영상 카드 리스트 조회
- **L02**: 외부 동영상 업로드
- **L03**: 개별 영상 관리 메뉴
- **L04**: 통합 비디오 플레이어
- **L05**: 타임라인 관심도 시각화
- **L06**: AI 쇼츠 자동 추출
- **L07**: 다국어 AI 자막 변환
- **L08**: 자막/타이틀 스타일 커스텀
- **L09**: 영상 가공(Export) 및 저장
- **L10**: 가공 프로세스 실시간 알림

---

## 핵심 기능 요약

### 1. 라이브 스트리밍 & 녹화
- WebRTC 기반 실시간 방송
- 멀티 플랫폼 동시 송출 (YouTube, Twitch, 치지직)
- RTMP 커스텀 엔드포인트 지원
- Local/Cloud 녹화 선택

### 2. 실시간 채팅/댓글 통합
- YouTube Live Chat API
- 치지직 API
- 실시간 댓글 수신 → 스튜디오 채팅창 표시
- **분당 댓글 수 집계** → AI 하이라이트 추출 + 그래프 시각화

#### 댓글 데이터 흐름
```
방송 중: 유튜브/치지직 API → 실시간 표시 + 분당 카운트 집계
방송 종료: 분당 댓글 수 저장 → AI 전달 + 라이브러리 그래프
```

#### 저장 데이터 (댓글 원문 저장 X)
```json
{
  "recording_id": "abc123",
  "comment_counts": [12, 25, 45, 30, 18, ...]  // 인덱스 = 분
}
```

### 3. 영상 편집
- 타임라인 기반 편집
- 마커(북마크) 설정
- 관심도 그래프 시각화
- 구간별 자르기 기능

### 4. 멤버 협업
- 파트너 즐겨찾기
- 스튜디오 초대 (백스테이지)
- 권한 관리 (Scene 전환, 오버레이 제어)
- 프라이빗 채팅

### 5. AI 기능

#### 하이라이트 추출 (2가지 입력)
1. **STT (음성→텍스트)**: 영상 내용 분석
2. **분당 댓글 수**: 시청자 반응 피크 구간 파악

#### AI 숏츠 생성 API
```
POST /shorts/process (Backend → AI)

Request:
{
  "job_id": "job_20240522_001",
  "videos": [{ "video_id": "vid_001", "video_path": "/mnt/share/input/video.mp4" }],
  "comment_counts_per_minute": [12, 25, 45, 30, 18, ...],  // 댓글 반응 데이터
  "need_subtitles": true,
  "subtitle_lang": "ko",
  "output_dir": "/mnt/share/output/shorts",
  "webhook_url": "http://backend:8080/api/v1/callback/ai-result"
}

Response (Webhook):
{
  "job_id": "job_20240522_001",
  "video_id": "vid_001",
  "status": "success",
  "data": {
    "short": { "file_path": "...", "duration_sec": 95.5, "has_subtitles": true },
    "highlight": { "start_sec": 120.0, "end_sec": 215.5, "reason": "..." },
    "titles": ["제목1", "제목2", "제목3"]
  }
}
```

#### 기타 AI 기능
- AI 쇼츠 자동 생성 (세로형 720x1280)
- STT (Speech-to-Text) - Whisper 기반
- 다국어 자막 생성 (한/영/일/중)
- LLM 기반 제목 추천 (3개)

### 6. 데이터 분석 & 시각화
- 실시간 시청자 수
- **댓글 타임라인 그래프** (라이브러리 페이지)
- 타임라인 관심도 분석
- 플랫폼별 통계

#### 댓글 타임라인 그래프 API
```
GET /api/library/videos/{videoId}/comment-counts

Response:
{
  "videoId": "abc123",
  "duration_minutes": 45,
  "counts": [12, 25, 45, 30, 18, ...]  // 분당 댓글 수
}
```

#### 그래프 표시 (프론트엔드)
```
  ▲ 댓글 수
  │
50│          █
40│        █ █
30│      █ █ █ █
20│    █ █ █ █ █ █
10│  █ █ █ █ █ █ █ █
  └─────────────────────► 시간(분)
    0  5 10 15 20 25 30 35
```

### 7. 자산 관리
- 스토리지 용량 시각화
- 자동 삭제 정책 (D-Day)
- 파일 필터링 및 검색
- 브랜드 에셋 업로드

### 8. 화면 레이아웃
- 퀵 레이아웃 프리셋
- 드래그 앤 드롭 커스텀
- 소스 레이어 관리
- 씬(Scene) 전환

### 9. 오디오 소스 제어
- 마이크/카메라 On/Off
- 오디오 믹싱
- 디바이스 자동 감지

### 10. 배너 & 오버레이
- 실시간 배너 노출
- 티커(Ticker) 스크롤
- 타이머 표시
- 브랜드 로고 삽입

### 11. 알림 시스템
- 스튜디오 초대 알림
- 녹화 완료 알림
- 쇼츠 생성 완료 알림
- 파일 삭제 예정 알림

---

## API 엔드포인트 매핑 (예시)

### Core Service
```
POST   /api/auth/login              → A03
POST   /api/auth/register           → A05
GET    /api/users/me                → W01
POST   /api/studios                 → W15
GET    /api/studios                 → W16
POST   /api/studios/{id}/members/invite → S18
GET    /api/destinations            → W12
```

### Media Service
```
POST   /api/media/streaming/start   → S22
POST   /api/media/streaming/stop    → S22
POST   /api/media/recordings        → S23
GET    /api/media/recordings        → L01
POST   /api/media/chat/send         → S11
GET    /api/media/chat/history      → S11
POST   /api/media/storage/upload    → L02
GET    /api/media/storage           → W07
GET    /api/library/videos/{id}/comment-counts → L05 (댓글 타임라인)
```

### AI Service
```
POST   /shorts/process              → L06 (숏츠 생성 요청, 비동기)
POST   /api/v1/callback/ai-result   → L06 (AI → Backend 웹훅)
```

#### AI 숏츠 생성 흐름
```
1. Backend → AI: POST /shorts/process (video_path + comment_counts)
2. AI → Backend: 즉시 응답 { status: "accepted" }
3. AI 처리 (STT + 하이라이트 추출 + 쇼츠 생성)
4. AI → Backend: POST webhook_url (완료 결과)
```

---

## 개발 우선순위 (권장)

### Phase 1: 기본 인프라 (1주)
- C01, C02, C03
- A01, A02, A03, A05
- W01, W16

### Phase 2: 스튜디오 생성 & 송출 (2주)
- W15, S01, S02, S03
- S04, S10
- S22, S23

### Phase 3: 채팅 & 협업 (1주)
- S11, S18, S19, S20, S21

### Phase 4: 영상 관리 & 편집 (2주)
- L01, L02, L03, L04, L05
- W07, W08, W09, W10

### Phase 5: AI 기능 (1주)
- L06, L07, L08, L09, L10

### Phase 6: 고급 기능 (1주)
- S05, S06, S07, S08, S09
- S12, S13, S14, S15, S16, S17
- W02, W12, W13, W14

---

**상세 기능 설명은 `assets/기능명세서_C206.pdf`를 참조하세요.**
