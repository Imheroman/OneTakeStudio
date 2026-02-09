# 파일 전송 방법 비교: SSH vs HTTP API

## 개요

스트리밍 종료 후 녹화 파일을 외부 EC2 서버로 전송하기 위한 두 가지 방법을 비교합니다.

---

## 1. SSH 기반 (SCP/SFTP/rsync)

### 동작 방식
```
LiveKit EC2 ---(SSH)---> 외부 EC2
           파일 직접 전송
```

### 장점

| 항목 | 설명 |
|------|------|
| 구현 간단 | JSch 라이브러리로 Java에서 SSH 연결 가능 |
| 추가 개발 불필요 | 외부 EC2에 SSH만 열면 됨 |
| 보안 기본 제공 | SSH 프로토콜 자체가 암호화됨 |
| 대용량 유리 | rsync는 중간 끊김 시 이어서 전송 가능 |
| 검증된 방식 | 오랜 기간 사용된 안정적인 프로토콜 |

### 단점

| 항목 | 설명 |
|------|------|
| SSH 키 관리 | 키 생성, 배포, 교체 등 보안 관리 복잡 |
| 방화벽 설정 | SSH 포트(22) 외부 노출 필요 |
| 상태 추적 어려움 | 전송 진행률, 완료/실패 추적 복잡 |
| 스케일 아웃 어려움 | 여러 서버에 키 배포 문제 |

---

## 2. HTTP API (업로드 API)

### 동작 방식
```
LiveKit EC2 ---(HTTP POST)---> 외부 EC2 (업로드 API)
           multipart/form-data
```

### 장점

| 항목 | 설명 |
|------|------|
| RESTful 표준 | 표준적인 API 방식 |
| 상태 관리 용이 | 업로드 진행률, 완료/실패 응답 처리 쉬움 |
| 유연한 인증 | JWT, API Key 등 다양한 보안 적용 가능 |
| 확장성 | 로드밸런서로 여러 서버에 분산 가능 |
| 모니터링 쉬움 | HTTP 로깅, 메트릭 수집 용이 |

### 단점

| 항목 | 설명 |
|------|------|
| 추가 개발 필요 | 외부 EC2에 업로드 API 구현 필요 |
| 대용량 처리 | chunked upload 구현 필요 |
| 메모리 부담 | 스트리밍 업로드 안 하면 메모리 사용량 증가 |
| 타임아웃 관리 | 대용량 파일 업로드 시 타임아웃 설정 필요 |

---

## 비교 표

| 항목 | SSH (SCP/rsync) | HTTP API |
|------|-----------------|----------|
| **구현 복잡도** | 낮음 | 중간 |
| **외부 서버 개발** | 불필요 | 필요 |
| **보안 방식** | SSH 키 | API Key / JWT |
| **대용량 파일** | rsync 유리 | chunked 필요 |
| **상태 추적** | 어려움 | 용이 |
| **확장성** | 낮음 | 높음 |
| **포트** | 22 (SSH) | 80/443 (HTTP) |
| **로깅/모니터링** | 별도 구현 필요 | 기본 제공 |
| **재시도 로직** | rsync 내장 | 직접 구현 |

---

## MSA 아키텍처에서의 선택

### 본 프로젝트 환경

- Spring Cloud Gateway
- Eureka Service Discovery
- 마이크로서비스 간 REST API 통신
- JWT 기반 인증

### MSA 환경에서 HTTP API가 적합한 이유

| 항목 | SSH | HTTP API | MSA 적합성 |
|------|-----|----------|-----------|
| **서비스 간 통신** | 비표준 | REST 표준 | HTTP API |
| **서비스 디스커버리** | 불가 | Eureka 연동 가능 | HTTP API |
| **로드밸런싱** | 불가 | Gateway 경유 분산 | HTTP API |
| **인증 방식** | SSH 키 (별도 관리) | JWT (통일) | HTTP API |
| **모니터링** | 별도 구축 | Actuator, Prometheus 통합 | HTTP API |
| **로깅** | 별도 구축 | 중앙 로그 시스템 통합 | HTTP API |
| **확장성** | 키 배포 문제 | 서비스 인스턴스 추가만 | HTTP API |
| **장애 격리** | 어려움 | Circuit Breaker 적용 가능 | HTTP API |

### MSA 아키텍처 구조도

```
┌─────────────────────────────────────────────────────────────┐
│                     Spring Cloud Gateway                      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ Core Service │ │Media Service │ │  AI Service  │
      │   (MySQL)    │ │   (MySQL)    │ │  (Python)    │
      └──────────────┘ └──────────────┘ └──────────────┘
                              │
                              │ HTTP POST (파일 업로드)
                              ▼
                    ┌──────────────────┐
                    │   외부 EC2       │
                    │ (File Storage)   │
                    │ - Upload API     │
                    │ - 영상 저장      │
                    └──────────────────┘
```

### HTTP API 선택의 장점 상세

#### 1. 서비스 간 통신 일관성
```
Media Service ←→ Core Service    : REST API
Media Service ←→ AI Service      : REST API
Media Service ←→ 외부 EC2        : REST API  ← 동일한 패턴
```
모든 서비스 간 통신이 REST API로 통일되어 유지보수 용이

#### 2. 인증 통일
```java
// JWT로 모든 서비스 인증 통일
@PostMapping("/api/upload")
public ResponseEntity<?> upload(
    @RequestHeader("Authorization") String token,  // JWT
    @RequestParam("file") MultipartFile file) {
    // 토큰 검증 후 파일 저장
}
```
SSH 키 별도 관리 불필요, 기존 JWT 인증 체계 활용

#### 3. 모니터링 통합
```yaml
# Prometheus + Grafana로 통합 모니터링
- 업로드 요청 수
- 업로드 성공/실패율
- 평균 업로드 시간
- 파일 크기 분포
```

#### 4. 장애 대응
```java
// Resilience4j Circuit Breaker 적용 가능
@CircuitBreaker(name = "fileUpload", fallbackMethod = "uploadFallback")
public void uploadFile(String filePath) {
    // 외부 EC2로 업로드
}

public void uploadFallback(String filePath, Exception e) {
    // 재시도 큐에 저장
    retryQueue.add(filePath);
}
```

---

## 최종 결론

### 추천: **HTTP API**

| 평가 기준 | SSH | HTTP API | 선택 |
|----------|-----|----------|------|
| 구현 복잡도 | 낮음 | 중간 | SSH |
| MSA 일관성 | 비표준 | REST 표준 | **HTTP API** |
| 확장성 | 어려움 | 용이 | **HTTP API** |
| 모니터링 | 별도 구축 | 통합 가능 | **HTTP API** |
| 인증 통일 | SSH 키 | JWT | **HTTP API** |
| 장애 대응 | 어려움 | Circuit Breaker | **HTTP API** |

**MSA 아키텍처에서는 약간의 추가 개발 비용이 들더라도 HTTP API가 장기적으로 유리합니다.**

---

## 구현 체크리스트

### HTTP API 방식 구현

#### Media Service (전송 측)
- [ ] FileTransferService 구현
- [ ] RestTemplate 또는 WebClient 설정
- [ ] 대용량 파일 스트리밍 업로드 구현
- [ ] Egress 완료 웹훅에서 업로드 트리거
- [ ] Circuit Breaker 적용
- [ ] 재시도 로직 구현

#### 외부 EC2 (수신 측)
- [ ] Spring Boot 업로드 API 구현
- [ ] JWT 검증 필터 추가
- [ ] 파일 저장 경로 설정
- [ ] 업로드 진행률 응답 (선택)
- [ ] 디스크 용량 모니터링

#### 인프라
- [ ] 외부 EC2 보안그룹에 HTTP 포트 허용
- [ ] HTTPS 설정 (선택)
- [ ] 로드밸런서 설정 (선택)
