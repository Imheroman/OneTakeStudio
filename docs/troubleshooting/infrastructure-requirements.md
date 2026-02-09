# OneTakeStudio 백엔드 인프라 요구사항

## 개요

OneTakeStudio 백엔드는 MSA(Microservices Architecture) 구조로 설계되었으며, 제한된 EC2 리소스를 고려하여 인프라를 최적화했습니다.

---

## 1. 필요 서버 목록

| 구성요소 | 용도 | 필수 여부 | 비고 |
|---------|------|----------|------|
| k3s | 컨테이너 오케스트레이션 | ✅ 필수 | 경량 Kubernetes |
| MySQL | 데이터베이스 | ✅ 필수 | 단일 서버, 논리적 DB 분리 |
| Redis | 캐시 + 메시지 큐 | ✅ 필수 | RabbitMQ 대체 |
| LiveKit | WebRTC + 녹화 | ✅ 필수 | 실시간 방송 핵심 |
| Jenkins | CI/CD | 선택 | 자동 배포 파이프라인 |

**단일 EC2 인스턴스 (t3.xlarge)**에서 k3s 기반으로 모든 서비스 운영 가능합니다.

---

## 2. 아키텍처 개요

### 2.1 전체 인프라 구성

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EC2 (t3.xlarge)                                  │
│                      4 vCPU / 16GB RAM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                           k3s Cluster                             │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                     Application Pods                        │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │  │  │
│  │  │  │   API    │  │   Core   │  │  Media   │  │   Eureka    │  │  │  │
│  │  │  │ Gateway  │  │ Service  │  │ Service  │  │   Server    │  │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                  Infrastructure Pods                        │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │  │  │
│  │  │  │  MySQL   │  │  Redis   │  │ LiveKit  │  │   Jenkins   │  │  │  │
│  │  │  │          │  │          │  │ +Egress  │  │  (Optional) │  │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 서비스 간 통신

```
                    ┌─────────────────────────────────────┐
                    │           API Gateway               │
                    │        (Spring Cloud Gateway)       │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
            ┌───────┴───────┐             ┌───────┴───────┐
            │ Core Service  │             │ Media Service │
            │               │             │               │
            │ - 회원가입    │             │ - 방송 관리   │
            │ - 로그인      │             │ - 녹화 제어   │
            │ - OAuth       │             │ - LiveKit 연동│
            │ - 이메일 인증 │             │ - 채팅        │
            └───────┬───────┘             └───────┬───────┘
                    │                             │
        ┌───────────┴─────────────────────────────┴───────────┐
        │                                                     │
   ┌────┴────┐    ┌─────────────┐    ┌─────────────────────┐  │
   │  MySQL  │    │    Redis    │    │      LiveKit        │  │
   │         │    │             │    │                     │  │
   │ core_db │    │ - 캐시      │    │ - WebRTC 시그널링   │  │
   │ media_db│    │ - 세션      │    │ - 녹화 (Egress)     │  │
   │         │    │ - 메시지 큐 │    │ - 스트리밍 송출     │  │
   └─────────┘    └─────────────┘    └─────────────────────┘  │
        │                                                     │
        └─────────────────────────────────────────────────────┘
```

---

## 3. 각 서버 상세 설명

### 3.0 k3s (경량 Kubernetes)

**역할:** 컨테이너 오케스트레이션

**k3s를 선택한 이유:**
| 항목 | k3s | k8s (표준) |
|------|-----|-----------|
| 메모리 사용량 | ~512MB | ~2GB+ |
| 바이너리 크기 | ~50MB | ~1GB+ |
| 설치 시간 | 30초 | 수 분 |
| 단일 노드 지원 | ✅ 최적화됨 | 가능하나 과함 |

**k3s가 제공하는 기능:**
- Pod 관리 및 자동 재시작
- 서비스 디스커버리 (내부 DNS)
- ConfigMap/Secret 관리
- Ingress Controller (Traefik 내장)
- 로드밸런싱

**설치 방법:**
```bash
# k3s 설치 (단일 노드)
curl -sfL https://get.k3s.io | sh -

# kubectl 설정
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# 상태 확인
kubectl get nodes
```

**리소스 요구사항:**
- CPU: 0.5 코어 (Control Plane)
- 메모리: 512MB
- 저장소: 1GB

---

### 3.0.1 Jenkins (CI/CD) - 선택사항

**역할:** 자동 빌드 및 배포

**Jenkins 파이프라인 예시:**
```
[Git Push] → [Jenkins 감지] → [Build] → [Test] → [Docker Image] → [k3s 배포]
```

**k3s 환경에서 Jenkins 배포:**
```yaml
# jenkins-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jenkins
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jenkins
  template:
    metadata:
      labels:
        app: jenkins
    spec:
      containers:
      - name: jenkins
        image: jenkins/jenkins:lts
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: jenkins-home
          mountPath: /var/jenkins_home
      volumes:
      - name: jenkins-home
        persistentVolumeClaim:
          claimName: jenkins-pvc
```

**리소스 요구사항:**
- CPU: 0.5 코어 (빌드 시 1+ 코어)
- 메모리: 1-2GB
- 저장소: 10GB+ (빌드 아티팩트)

**주의사항:**
- 빌드 중 리소스 사용량 급증
- Egress 녹화와 동시 빌드 시 리소스 부족 가능
- 빌드 시간대 분리 또는 리소스 제한 설정 권장

---

### 3.1 MySQL

**역할:** 영구 데이터 저장

**논리적 DB 분리:**
| 데이터베이스 | 사용 서비스 | 저장 데이터 |
|-------------|------------|------------|
| `core_db` | Core Service | 사용자, 인증, 이메일 인증 토큰 |
| `media_db` | Media Service | 방송, 녹화, 참여자, 채팅 |

**접근 권한 분리:**
```sql
-- Core Service 전용 계정
CREATE USER 'core_user'@'%' IDENTIFIED BY 'core_password';
GRANT ALL PRIVILEGES ON core_db.* TO 'core_user'@'%';

-- Media Service 전용 계정
CREATE USER 'media_user'@'%' IDENTIFIED BY 'media_password';
GRANT ALL PRIVILEGES ON media_db.* TO 'media_user'@'%';
```

**권장 사양:**
- MySQL 8.0+
- 최소 메모리: 512MB
- 저장소: 10GB+ (SSD 권장)

---

### 3.2 Redis

**역할:** 캐시 + 세션 + 메시지 큐

| 기능 | 용도 | 사용 기능 |
|------|------|----------|
| 캐시 | JWT 블랙리스트, 이메일 인증 코드 | String, TTL |
| 세션 | 로그인 세션 관리 | String, TTL |
| 메시지 큐 | 서비스 간 비동기 통신 | Redis Streams |
| 실시간 알림 | 방송 상태 변경 알림 | Pub/Sub |

**RabbitMQ 대신 Redis를 선택한 이유:**
1. 이미 캐시용으로 Redis 사용 중 → 서버 추가 불필요
2. 메시지 패턴이 단순 (복잡한 라우팅 불필요)
3. Redis Streams가 기본적인 메시지 큐 기능 제공
4. 메모리/CPU 리소스 절약

**메시지 큐 사용 예시:**
```
# 서비스 간 이벤트 전달
Stream: broadcast-events
  - BROADCAST_STARTED (방송 시작)
  - BROADCAST_ENDED (방송 종료)
  - RECORDING_COMPLETED (녹화 완료)
```

**권장 사양:**
- Redis 7.0+
- 최소 메모리: 256MB
- maxmemory-policy: allkeys-lru

---

### 3.3 LiveKit

**역할:** 실시간 방송 인프라

| 기능 | 설명 |
|------|------|
| WebRTC 시그널링 | 참여자 간 P2P 연결 중계 |
| SFU (Selective Forwarding Unit) | 다수 참여자 스트림 최적화 |
| Egress | 녹화, RTMP 송출 (YouTube, Twitch 등) |
| Room 관리 | 방송 방 생성/삭제/참여자 관리 |

**필요 포트:**
| 포트 | 프로토콜 | 용도 |
|------|---------|------|
| 7880 | TCP | HTTP API |
| 7881 | TCP | WebRTC (TCP fallback) |
| 7882 | TCP | TURN/TLS |
| 50000-60000 | UDP | WebRTC 미디어 |

**권장 사양:**
- CPU: 2+ 코어 (WebRTC 인코딩/디코딩)
- 메모리: 1GB+
- 네트워크: 공인 IP 필요, UDP 포트 개방

**LiveKit 설정 예시 (livekit.yaml):**
```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  APIKeyHere: SecretKeyHere
```

---

### 3.4 LiveKit Egress (녹화/스트리밍)

**Egress란?**

LiveKit Egress는 실시간 방송을 **녹화**하거나 **외부 플랫폼으로 송출**하는 기능입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                        LiveKit Egress                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [LiveKit Room]                                                │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────┐     ┌──────────────────────────────────────┐     │
│   │ Egress  │────▶│  출력 대상                            │     │
│   │ Service │     │  - 파일 저장 (MP4, WebM, OGG)         │     │
│   └─────────┘     │  - S3/GCS/Azure 업로드               │     │
│                   │  - RTMP 송출 (YouTube, Twitch 등)     │     │
│                   └──────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Egress 유형:**

| 유형 | 설명 | 용도 |
|------|------|------|
| Room Composite | 방 전체를 하나의 영상으로 합성 | 전체 녹화, 라이브 스트리밍 |
| Track Composite | 특정 트랙들만 합성 | 선택적 녹화 |
| Track Egress | 개별 트랙 저장 | 개별 참여자 녹화 |

**OneTakeStudio에서의 사용:**

```
[사용자 요청: 녹화 시작]
        │
        ▼
[Media Service]
        │
        ├─── LiveKit API 호출: StartRoomCompositeEgress
        │
        ▼
[LiveKit Server]
        │
        ├─── egress_id 반환 (예: "EG_abc123xyz")
        │
        ▼
[Media Service]
        │
        └─── egress_id를 DB에 저장 (recordings 테이블)
```

**egress_id란?**

| 항목 | 설명 |
|------|------|
| 정의 | LiveKit이 생성한 녹화/스트리밍 작업 식별자 |
| 형식 | 문자열 (예: `EG_abc123xyz789`) |
| 용도 | 녹화 중지, 상태 조회 시 사용 |
| 저장 위치 | media_db의 recordings 테이블 |

**녹화 제어 흐름:**

```
1. 녹화 시작
   POST /api/recordings/start
   └─► LiveKit: StartRoomCompositeEgress()
   └─► 응답: egress_id
   └─► DB 저장: recordings.egress_id = "EG_abc123"

2. 녹화 중지
   POST /api/recordings/stop
   └─► DB에서 egress_id 조회
   └─► LiveKit: StopEgress(egress_id)
   └─► 녹화 파일 생성 완료

3. 녹화 상태 조회
   GET /api/recordings/{recordingId}/status
   └─► DB에서 egress_id 조회
   └─► LiveKit: GetEgressInfo(egress_id)
   └─► 상태 반환 (EGRESS_STARTING, EGRESS_ACTIVE, EGRESS_COMPLETE)
```

**Egress 출력 설정:**

```yaml
# livekit.yaml에 egress 설정 추가
egress:
  # 로컬 파일 저장 (개발 환경)
  file_output:
    local: true
    output_path: /recordings

  # S3 저장 (운영 환경 권장)
  # s3:
  #   access_key: YOUR_ACCESS_KEY
  #   secret: YOUR_SECRET_KEY
  #   region: ap-northeast-2
  #   bucket: onetakestudio-recordings
```

**녹화 파일 저장 옵션:**

| 옵션 | 설명 | 권장 환경 |
|------|------|----------|
| 로컬 저장 | EC2 디스크에 직접 저장 | 개발/테스트 |
| S3 | AWS S3 버킷에 자동 업로드 | 운영 환경 |
| GCS | Google Cloud Storage | 운영 환경 |

**RTMP 송출 (멀티 플랫폼 스트리밍):**

```
[LiveKit Room] ──▶ [Egress] ──▶ RTMP ──▶ YouTube Live
                              ──▶ RTMP ──▶ Twitch
                              ──▶ RTMP ──▶ 기타 플랫폼
```

```java
// 멀티 플랫폼 송출 예시 (Media Service)
StreamOutput youtubeOutput = StreamOutput.newBuilder()
    .setProtocol(StreamProtocol.RTMP)
    .addUrls("rtmp://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY")
    .build();

StreamOutput twitchOutput = StreamOutput.newBuilder()
    .setProtocol(StreamProtocol.RTMP)
    .addUrls("rtmp://live.twitch.tv/app/YOUR_STREAM_KEY")
    .build();
```

**Egress 관련 추가 리소스 요구사항:**

| 항목 | 개발 환경 | 운영 환경 |
|------|----------|----------|
| CPU | +1 코어 (인코딩용) | +2 코어 |
| 메모리 | +512MB | +1GB |
| 저장소 | 20GB+ | S3 사용 권장 |
| 네트워크 | - | RTMP 송출 시 업로드 대역폭 |

**중요:** Egress는 LiveKit 서버 내부에서 처리되며, 별도 서버가 필요하지 않습니다. 다만 인코딩 작업으로 인해 CPU/메모리 사용량이 증가합니다.

---

## 4. MSA 구조 유지 방법

### 4.1 서비스 독립성

```
┌─────────────────────────────────────────────────────────────┐
│                      MSA 핵심 요건                          │
├─────────────────────────────────────────────────────────────┤
│  ✅ 서비스 분리      Core Service ↔ Media Service 독립     │
│  ✅ 독립 배포        각 서비스 별도 컨테이너/JAR 배포       │
│  ✅ 데이터 소유권    core_db ↔ media_db 논리적 분리        │
│  ✅ 서비스 간 통신   REST API (동기) + Redis Streams (비동기)│
└─────────────────────────────────────────────────────────────┘
```

### 4.2 서비스 간 통신

**동기 통신 (REST API):**
```
Core Service → Media Service
  GET /api/rooms/{roomId}  (방 정보 조회)
  POST /api/rooms          (방 생성)

Media Service → Core Service
  GET /api/users/{userId}  (사용자 정보 조회)
```

**비동기 통신 (Redis Streams):**
```
Media Service → Core Service
  Stream: user-events
  Event: USER_JOINED_BROADCAST (사용자 방송 참여)

Core Service → Media Service
  Stream: broadcast-events
  Event: USER_BANNED (사용자 차단)
```

---

## 5. 배포 설정

### 5.1 Docker Compose (로컬 개발용)

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: onetakestudio-mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "3306:3306"

  redis:
    image: redis:7.0-alpine
    container_name: onetakestudio-redis
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"

  livekit:
    image: livekit/livekit-server:latest
    container_name: onetakestudio-livekit
    command: --config /etc/livekit.yaml
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
      - recordings_data:/recordings  # Egress 녹화 파일 저장
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882"
      - "50000-60000:50000-60000/udp"

volumes:
  mysql_data:
  recordings_data:  # 녹화 파일 볼륨 (운영 시 S3 연동 권장)
```

**init-db.sql:**
```sql
-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS core_db;
CREATE DATABASE IF NOT EXISTS media_db;

-- Core Service 계정
CREATE USER IF NOT EXISTS 'core_user'@'%' IDENTIFIED BY 'core_password';
GRANT ALL PRIVILEGES ON core_db.* TO 'core_user'@'%';

-- Media Service 계정
CREATE USER IF NOT EXISTS 'media_user'@'%' IDENTIFIED BY 'media_password';
GRANT ALL PRIVILEGES ON media_db.* TO 'media_user'@'%';

FLUSH PRIVILEGES;
```

---

### 5.2 k3s 배포 (운영 환경)

**k3s 설치:**
```bash
# k3s 설치 (단일 노드)
curl -sfL https://get.k3s.io | sh -

# 상태 확인
sudo k3s kubectl get nodes
```

**MySQL Deployment:**
```yaml
# mysql-deployment.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: root-password
        ports:
        - containerPort: 3306
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        volumeMounts:
        - name: mysql-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-storage
        persistentVolumeClaim:
          claimName: mysql-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  ports:
  - port: 3306
  selector:
    app: mysql
```

**Redis Deployment:**
```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7.0-alpine
        args: ["--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  ports:
  - port: 6379
  selector:
    app: redis
```

**LiveKit Deployment:**
```yaml
# livekit-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: livekit
spec:
  replicas: 1
  selector:
    matchLabels:
      app: livekit
  template:
    metadata:
      labels:
        app: livekit
    spec:
      containers:
      - name: livekit
        image: livekit/livekit-server:latest
        args: ["--config", "/etc/livekit.yaml"]
        ports:
        - containerPort: 7880
        - containerPort: 7881
        - containerPort: 7882
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: livekit-config
          mountPath: /etc/livekit.yaml
          subPath: livekit.yaml
        - name: recordings
          mountPath: /recordings
      volumes:
      - name: livekit-config
        configMap:
          name: livekit-config
      - name: recordings
        persistentVolumeClaim:
          claimName: recordings-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: livekit
spec:
  type: NodePort
  ports:
  - name: http
    port: 7880
    nodePort: 30880
  - name: rtc-tcp
    port: 7881
    nodePort: 30881
  selector:
    app: livekit
```

**Spring Boot Application Deployment 예시:**
```yaml
# core-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: core-service
  template:
    metadata:
      labels:
        app: core-service
    spec:
      containers:
      - name: core-service
        image: onetakestudio/core-service:latest
        ports:
        - containerPort: 8081
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: MYSQL_HOST
          value: "mysql"
        - name: REDIS_HOST
          value: "redis"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: core-service
spec:
  ports:
  - port: 8081
  selector:
    app: core-service
```

**배포 명령어:**
```bash
# Secret 생성
kubectl create secret generic mysql-secret \
  --from-literal=root-password=yourpassword

# ConfigMap 생성
kubectl create configmap livekit-config --from-file=livekit.yaml

# 배포
kubectl apply -f mysql-deployment.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f livekit-deployment.yaml
kubectl apply -f core-service-deployment.yaml
kubectl apply -f media-service-deployment.yaml
kubectl apply -f api-gateway-deployment.yaml

# 상태 확인
kubectl get pods
kubectl get services
```

---

## 6. 환경별 리소스 권장 사양

### 6.1 t3.xlarge 리소스 분배 (권장)

**EC2 사양:** t3.xlarge (4 vCPU, 16GB RAM)

| 구성요소 | CPU | RAM | 비고 |
|---------|-----|-----|------|
| k3s (Control Plane) | 0.5 | 512MB | 경량 쿠버네티스 |
| MySQL | 0.5 | 1GB | core_db + media_db |
| Redis | 0.2 | 256MB | 캐시 + 메시지 큐 |
| LiveKit + Egress | 1.0 | 2GB | 녹화 시 증가 |
| Core Service | 0.3 | 512MB | Spring Boot |
| Media Service | 0.3 | 512MB | Spring Boot |
| API Gateway | 0.2 | 256MB | Spring Cloud Gateway |
| Eureka Server | 0.2 | 256MB | 서비스 디스커버리 |
| Jenkins | 0.5 | 2GB | CI/CD (빌드 시 증가) |
| **합계** | **~3.7** | **~7.3GB** | |
| **여유** | **~0.3** | **~8.7GB** | 버퍼 공간 |

### 6.2 환경별 권장 사양

| 환경 | 인스턴스 | 저장소 | Jenkins |
|------|---------|--------|---------|
| 개발/테스트 | t3.large (2 vCPU, 8GB) | 30GB | 미포함 |
| 운영 (권장) | t3.xlarge (4 vCPU, 16GB) | 50GB+ | 포함 |
| 운영 (고성능) | t3.2xlarge (8 vCPU, 32GB) | 100GB+ | 포함 |

### 6.3 리소스 사용 주의사항

| 상황 | 예상 리소스 사용 | 권장 조치 |
|------|-----------------|----------|
| 평상시 | CPU 30%, RAM 45% | - |
| Egress 녹화 중 | CPU 60%, RAM 55% | 동시 녹화 2개 이하 |
| Jenkins 빌드 중 | CPU 70%, RAM 60% | Egress와 시간 분리 |
| 녹화 + 빌드 동시 | CPU 90%+, RAM 70% | 피크타임 회피 권장 |

### 6.4 Egress 사용 시 추가 고려사항

| 기능 | 추가 리소스 | 설명 |
|------|------------|------|
| 녹화 (Recording) | CPU +1코어, RAM +512MB | 실시간 인코딩 |
| RTMP 송출 | 업로드 대역폭 3-6 Mbps | 720p 기준 |
| 동시 Egress | 작업당 리소스 배수 | 동시 녹화 수 제한 권장 |

---

## 7. 체크리스트

### 인프라 준비 체크리스트

**EC2 인스턴스:**
- [ ] EC2 인스턴스 생성 (t3.xlarge 권장)
- [ ] 보안 그룹 설정 (포트 개방)
  - [ ] 22 (SSH)
  - [ ] 80/443 (HTTP/HTTPS)
  - [ ] 6443 (k3s API Server)
  - [ ] 30000-32767 (k3s NodePort)
  - [ ] 7880-7882 (LiveKit TCP)
  - [ ] 50000-60000 (LiveKit UDP)

**k3s 설치:**
- [ ] k3s 설치 (`curl -sfL https://get.k3s.io | sh -`)
- [ ] kubectl 설정 확인
- [ ] 노드 상태 확인 (`kubectl get nodes`)

**인프라 Pod 배포:**
- [ ] MySQL Secret 생성
- [ ] MySQL Deployment 배포
- [ ] MySQL 초기 설정 (DB 생성, 계정 생성)
- [ ] Redis Deployment 배포
- [ ] LiveKit ConfigMap 생성
- [ ] LiveKit Deployment 배포

**애플리케이션 배포:**
- [ ] Docker 이미지 빌드 및 레지스트리 푸시
- [ ] Core Service Deployment 배포
- [ ] Media Service Deployment 배포
- [ ] API Gateway Deployment 배포
- [ ] Eureka Server Deployment 배포

**CI/CD (선택):**
- [ ] Jenkins Deployment 배포
- [ ] Jenkins 초기 설정
- [ ] 파이프라인 구성

**검증:**
- [ ] 모든 Pod Running 상태 확인
- [ ] 서비스 간 통신 테스트
- [ ] API 호출 테스트

### 환경변수 목록

```bash
# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
CORE_DB_NAME=core_db
CORE_DB_USER=core_user
CORE_DB_PASSWORD=core_password
MEDIA_DB_NAME=media_db
MEDIA_DB_USER=media_user
MEDIA_DB_PASSWORD=media_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# LiveKit
LIVEKIT_HOST=localhost
LIVEKIT_PORT=7880
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# LiveKit Egress (녹화/스트리밍)
RECORDINGS_PATH=/recordings           # 로컬 저장 경로
# S3_ACCESS_KEY=your-s3-access-key    # S3 사용 시
# S3_SECRET_KEY=your-s3-secret-key    # S3 사용 시
# S3_BUCKET=onetakestudio-recordings  # S3 사용 시
# S3_REGION=ap-northeast-2            # S3 사용 시

# JWT
JWT_SECRET=your-jwt-secret-key

# Email (SMTP)
MAIL_HOST=smtp.naver.com
MAIL_PORT=465
MAIL_USERNAME=your-email@naver.com
MAIL_PASSWORD=your-email-password
```

---

## 8. 요약

| 항목 | 내용 |
|------|------|
| 아키텍처 | MSA (Core Service + Media Service) |
| 오케스트레이션 | k3s (경량 Kubernetes) |
| 인프라 구성요소 | MySQL, Redis, LiveKit, Jenkins(선택) |
| DB 전략 | 단일 MySQL, 논리적 DB 분리 |
| 메시지 큐 | Redis Streams (RabbitMQ 대체) |
| 녹화/송출 | LiveKit Egress (별도 서버 불필요) |
| CI/CD | Jenkins (k3s 내 Pod로 배포) |
| **권장 사양** | **t3.xlarge (4 vCPU, 16GB RAM)** |
| 저장소 | 50GB+ SSD (녹화는 S3 권장) |

---

## 9. 문의

백엔드 관련 문의사항은 백엔드 팀에 연락해주세요.

---

*작성일: 2026-01-26*
*버전: 1.0*
