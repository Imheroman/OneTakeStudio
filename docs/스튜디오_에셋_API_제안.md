# 스튜디오 에셋 API 제안 (백엔드 구현용)

> 프론트엔드에서 사용 중인 에셋(로고, 오버레이, 비디오 클립) API 스키마 및 양식 제안입니다.  
> 백엔드에서 이 스펙대로 구현해 주시면 그대로 연동할 수 있습니다.

---

## 1. 개요

- **에셋 타입**: `logo`(로고), `overlay`(오버레이), `video`(비디오 클립: 인트로/아웃트로 등)
- **기능**: 스튜디오별 에셋 목록 조회, 업로드(파일 + 메타), 삭제
- **기본 제공 에셋**: 프론트에서 목록에 기본 에셋을 섞어 쓸 수 있음. 백엔드에서는 **사용자 업로드 에셋만** 관리해도 됩니다. (기본 에셋은 프론트/목업에서 처리 가능)

---

## 2. API 엔드포인트

| 메서드 | 경로                                       | 설명                            |
| ------ | ------------------------------------------ | ------------------------------- |
| GET    | `/api/studios/{studioId}/assets`           | 해당 스튜디오 에셋 목록 조회    |
| POST   | `/api/studios/{studioId}/assets`           | 에셋 생성 (JSON 또는 multipart) |
| DELETE | `/api/studios/{studioId}/assets/{assetId}` | 에셋 삭제                       |

---

## 3. 요청/응답 스키마

### 3.1 에셋 한 건 (공통)

| 필드      | 타입               | 필수 | 설명                                  |
| --------- | ------------------ | ---- | ------------------------------------- |
| id        | number 또는 string | O    | 에셋 고유 ID                          |
| studioId  | number             | -    | 스튜디오 ID (응답 시 선택)            |
| type      | string             | O    | `"logo"` \| `"overlay"` \| `"video"`  |
| name      | string             | O    | 표시 이름                             |
| fileUrl   | string \| null     | -    | 파일 접근 URL (업로드 후 저장된 경로) |
| createdAt | string (ISO 8601)  | -    | 생성 시각                             |

### 3.2 GET `/api/studios/{studioId}/assets`

**요청**: 경로 파라미터 `studioId`  
**응답**: `ApiResponse<Asset[]>` (프로젝트 공통 응답 래퍼)

```json
{
  "success": true,
  "message": "조회 성공",
  "data": [
    {
      "id": 1,
      "studioId": 100,
      "type": "logo",
      "name": "업로드 로고",
      "fileUrl": "https://cdn.example.com/studios/100/assets/logo-1.png",
      "createdAt": "2026-01-29T12:00:00Z"
    },
    {
      "id": 2,
      "studioId": 100,
      "type": "video",
      "name": "인트로",
      "fileUrl": "https://cdn.example.com/studios/100/assets/intro-2.mp4",
      "createdAt": "2026-01-29T12:05:00Z"
    }
  ]
}
```

- `data`가 빈 배열이어도 괜찮습니다. 프론트에서 기본 제공 에셋과 합쳐서 표시합니다.

---

## 4. POST: 에셋 생성 (두 가지 방식)

프론트는 **파일 업로드 시 multipart**, **URL만 등록 시 JSON**을 사용합니다.

### 4.1 multipart/form-data (파일 업로드)

**Content-Type**: `multipart/form-data`

| 필드 | 타입   | 필수 | 설명                                                |
| ---- | ------ | ---- | --------------------------------------------------- |
| file | File   | O    | 업로드할 파일 (이미지: logo/overlay, 비디오: video) |
| type | string | O    | `"logo"` \| `"overlay"` \| `"video"`                |
| name | string | -    | 표시 이름 (미입력 시 파일명 사용)                   |

- **로고/오버레이**: 이미지 파일 권장 (png, jpg, webp 등)
- **비디오 클립**: 동영상 파일 (mp4 등)

**응답**: `ApiResponse<Asset>` (생성된 에셋, `fileUrl` 포함)

```json
{
  "success": true,
  "message": "에셋이 등록되었습니다.",
  "data": {
    "id": 3,
    "studioId": 100,
    "type": "video",
    "name": "아웃트로",
    "fileUrl": "https://cdn.example.com/studios/100/assets/outro-3.mp4",
    "createdAt": "2026-01-29T12:10:00Z"
  }
}
```

### 4.2 JSON (URL만 등록, 선택 사항)

**Content-Type**: `application/json`

```json
{
  "type": "logo",
  "name": "외부 로고",
  "fileUrl": "https://example.com/external-logo.png"
}
```

- 파일 업로드 없이 URL만 저장할 때 사용할 수 있는 형태입니다. 백엔드에서 지원하지 않으면 생략해도 됩니다.

---

## 5. DELETE `/api/studios/{studioId}/assets/{assetId}`

**요청**: 경로 파라미터 `studioId`, `assetId`  
**응답**: 공통 성공 응답

```json
{
  "success": true,
  "message": "삭제되었습니다."
}
```

- 해당 스튜디오 소유의 에셋만 삭제 가능하도록 권한 검증 필요.
- 저장소에 있는 파일 삭제 정책(즉시 삭제 vs 소프트 삭제)은 백엔드 정책에 맞게 구현하면 됩니다.

---

## 6. 파일 저장/URL 정책 제안

- **저장 경로 예시**: `studios/{studioId}/assets/{type}/{assetId}.{ext}` 또는 버킷별 규칙
- **fileUrl**: 클라이언트가 그대로 img/video `src`에 넣을 수 있는 **공개 URL** 또는 **서명된 URL**이면 됩니다.
- **용량/타입 제한 예시**:
  - 로고/오버레이: 이미지, 최대 5MB
  - 비디오: mp4 등, 최대 100MB (서비스 정책에 따라 조정)

---

## 7. 프론트엔드 연동 상태

- **에셋 목록**: `GET /api/studios/{studioId}/assets` 호출 후 기본 제공 에셋과 합쳐서 표시.
- **업로드**: `POST /api/studios/{studioId}/assets` with `FormData` (file, type, name).
- **삭제**: `DELETE /api/studios/{studioId}/assets/{assetId}`.
- 위 스키마와 응답 형식(`success`, `data`)이 맞으면 **추가 수정 없이** 현재 프론트 코드와 연동 가능합니다.

백엔드에서 이 스펙으로 구현해 주시면, 프론트는 MSW를 끄고 실제 API만 바라보면 됩니다.
