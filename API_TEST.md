# OneTakeStudio API 테스트 가이드

## 환경 변수 설정

```bash
# 로컬 환경
export BASE_URL="http://localhost:8080"
export MEDIA_URL="http://localhost:8082"
export USER_ID="test-user-123"

# 배포 환경
export BASE_URL="https://i14c206.p.ssafy.io"
export MEDIA_URL="https://i14c206.p.ssafy.io"
export USER_ID="your-user-id"
```

---

## 1. 스토리지 API 테스트

### 1.1 스토리지 사용량 조회
```bash
curl -X GET "${BASE_URL}/api/storage" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

**예상 응답:**
```json
{
  "totalBytes": 1342177280,
  "totalUsed": "1.25 GB",
  "limitBytes": 10737418240,
  "limit": "10.00 GB",
  "usedPercent": 12.5,
  "videoBytes": 1342177280,
  "assetBytes": 0,
  "shortsBytes": 0
}
```

### 1.2 스토리지 파일 목록 조회
```bash
curl -X GET "${BASE_URL}/api/storage/files?page=0&size=20" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

**예상 응답:**
```json
{
  "files": [
    {
      "id": "rec-uuid-123",
      "title": "내 녹화 영상",
      "name": "내 녹화 영상",
      "date": "2026-02-05 15:30",
      "uploadedAt": "2026-02-05T15:30:00",
      "size": "1.25 GB",
      "sizeBytes": 1342177280,
      "type": "Recording",
      "status": "Uploaded",
      "thumbnailUrl": "https://..."
    }
  ],
  "totalPages": 1,
  "totalElements": 1,
  "currentPage": 0
}
```

### 1.3 스토리지 파일 삭제
```bash
export RECORDING_ID="rec-uuid-123"

curl -X DELETE "${BASE_URL}/api/storage/files/${RECORDING_ID}" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

**예상 응답:**
```json
{
  "success": true,
  "data": null
}
```

### 1.4 스토리지 용량 체크 (내부 API)
```bash
curl -X POST "${BASE_URL}/api/storage/check-quota?userId=${USER_ID}&fileSize=1073741824" \
  | jq
```

**예상 응답 (용량 OK):**
```json
{
  "success": true,
  "data": true
}
```

**예상 응답 (용량 초과):**
```json
{
  "success": false,
  "error": {
    "code": "STORAGE_QUOTA_EXCEEDED",
    "message": "스토리지 용량이 부족합니다. 필요: 1.00GB, 사용 가능: 0.50GB (사용자: test-user-123)"
  }
}
```

---

## 2. 알림 API 테스트

### 2.1 알림 목록 조회
```bash
curl -X GET "${MEDIA_URL}/api/notifications" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

**예상 응답:**
```json
[
  {
    "id": 1,
    "type": "SHORTS_COMPLETED",
    "title": "숏츠 생성 완료",
    "message": "하이라이트 영상이 준비되었습니다.",
    "resourceId": "job_20260205_153000_123",
    "isRead": false,
    "createdAt": "2026-02-05T15:35:00"
  },
  {
    "id": 2,
    "type": "SHORTS_PROCESSING",
    "title": "숏츠 생성 중",
    "message": "AI가 하이라이트 영상을 생성하고 있습니다.",
    "resourceId": "job_20260205_153000_123",
    "isRead": true,
    "createdAt": "2026-02-05T15:30:00"
  }
]
```

### 2.2 읽지 않은 알림 개수
```bash
curl -X GET "${MEDIA_URL}/api/notifications/unread-count" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

**예상 응답:**
```json
{
  "count": 3
}
```

### 2.3 알림 읽음 처리
```bash
export NOTIFICATION_ID="1"

curl -X PUT "${MEDIA_URL}/api/notifications/${NOTIFICATION_ID}/read" \
  -H "X-User-Id: ${USER_ID}"
```

### 2.4 모든 알림 읽음 처리
```bash
curl -X PUT "${MEDIA_URL}/api/notifications/read-all" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

**예상 응답:**
```json
{
  "count": 3
}
```

### 2.5 SSE 실시간 알림 구독 (터미널)
```bash
curl -N -H "X-User-Id: ${USER_ID}" \
  "${MEDIA_URL}/api/notifications/subscribe"
```

**예상 출력:**
```
event: connected
data: SSE connected

event: notification
data: {"id":1,"type":"SHORTS_COMPLETED","title":"숏츠 생성 완료",...}

event: notification
data: {"id":2,"type":"RECORDING_COMPLETED","title":"녹화 완료",...}
```

---

## 3. AI 숏츠 API 테스트

### 3.1 숏츠 생성 요청
```bash
export RECORDING_ID="123"

curl -X POST "${MEDIA_URL}/api/shorts" \
  -H "X-User-Id: ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "recordingId": '${RECORDING_ID}',
    "needSubtitles": true,
    "subtitleLang": "ko"
  }' \
  | jq
```

**예상 응답 (HTTP 202 Accepted):**
```json
{
  "jobId": "job_20260205_153000_123",
  "recordingId": 123,
  "studioId": "studio-uuid",
  "status": "PROCESSING",
  "createdAt": "2026-02-05T15:30:00",
  "startedAt": "2026-02-05T15:30:05",
  "completedAt": null,
  "outputUrl": null,
  "durationSec": null,
  "errorMessage": null
}
```

### 3.2 숏츠 작업 상태 조회
```bash
export JOB_ID="job_20260205_153000_123"

curl -X GET "${MEDIA_URL}/api/shorts/${JOB_ID}" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

**예상 응답 (진행 중):**
```json
{
  "jobId": "job_20260205_153000_123",
  "status": "PROCESSING",
  "createdAt": "2026-02-05T15:30:00",
  "startedAt": "2026-02-05T15:30:05",
  "completedAt": null
}
```

**예상 응답 (완료):**
```json
{
  "jobId": "job_20260205_153000_123",
  "status": "COMPLETED",
  "createdAt": "2026-02-05T15:30:00",
  "startedAt": "2026-02-05T15:30:05",
  "completedAt": "2026-02-05T15:35:00",
  "outputUrl": "http://localhost:8082/api/recordings/files/shorts/short_123.mp4",
  "durationSec": 45.5,
  "highlightStartSec": 120.0,
  "highlightEndSec": 165.5,
  "highlightReason": "높은 채팅 활동"
}
```

### 3.3 내 숏츠 작업 목록 조회
```bash
curl -X GET "${MEDIA_URL}/api/shorts/my" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

---

## 4. 녹화 API 테스트

### 4.1 녹화 목록 조회
```bash
curl -X GET "${BASE_URL}/api/library/recordings?page=0&size=20" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

### 4.2 녹화 상세 조회
```bash
export RECORDING_ID="rec-uuid-123"

curl -X GET "${BASE_URL}/api/library/recordings/${RECORDING_ID}" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

### 4.3 녹화 삭제
```bash
curl -X DELETE "${BASE_URL}/api/library/recordings/${RECORDING_ID}" \
  -H "X-User-Id: ${USER_ID}" \
  | jq
```

---

## 5. 통합 테스트 시나리오

### 시나리오 1: 숏츠 생성 및 알림 확인

```bash
# 1. SSE 알림 구독 (터미널 1)
curl -N -H "X-User-Id: ${USER_ID}" \
  "${MEDIA_URL}/api/notifications/subscribe"

# 2. 숏츠 생성 요청 (터미널 2)
curl -X POST "${MEDIA_URL}/api/shorts" \
  -H "X-User-Id: ${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "recordingId": 123,
    "needSubtitles": true,
    "subtitleLang": "ko"
  }' | jq

# → 터미널 1에 "숏츠 생성 중" 알림이 실시간으로 나타남

# 3. 알림 목록 확인
curl -X GET "${MEDIA_URL}/api/notifications" \
  -H "X-User-Id: ${USER_ID}" | jq

# 4. 읽지 않은 알림 개수
curl -X GET "${MEDIA_URL}/api/notifications/unread-count" \
  -H "X-User-Id: ${USER_ID}" | jq

# 5. 모든 알림 읽음 처리
curl -X PUT "${MEDIA_URL}/api/notifications/read-all" \
  -H "X-User-Id: ${USER_ID}" | jq
```

### 시나리오 2: 스토리지 파일 관리

```bash
# 1. 스토리지 사용량 확인
curl -X GET "${BASE_URL}/api/storage" \
  -H "X-User-Id: ${USER_ID}" | jq

# 2. 파일 목록 조회
curl -X GET "${BASE_URL}/api/storage/files?page=0&size=20" \
  -H "X-User-Id: ${USER_ID}" | jq

# 3. 특정 파일 삭제
export RECORDING_ID="rec-uuid-123"
curl -X DELETE "${BASE_URL}/api/storage/files/${RECORDING_ID}" \
  -H "X-User-Id: ${USER_ID}" | jq

# 4. 사용량 재확인 (삭제 후)
curl -X GET "${BASE_URL}/api/storage" \
  -H "X-User-Id: ${USER_ID}" | jq
```

### 시나리오 3: 용량 초과 테스트

```bash
# 1. 현재 사용량 확인
curl -X GET "${BASE_URL}/api/storage" \
  -H "X-User-Id: ${USER_ID}" | jq

# 2. 10GB 이상 파일 업로드 시도 (용량 체크)
# 11GB = 11811160064 bytes
curl -X POST "${BASE_URL}/api/storage/check-quota?userId=${USER_ID}&fileSize=11811160064" \
  | jq

# → 예상: 용량 초과 에러
```

---

## 6. 프론트엔드 JavaScript 예제

### SSE 실시간 알림 수신
```javascript
// SSE 연결
const eventSource = new EventSource(`${MEDIA_URL}/api/notifications/subscribe`, {
  headers: {
    'X-User-Id': userId
  }
});

// 연결 성공
eventSource.addEventListener('connected', (event) => {
  console.log('SSE 연결됨:', event.data);
});

// 알림 수신
eventSource.addEventListener('notification', (event) => {
  const notification = JSON.parse(event.data);
  console.log('새 알림:', notification);

  // 알림 UI 표시
  showNotification(notification.title, notification.message);

  // 뱃지 업데이트
  updateUnreadBadge();
});

// 에러 처리
eventSource.onerror = (error) => {
  console.error('SSE 에러:', error);
};

// 연결 종료
// eventSource.close();
```

### 알림 목록 가져오기
```javascript
async function fetchNotifications() {
  const response = await fetch(`${MEDIA_URL}/api/notifications`, {
    headers: {
      'X-User-Id': userId
    }
  });
  const notifications = await response.json();
  return notifications;
}

// 사용
const notifications = await fetchNotifications();
console.log('알림 목록:', notifications);
```

### 읽지 않은 알림 개수
```javascript
async function getUnreadCount() {
  const response = await fetch(`${MEDIA_URL}/api/notifications/unread-count`, {
    headers: {
      'X-User-Id': userId
    }
  });
  const { count } = await response.json();
  return count;
}

// 뱃지 업데이트
const unreadCount = await getUnreadCount();
document.getElementById('notification-badge').textContent = unreadCount;
```

### 스토리지 파일 목록
```javascript
async function getStorageFiles(page = 0, size = 20) {
  const response = await fetch(
    `${BASE_URL}/api/storage/files?page=${page}&size=${size}`,
    {
      headers: {
        'X-User-Id': userId
      }
    }
  );
  return await response.json();
}

// 사용
const { files, totalElements, totalPages } = await getStorageFiles();
console.log(`총 ${totalElements}개 파일, ${totalPages}페이지`);
files.forEach(file => {
  console.log(`- ${file.title}: ${file.size} (${file.status})`);
});
```

### 파일 삭제
```javascript
async function deleteFile(recordingId) {
  const response = await fetch(
    `${BASE_URL}/api/storage/files/${recordingId}`,
    {
      method: 'DELETE',
      headers: {
        'X-User-Id': userId
      }
    }
  );
  return await response.json();
}

// 사용
await deleteFile('rec-uuid-123');
console.log('파일 삭제 완료');
```

---

## 테스트 체크리스트

### ✅ 스토리지 API
- [ ] 스토리지 사용량 조회
- [ ] 파일 목록 조회 (페이징)
- [ ] 파일 삭제
- [ ] 용량 체크 (10GB 제한)

### ✅ 알림 API
- [ ] SSE 실시간 알림 구독
- [ ] 알림 목록 조회
- [ ] 읽지 않은 알림 개수
- [ ] 알림 읽음 처리
- [ ] 모든 알림 읽음 처리

### ✅ 숏츠 API
- [ ] 숏츠 생성 요청
- [ ] 작업 상태 조회
- [ ] 내 작업 목록 조회
- [ ] 숏츠 생성 시 알림 발생 확인
- [ ] 숏츠 완료 시 알림 발생 확인

### ✅ 통합 시나리오
- [ ] 숏츠 생성 → SSE 알림 수신
- [ ] 파일 삭제 → 스토리지 용량 감소 확인
- [ ] 용량 초과 시 업로드 거부 확인
