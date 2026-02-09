# API 테스트 가이드

## Postman Collection

아래 JSON을 Postman에서 Import하면 바로 테스트 가능

### media-service-api.postman_collection.json
```json
{
  "info": {
    "name": "Media Service API",
    "description": "OneTakeStudio Media Service API Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8081"
    },
    {
      "key": "accessToken",
      "value": "your-jwt-token-here"
    },
    {
      "key": "studioId",
      "value": "1001"
    },
    {
      "key": "recordingId",
      "value": ""
    },
    {
      "key": "publishId",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Stream",
      "item": [
        {
          "name": "토큰 발급",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"studioId\": {{studioId}},\n  \"role\": \"host\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/token",
              "host": ["{{baseUrl}}"],
              "path": ["media", "token"]
            }
          }
        },
        {
          "name": "ICE 서버 조회",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/media/ice-servers",
              "host": ["{{baseUrl}}"],
              "path": ["media", "ice-servers"]
            }
          }
        }
      ]
    },
    {
      "name": "Recording",
      "item": [
        {
          "name": "녹화 시작",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "var jsonData = pm.response.json();",
                  "if (jsonData.data && jsonData.data.recordingId) {",
                  "    pm.collectionVariables.set('recordingId', jsonData.data.recordingId);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"studioId\": {{studioId}},\n  \"title\": \"테스트 녹화\",\n  \"quality\": \"1080p\",\n  \"storage\": \"cloud\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/record/start",
              "host": ["{{baseUrl}}"],
              "path": ["media", "record", "start"]
            }
          }
        },
        {
          "name": "녹화 일시정지",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recordingId\": \"{{recordingId}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/record/pause",
              "host": ["{{baseUrl}}"],
              "path": ["media", "record", "pause"]
            }
          }
        },
        {
          "name": "녹화 재개",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recordingId\": \"{{recordingId}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/record/resume",
              "host": ["{{baseUrl}}"],
              "path": ["media", "record", "resume"]
            }
          }
        },
        {
          "name": "녹화 중지",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recordingId\": \"{{recordingId}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/record/stop",
              "host": ["{{baseUrl}}"],
              "path": ["media", "record", "stop"]
            }
          }
        },
        {
          "name": "녹화 상태 조회",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/media/record/{{recordingId}}",
              "host": ["{{baseUrl}}"],
              "path": ["media", "record", "{{recordingId}}"]
            }
          }
        }
      ]
    },
    {
      "name": "Publish",
      "item": [
        {
          "name": "송출 시작",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "var jsonData = pm.response.json();",
                  "if (jsonData.data && jsonData.data.publishId) {",
                  "    pm.collectionVariables.set('publishId', jsonData.data.publishId);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"studioId\": {{studioId}},\n  \"destinationIds\": [\n    101,\n    102\n  ]\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/publish",
              "host": ["{{baseUrl}}"],
              "path": ["media", "publish"]
            }
          }
        },
        {
          "name": "송출 중지",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"publishId\": \"{{publishId}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/publish/stop",
              "host": ["{{baseUrl}}"],
              "path": ["media", "publish", "stop"]
            }
          }
        },
        {
          "name": "송출 상태 조회",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/media/publish/{{publishId}}",
              "host": ["{{baseUrl}}"],
              "path": ["media", "publish", "{{publishId}}"]
            }
          }
        }
      ]
    },
    {
      "name": "Screen Share",
      "item": [
        {
          "name": "화면공유 시작",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"studioId\": {{studioId}},\n  \"sourceType\": \"screen\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/screen-share/start",
              "host": ["{{baseUrl}}"],
              "path": ["media", "screen-share", "start"]
            }
          }
        },
        {
          "name": "화면공유 중지",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "Authorization",
                "value": "Bearer {{accessToken}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"shareId\": \"share-id-here\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/media/screen-share/stop",
              "host": ["{{baseUrl}}"],
              "path": ["media", "screen-share", "stop"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## cURL 테스트

### 토큰 발급
```bash
curl -X POST http://localhost:8081/media/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "studioId": 1001,
    "role": "host"
  }'
```

### 녹화 시작
```bash
curl -X POST http://localhost:8081/media/record/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "studioId": 1001,
    "title": "테스트 녹화",
    "quality": "1080p",
    "storage": "cloud"
  }'
```

### 녹화 중지
```bash
curl -X POST http://localhost:8081/media/record/stop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "recordingId": "RECORDING_ID_HERE"
  }'
```

### 송출 시작
```bash
curl -X POST http://localhost:8081/media/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "studioId": 1001,
    "destinationIds": [101]
  }'
```

---

## 테스트 시나리오

### 시나리오 1: 기본 녹화 플로우

```
1. 토큰 발급 (POST /media/token)
   ↓
2. 녹화 시작 (POST /media/record/start)
   ↓ (녹화 진행...)
3. 녹화 상태 확인 (GET /media/record/{id})
   ↓
4. 녹화 중지 (POST /media/record/stop)
   ↓
5. 완료 상태 확인 (GET /media/record/{id})
```

### 시나리오 2: 라이브 송출 플로우

```
1. 토큰 발급 (POST /media/token)
   ↓
2. 송출 시작 (POST /media/publish)
   ↓ (송출 진행...)
3. 송출 상태 확인 (GET /media/publish/{id})
   ↓
4. 송출 중지 (POST /media/publish/stop)
```

### 시나리오 3: 동시 녹화 + 송출

```
1. 토큰 발급
2. 녹화 시작
3. 송출 시작 (동시에)
4. ... 방송 진행 ...
5. 송출 중지
6. 녹화 중지
```

---

## 예상 응답

### 토큰 발급 성공
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "serverUrl": "ws://localhost:7880",
    "expiresAt": "2025-01-26T10:00:00"
  }
}
```

### 녹화 시작 성공
```json
{
  "success": true,
  "data": {
    "recordingId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "RECORDING"
  }
}
```

### 에러 응답
```json
{
  "success": false,
  "data": null,
  "code": "R002",
  "message": "이미 녹화 중입니다"
}
```
