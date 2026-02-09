# API Gateway 아키텍처 가이드

> 작성일: 2026-01-28  
> 프론트엔드 개발자를 위한 백엔드 아키텍처 설명

## 개요

프론트엔드는 **API Gateway (포트 60000)**만 바라보면 됩니다. 모든 API 요청은 API Gateway를 통해 내부 마이크로서비스로 라우팅됩니다.

## 백엔드 서비스 구성

### 1. API Gateway (포트 60000)
- **역할**: 모든 외부 요청의 엔트리 포인트
- **기능**: 라우팅, CORS 처리, 서비스 디스커버리
- **프론트엔드 설정**: `NEXT_PUBLIC_API_URL=http://localhost:60000`

### 2. Core Service (포트 8080)
- **역할**: 핵심 비즈니스 로직 처리
- **담당 API**:
  - 인증 (`/api/auth/**`)
  - 사용자 (`/api/users/**`)
  - 스튜디오 (`/api/studios/**`)
  - 워크스페이스 (`/api/workspace/**`)
  - 알림 (`/api/notifications/**`)
  - 채널 (`/api/destinations/**`)

### 3. Video Service (미구현)
- **역할**: 쇼츠 생성/상태 등 (예정)
- **현황**: 백엔드에 ShortsService 없음. video-service 모듈도 없음. 프론트는 MSW로만 쇼츠 API 사용.
- **담당 API (예정)**: `/api/v1/shorts/**` → video-service 추가 시 Gateway 라우트 추가 예정

### 4. Media Service
- **역할**: 미디어 스트리밍, 녹화, 송출 처리
- **담당 API**:
  - 미디어 (`/api/v1/media/**`)
  - 스트림 (`/api/streams/**`)
  - 녹화 (`/api/recordings/**`)
  - 송출 (`/api/publish/**`)

### 5. Eureka Server (포트 8761)
- **역할**: 서비스 디스커버리 (마이크로서비스 간 통신)
- **프론트엔드 영향**: 없음 (내부 서비스 간 통신용)

## API Gateway 라우팅 규칙

API Gateway의 `application.yml` 설정에 따라 다음과 같이 라우팅됩니다:

### Core Service 라우팅
```
/api/auth/**          → Core Service
/api/users/**         → Core Service
/api/studios/**       → Core Service
/api/workspace/**     → Core Service
/api/notifications/** → Core Service
/api/destinations/**  → Core Service
/api/dashboard        → Core Service
# /api/v1/shorts/**   → (미구현) video-service 추가 시 라우팅
```

### Media Service 라우팅
```
/api/v1/media/**      → Media Service
/api/streams/**       → Media Service (RewritePath: /api/v1/media/stream/**)
/api/recordings/**    → Media Service (RewritePath: /api/v1/media/record/**)
/api/publish/**       → Media Service (RewritePath: /api/v1/media/publish/**)
```

## 프론트엔드 개발 가이드

### 1. API 호출 방법

모든 API 호출은 `apiClient`를 사용합니다:

```typescript
import { apiClient } from "@/shared/api/client";
import { AuthResponseSchema } from "@/entities/user/model";

// 로그인 예시
const response = await apiClient.post(
  "/api/auth/login",  // API Gateway 경로 (포트 60000)
  AuthResponseSchema,
  { email: "test@example.com", password: "12345678" }
);
```

### 2. 환경 변수 설정

`.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:60000
NEXT_PUBLIC_API_MOCKING=enabled  # 백엔드 미구현 API용 MSW 활성화
```

### 3. MSW 모킹 전략

백엔드에 구현되지 않은 API는 MSW로 모킹합니다:

- **MSW 활성화**: `NEXT_PUBLIC_API_MOCKING=enabled`
- **MSW 비활성화**: `NEXT_PUBLIC_API_MOCKING=disabled` (실제 백엔드 사용)

**MSW로 모킹되는 API**:
- `/api/auth/login` (백엔드 연결 문제 시)
- `/api/favorites/**` (백엔드 미구현)
- `/api/channels/**` (백엔드 미구현 또는 MSW 대체)
- `/api/v1/shorts/**` (백엔드 미구현)
- `/api/storage/**` (백엔드 미구현)
- `/api/library/videos` (백엔드 미구현)

### 4. CORS 설정

API Gateway에서 CORS가 이미 설정되어 있으므로, 프론트엔드에서 별도 설정이 필요 없습니다:

```yaml
# API Gateway application.yml
globalcors:
  cors-configurations:
    '[/**]':
      allowedOriginPatterns: ["*"]
      allowedMethods: [GET, POST, PUT, DELETE, PATCH, OPTIONS]
      allowedHeaders: "*"
      allowCredentials: true
```

## 개발 워크플로우

### 1. 로컬 개발 환경

1. **백엔드 서비스 실행**:
   - Eureka Server (포트 8761)
   - Core Service (포트 8080)
   - API Gateway (포트 60000)
   - Media Service (필요 시)

2. **프론트엔드 실행**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **MSW 설정**:
   - 백엔드 미구현 API: MSW 활성화 (`NEXT_PUBLIC_API_MOCKING=enabled`)
   - 실제 백엔드 테스트: MSW 비활성화 (`NEXT_PUBLIC_API_MOCKING=disabled`)

### 2. API 테스트

**실제 백엔드 테스트**:
```bash
# MSW 비활성화
NEXT_PUBLIC_API_MOCKING=disabled npm run dev
```

**MSW 모킹 테스트**:
```bash
# MSW 활성화 (기본값)
npm run dev
```

## 주의사항

1. **포트 번호**: 프론트엔드는 항상 `60000` 포트(API Gateway)만 바라봅니다.
2. **서비스 디스커버리**: Eureka를 통한 서비스 디스커버리는 백엔드 내부에서만 사용됩니다.
3. **MSW 우선순위**: MSW가 활성화되면 모든 요청을 가로채므로, 실제 백엔드 테스트 시 비활성화해야 합니다.
4. **인증 토큰**: API Gateway를 통해 전달되며, Core Service에서 검증됩니다.

## 문제 해결

### 503 Service Unavailable (로그인/인증 API)

**증상:**
- `POST /api/auth/login` 요청 시 503 에러 발생
- 응답: `{"timestamp": "...", "status": 503, "error": "Service Unavailable"}`

**원인:**
1. **Eureka에 core-service가 등록되지 않음**
   - API Gateway가 `lb://core-service`로 라우팅하려 하지만 서비스를 찾지 못함
   - Eureka 대시보드에서 `core-service`가 `UP` 상태인지 확인 필요

2. **서비스 시작 순서 문제**
   - 올바른 순서: Eureka Server → Core Service → API Gateway
   - API Gateway가 먼저 시작되면 core-service를 찾지 못함

3. **Core Service 실행 실패**
   - MySQL 연결 실패
   - 포트 충돌 (8080)
   - 기타 애플리케이션 시작 오류

**해결 방법:**

1. **Eureka 대시보드 확인**
   ```
   http://localhost:8761
   ```
   - `core-service`가 `UP` 상태인지 확인
   - 등록되지 않았다면 core-service 재시작

2. **서비스 시작 순서 확인**
   ```bash
   # 1. Eureka Server 시작
   # 2. Core Service 시작 (Eureka에 등록 대기)
   # 3. API Gateway 시작
   ```

3. **Core Service 로그 확인**
   - MySQL 연결 성공 여부
   - Eureka 등록 성공 여부
   - 애플리케이션 시작 완료 여부

4. **MSW로 우회 (임시)**
   ```env
   # .env.local
   NEXT_PUBLIC_API_MOCKING=enabled
   ```
   - 프론트엔드 dev 서버 재시작 필요

**진단 명령어:**
```bash
# Eureka에 등록된 서비스 확인
curl http://localhost:8761/eureka/apps

# Core Service Health Check
curl http://localhost:8080/actuator/health

# API Gateway를 통한 로그인 테스트
curl -X POST http://localhost:60000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"12345678"}'
```

### 로그인 실패 (기타)
1. API Gateway (60000) 실행 확인
2. Core Service (8080) 실행 확인
3. Eureka Server (8761) 실행 확인
4. MSW 비활성화 후 테스트

### CORS 에러
- API Gateway의 CORS 설정 확인
- 프론트엔드 요청 헤더 확인

### 404 에러
- API Gateway 라우팅 규칙 확인
- Core Service 엔드포인트 확인

### 500 Internal Server Error
- Core Service 로그 확인
- MySQL 연결 상태 확인
- 데이터베이스 스키마 확인
