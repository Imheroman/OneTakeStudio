# 라이브러리 URL 및 기능 정리

## 1. 페이지 URL 목록

| URL                      | 페이지                          | 설명                                     |
| ------------------------ | ------------------------------- | ---------------------------------------- |
| `/library`               | 라이브러리 목록                 | 녹화/업로드 영상 목록, 필터, 파일 업로드 |
| `/library?studioId={id}` | 라이브러리 목록 (스튜디오 필터) | 특정 스튜디오 영상만 표시                |
| `/library/[id]`          | 영상 상세                       | 영상 재생, 트림, 다운로드, 쇼츠 목록     |
| `/library/[id]/shorts`   | 쇼츠 생성                       | AI 쇼츠 생성 설정 및 요청                |
| `/storage`               | 저장 공간                       | 스토리지 사용량, 파일 목록               |

---

## 2. 라이브러리 기능별 상세

### 2.1 라이브러리 목록 (`/library`)

- **기능**
  - 녹화/업로드 영상 카드 그리드 표시
  - 필터: 전체 / 원본영상 / 쇼츠영상
  - 파일 업로드 버튼 → 업로드 모달
  - 카드 클릭 → 상세 페이지 이동
- **API**: `GET /api/library/recordings?page=&size=&studioId=`

### 2.2 영상 상세 (`/library/[id]`)

- **기능**
  - 영상 재생 (VideoPlayer)
  - 타임라인 - 시간별 댓글 분석 (AnalysisChart)
  - 영상 길이 조절 (TrimSection) → 클립 생성
  - 다운로드 버튼 → 다운로드 모달
  - 쇼츠 목록 (사이드바) → 쇼츠 클릭 시 재생 모달
  - "AI 쇼츠 생성" 버튼 → `/library/[id]/shorts` 이동
- **API**
  - `GET /api/library/recordings/:id` (상세)
  - `GET /api/library/recordings/:id/download` (다운로드 URL)
  - `POST /api/library/clips` (클립/트림 저장)

### 2.3 쇼츠 생성 (`/library/[id]/shorts`)

- **기능**
  - 배경색(검정/흰색), 자막 사용, 언어 선택
  - 미리보기 영역
  - "쇼츠 생성 요청" 버튼 → AI 쇼츠 생성 (MSW 활성화 시)
- **API**
  - `POST /api/v1/shorts/generate` (생성 요청)
  - `GET /api/v1/shorts/status` (폴링, 생성 진행 상태)

### 2.4 저장 공간 (`/storage`)

- **기능**
  - 스토리지 사용량 요약 (Progress)
  - 전체 파일 테이블 (현재 목업 데이터 없음)
- **API**: `GET /api/library/storage`

---

## 3. MSW 테스트용 URL (목업 데이터 기준)

MSW 활성화(`NEXT_PUBLIC_API_MOCKING=enabled`) 후 아래 URL로 입장 및 동작 확인 가능:

| URL                     | 테스트 시나리오                                   |
| ----------------------- | ------------------------------------------------- |
| `/library`              | 목록 로드, 카드 클릭                              |
| `/library/rec-1`        | 상세 페이지, 영상 재생, 트림, 다운로드, 쇼츠 목록 |
| `/library/rec-2`        | 다른 영상 상세                                    |
| `/library/rec-1/shorts` | 쇼츠 생성 페이지, 생성 요청                       |
| `/storage`              | 스토리지 사용량 표시                              |

**테스트 계정**: `test@example.com` / `12345678` (로그인 필요)

---

## 4. MSW 목업 데이터 요약

| ID    | 제목                       | 상태       | 비고                           |
| ----- | -------------------------- | ---------- | ------------------------------ |
| rec-1 | Weekly Podcast Episode #45 | READY      | 샘플 영상 URL 포함 (재생 가능) |
| rec-2 | Product Demo - Q1 Launch   | READY      | s3Url 없음                     |
| rec-3 | Tutorial: Getting Started  | PROCESSING |                                |
| rec-4 | Live Stream Highlight Reel | READY      |                                |
| rec-5 | Summer Vlog Highlights     | READY      |                                |

**실행 방법**:

```bash
# .env.local에 추가
NEXT_PUBLIC_API_MOCKING=enabled

# dev 서버 재시작
npm run dev
```
