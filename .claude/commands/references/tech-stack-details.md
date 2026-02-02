# 기술 스택 상세 가이드

## 목차
1. [Backend (Spring Boot)](#backend-spring-boot)
2. [Frontend (React/Next.js)](#frontend-reactnextjs)
3. [AI Service (Python/FastAPI)](#ai-service-pythonfastapi)
4. [Infrastructure](#infrastructure)
5. [개발 환경 설정](#개발-환경-설정)

---

## Backend (Spring Boot)

### Core Dependencies

#### pom.xml (부모 POM)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.9</version>
        <relativePath/>
    </parent>
    
    <groupId>com.onetake</groupId>
    <artifactId>onetake-studio-backend</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>
    
    <name>OneTakeStudio Backend</name>
    <description>OneTakeStudio MSA Backend Services</description>
    
    <modules>
        <module>common</module>
        <module>core-service</module>
        <module>media-service</module>
        <module>eureka-server</module>
        <module>api-gateway</module>
    </modules>

    <properties>
        <java.version>21</java.version>
        <spring-cloud.version>2025.0.0</spring-cloud.version>
    </properties>
    
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

---

### Eureka Server (Service Discovery)

#### eureka-server/pom.xml
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
    </dependency>
</dependencies>
```

#### application.yml
```yaml
server:
  port: 8761

spring:
  application:
    name: eureka-server

eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
  server:
    enable-self-preservation: false
```

#### EurekaServerApplication.java
```java
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

---

### API Gateway

#### api-gateway/pom.xml
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-gateway</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.5</version>
    </dependency>
</dependencies>
```

#### application.yml
```yaml
server:
  port: 60000

spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      server:
        webflux:
          discovery:
            locator:
              enabled: true
              lower-case-service-id: true
          routes:
            # Core Service Routes
            - id: core-service
              uri: lb://core-service
              predicates:
                - Path=/api/auth/**, /api/users/**, /api/studios/**, /api/workspace/**, /api/notifications/**, /api/destinations/**, /api/dashboard
              filters:
                - StripPrefix=0

            # Media Service Routes
            - id: media-service
              uri: lb://media-service
              predicates:
                - Path=/api/v1/media/**
              filters:
                - StripPrefix=0

            # Media Service - Stream Routes
            - id: media-service-stream
              uri: lb://media-service
              predicates:
                - Path=/api/streams/**
              filters:
                - RewritePath=/api/streams/(?<segment>.*), /api/v1/media/stream/${segment}

            # Media Service - Recording Routes
            - id: media-service-recording
              uri: lb://media-service
              predicates:
                - Path=/api/recordings/**
              filters:
                - RewritePath=/api/recordings/(?<segment>.*), /api/v1/media/record/${segment}

            # Media Service - Publish Routes
            - id: media-service-publish
              uri: lb://media-service
              predicates:
                - Path=/api/publish/**
              filters:
                - RewritePath=/api/publish/(?<segment>.*), /api/v1/media/publish/${segment}

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

---

### Core Service

#### core-service/pom.xml
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-amqp</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-openfeign</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
    </dependency>
    <dependency>
        <groupId>com.auth0</groupId>
        <artifactId>java-jwt</artifactId>
        <version>4.4.0</version>
    </dependency>
    <!-- Resilience4j (Circuit Breaker) -->
    <dependency>
        <groupId>io.github.resilience4j</groupId>
        <artifactId>resilience4j-spring-boot3</artifactId>
    </dependency>
    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

#### application.yml
```yaml
server:
  port: 8080

spring:
  application:
    name: core-service
  
  datasource:
    url: jdbc:mysql://localhost:3306/onetake_core?useSSL=false&serverTimezone=UTC
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true
  
  rabbitmq:
    host: localhost
    port: 5672
    username: admin
    password: admin
  
  redis:
    host: localhost
    port: 6379

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/

jwt:
  secret: ${JWT_SECRET:your-secret-key-change-in-production}
  access-token-expiration: 3600000    # 1시간
  refresh-token-expiration: 604800000 # 7일

resilience4j:
  circuitbreaker:
    instances:
      mediaService:
        register-health-indicator: true
        sliding-window-size: 10
        minimum-number-of-calls: 5
        permitted-number-of-calls-in-half-open-state: 3
        wait-duration-in-open-state: 10s
        failure-rate-threshold: 50
```

---

### Media Service

#### media-service/pom.xml
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-amqp</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
    </dependency>
    <!-- AWS S3 -->
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>s3</artifactId>
    </dependency>
    <!-- WebRTC (예시) -->
    <dependency>
        <groupId>io.socket</groupId>
        <artifactId>socket.io-client</artifactId>
        <version>2.1.0</version>
    </dependency>
</dependencies>
```

#### application.yml
```yaml
server:
  port: 8081

spring:
  application:
    name: media-service
  
  datasource:
    url: jdbc:postgresql://localhost:5432/onetake_media
    username: postgres
    password: postgres
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
  
  rabbitmq:
    host: localhost
    port: 5672
    username: admin
    password: admin
  
  redis:
    host: localhost
    port: 6379

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/

aws:
  s3:
    bucket: onetake-media
    region: ap-northeast-2
  access-key: ${AWS_ACCESS_KEY}
  secret-key: ${AWS_SECRET_KEY}
```

---

## Frontend (React/Next.js)

### package.json
```json
{
  "name": "onetake-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.6.0",
    "zustand": "^4.4.0",
    "react-query": "^3.39.0",
    "@mui/material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "recharts": "^2.10.0",
    "react-player": "^2.14.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### WebRTC Setup
```typescript
// services/webrtc.ts
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  async startStream(studioId: string) {
    // 미디어 디바이스 접근
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    // ICE 서버 정보 가져오기
    const iceServers = await this.fetchIceServers();

    // RTCPeerConnection 생성
    this.peerConnection = new RTCPeerConnection({ iceServers });

    // 스트림 추가
    stream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, stream);
    });

    // ICE Candidate 이벤트 처리
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          studioId,
          candidate: event.candidate
        });
      }
    };

    // Offer 생성
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Signaling Server에 Offer 전송
    this.socket.emit('webrtc-offer', { studioId, offer });
  }

  private async fetchIceServers(): Promise<RTCIceServer[]> {
    const response = await fetch('/api/media/ice-servers');
    const data = await response.json();
    return data.iceServers;
  }
}
```

---

## AI Service (Python/FastAPI)

### requirements.txt
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0
opencv-python==4.9.0
tensorflow==2.15.0
torch==2.1.0
openai-whisper==20231117
pika==1.3.2
redis==5.0.1
boto3==1.34.0
```

### main.py
```python
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import pika
import redis

app = FastAPI()

# RabbitMQ 연결
connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost')
)
channel = connection.channel()

# Redis 연결
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ShortsGenerateRequest(BaseModel):
    recording_id: int
    studio_id: int
    language: str = "ko"

@app.post("/ai/shorts/generate")
async def generate_shorts(request: ShortsGenerateRequest, background_tasks: BackgroundTasks):
    # 백그라운드 작업으로 AI 쇼츠 생성
    background_tasks.add_task(process_shorts_generation, request)
    
    job_id = f"shorts_{request.recording_id}"
    return {"job_id": job_id, "status": "processing"}

def process_shorts_generation(request: ShortsGenerateRequest):
    # 1. 채팅 데이터 수집
    chat_data = fetch_chat_data(request.recording_id)
    
    # 2. 하이라이트 타임스탬프 추출
    highlights = analyze_chat_frequency(chat_data)
    
    # 3. FFmpeg으로 영상 추출
    video_path = extract_video_clips(request.recording_id, highlights)
    
    # 4. STT & 자막 생성
    subtitles = generate_subtitles(video_path, request.language)
    
    # 5. S3 업로드
    s3_url = upload_to_s3(video_path)
    
    # 6. RabbitMQ 이벤트 발행
    publish_shorts_generated_event(request.recording_id, s3_url)
```

---

## Infrastructure

### Docker Compose (로컬 개발)
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: onetake_core
    volumes:
      - mysql_data:/var/lib/mysql

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: onetake_media
    volumes:
      - postgres_data:/var/lib/postgresql/data

  rabbitmq:
    image: rabbitmq:3.12-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx-rtmp:
    image: tiangolo/nginx-rtmp
    ports:
      - "1935:1935"
      - "8080:8080"

volumes:
  mysql_data:
  postgres_data:
```

---

## 개발 환경 설정

### 1. Java 21 설치
```bash
# macOS
brew install openjdk@21

# Ubuntu
sudo apt install openjdk-21-jdk
```

### 2. Maven 설정 확인
```bash
mvn -version
```

### 3. Node.js 18+ 설치
```bash
# nvm 사용
nvm install 18
nvm use 18
```

### 4. Docker 실행
```bash
docker-compose up -d
```

### 5. Spring Boot 서비스 실행
```bash
# Eureka Server
cd eureka-server
./mvnw spring-boot:run

# Gateway
cd gateway-service
./mvnw spring-boot:run

# Core Service
cd core-service
./mvnw spring-boot:run

# Media Service
cd media-service
./mvnw spring-boot:run
```

### 6. Frontend 실행
```bash
cd frontend
npm install
npm run dev
```

### 7. AI Service 실행
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

**이 문서는 OneTakeStudio의 기술 스택 상세 설정을 다룹니다.**
