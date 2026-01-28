# Destination API 개발 중 발생한 오류와 해결 과정

이 문서는 Destination API 테스트 중 발생한 오류들을 정리한 것입니다.
비개발자도 이해할 수 있도록 쉽게 설명합니다.

---

## 목차
1. [Lombok 설정 오류](#1-lombok-설정-오류)
2. [CORS 정책 오류](#2-cors-정책-오류)
3. [데이터베이스 컬럼 누락 오류](#3-데이터베이스-컬럼-누락-오류)
4. [사용자 ID 타입 불일치 오류](#4-사용자-id-타입-불일치-오류)

---

## 1. Lombok 설정 오류

### 오류 메시지
```
java: cannot infer type arguments for com.onetake.media.global.common.ApiResponse<>
  reason: cannot infer type-variable(s) T
    (actual and formal argument lists differ in length)
```

### 오류 메시지 읽는 법
| 키워드 | 의미 |
|--------|------|
| `cannot infer type arguments` | 타입을 추론할 수 없다 |
| `argument lists differ in length` | 인자(파라미터) 개수가 맞지 않다 |

**쉬운 해석**: "생성자를 호출했는데, 필요한 인자 개수와 실제 전달한 인자 개수가 다르다"

### 원인
프로젝트에서 **Lombok**이라는 도구를 사용합니다. Lombok은 반복적인 코드를 자동으로 생성해주는 도구입니다.

예를 들어, `@AllArgsConstructor`라는 표시를 붙이면 "모든 필드를 받는 생성자"를 자동으로 만들어줍니다.

```java
@AllArgsConstructor  // 이 표시가 있으면
public class ApiResponse<T> {
    private final boolean success;
    private final String message;
    private final T data;

    // 아래 코드가 자동 생성됨:
    // public ApiResponse(boolean success, String message, T data) { ... }
}
```

**문제**: 설정 파일(pom.xml)에서 Lombok의 **버전 번호**가 누락되어 있었습니다.
버전이 없으니 Maven(빌드 도구)이 Lombok을 찾지 못했고, 생성자가 만들어지지 않았습니다.

### 해결 방법
`media-service/pom.xml` 파일에 버전 추가:

```xml
<!-- 수정 전 -->
<annotationProcessorPaths>
    <path>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <!-- 버전이 없음! -->
    </path>
</annotationProcessorPaths>

<!-- 수정 후 -->
<annotationProcessorPaths>
    <path>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>${lombok.version}</version>  <!-- 버전 추가 -->
    </path>
</annotationProcessorPaths>
```

---

## 2. CORS 정책 오류

### 오류 메시지
```
Access to fetch at 'http://localhost:8080/api/auth/check-email' from origin 'null'
has been blocked by CORS policy: Response to preflight request doesn't pass
access control check: No 'Access-Control-Allow-Origin' header is present
```

### 오류 메시지 읽는 법
| 키워드 | 의미 |
|--------|------|
| `CORS policy` | 브라우저 보안 정책 |
| `origin 'null'` | 요청을 보낸 곳의 주소가 'null' |
| `Access-Control-Allow-Origin` | 접근을 허용하는 주소 목록 |
| `blocked` | 차단됨 |

**쉬운 해석**: "브라우저가 보안상의 이유로 요청을 차단했다"

### 원인
**CORS (Cross-Origin Resource Sharing)** 는 브라우저의 보안 기능입니다.

```
상황 설명:

[HTML 파일]                    [API 서버]
C:\test.html         →        localhost:8080
(origin: null)
       ↓
   "나는 null에서 왔어"
       ↓
[서버가 확인]
"허용된 목록: localhost:3000, localhost:8080"
"null은 목록에 없네... 차단!"
```

HTML 파일을 더블클릭해서 열면 브라우저는 주소를 `null`로 인식합니다.
서버는 `localhost:3000`과 `localhost:8080`만 허용하도록 설정되어 있어서 차단된 것입니다.

### 해결 방법
`SecurityConfig.java`에서 모든 주소를 허용하도록 변경:

```java
// 수정 전: 특정 주소만 허용
configuration.setAllowedOrigins(List.of(
    "http://localhost:3000",
    "http://localhost:8080"
));

// 수정 후: 모든 주소 허용 (개발 환경용)
configuration.setAllowedOriginPatterns(List.of("*"));
```

> **주의**: `*`는 모든 주소를 허용한다는 뜻입니다.
> 개발할 때는 편리하지만, 실제 서비스에서는 보안상 위험할 수 있습니다.

---

## 3. 데이터베이스 컬럼 누락 오류

### 오류 메시지
```
org.springframework.orm.jpa.JpaSystemException: could not execute statement
[Field 'username' doesn't have a default value]
[insert into users (created_at,email,email_verified,is_active,nickname,password,
profile_image_url,provider,provider_id,updated_at,user_id) values (?,?,?,?,?,?,?,?,?,?,?)]
```

### 오류 메시지 읽는 법
| 키워드 | 의미 |
|--------|------|
| `could not execute statement` | SQL 명령을 실행할 수 없다 |
| `Field 'username' doesn't have a default value` | username 필드에 기본값이 없다 |
| `insert into users` | users 테이블에 데이터를 넣으려 함 |

**쉬운 해석**: "users 테이블에 데이터를 저장하려는데, username 값을 안 줬고 기본값도 없어서 실패했다"

### 원인
**데이터베이스**와 **프로그램 코드**가 서로 다른 구조를 갖고 있었습니다.

```
[데이터베이스 테이블]          [프로그램 코드]
users 테이블                   User 클래스
├── id                        ├── id
├── username ← 이게 있음!     ├── (username 없음!)
├── email                     ├── email
├── nickname                  ├── nickname
└── ...                       └── ...
```

프로그램은 `username`을 모르는데, 데이터베이스는 `username`이 필수라서 오류가 발생했습니다.

### 해결 방법
설계 문서(ERD)를 확인해보니 `username`은 원래 없어야 할 컬럼이었습니다.
데이터베이스에서 해당 컬럼을 삭제했습니다:

```sql
ALTER TABLE users DROP COLUMN username;
```

> **교훈**: 데이터베이스 구조와 프로그램 코드 구조는 항상 일치해야 합니다.

---

## 4. 사용자 ID 타입 불일치 오류

### 오류 메시지
```
java.lang.NumberFormatException: For input string: "de91924d-bf09-4c8a-b9f0-e7f1d487eaa3"
    at java.base/java.lang.Long.parseLong(Long.java:709)
    at com.onetake.core.security.JwtAuthenticationFilter.doFilterInternal(JwtAuthenticationFilter.java:33)
```

### 오류 메시지 읽는 법
| 키워드 | 의미 |
|--------|------|
| `NumberFormatException` | 숫자 형식 오류 |
| `For input string: "de91924d-..."` | 이 문자열을 변환하려다 실패 |
| `Long.parseLong` | Long(큰 정수) 타입으로 변환 시도 |

**쉬운 해석**: "de91924d-bf09-... 라는 문자열을 숫자로 바꾸려고 했는데 실패했다"

### 원인
시스템에서 사용자를 식별하는 방법이 2가지 있습니다:

| 구분 | 내부 ID | 외부 ID |
|------|---------|---------|
| 형태 | 숫자 (1, 2, 3...) | UUID (de91924d-bf09-...) |
| 용도 | 데이터베이스 조회 | 외부 노출 (보안) |
| 타입 | Long | String |

```
문제 상황:

[JWT 토큰]                           [프로그램 코드]
userId: "de91924d-bf09-..."    →    Long userId = Long.valueOf(...)
        (UUID 문자열)                       ↓
                                    "문자열을 숫자로 바꿀 수 없어!" 💥
```

JWT 토큰에는 외부용 UUID가 저장되어 있는데,
프로그램은 이것을 숫자(Long)로 바꾸려고 해서 오류가 발생했습니다.

### 해결 방법
프로그램 코드를 수정하여 UUID 문자열을 그대로 사용하도록 변경:

```java
// 수정 전: UUID를 숫자로 바꾸려고 시도
Long userId = Long.valueOf(jwtUtil.getUserId(token));

// 수정 후: UUID를 문자열 그대로 사용
String userId = jwtUtil.getUserId(token);
```

관련된 다른 파일들도 함께 수정:
- `CustomUserDetails.java`: userId 타입을 Long → String으로 변경
- `UserService.java`: findById() → findByUserId()로 변경
- `DestinationService.java`: 외부 UUID로 사용자 조회 후 내부 ID 사용

---

## 정리: 오류 메시지 읽는 팁

### 1. 핵심 키워드 찾기
오류 메시지에서 가장 중요한 부분을 찾습니다:
- `cannot`, `failed`, `error`, `exception` → 무엇이 실패했는지
- 파일명과 줄 번호 → 어디서 발생했는지

### 2. 오류 타입 이해하기
| 오류 타입 | 의미 |
|-----------|------|
| `NullPointerException` | 없는 것을 사용하려 함 |
| `NumberFormatException` | 숫자 변환 실패 |
| `SQLException` | 데이터베이스 관련 문제 |
| `IOException` | 파일/네트워크 문제 |

### 3. 스택 트레이스 읽기
```
오류메시지
    at 클래스.메서드(파일명:줄번호)  ← 여기서 발생
    at 클래스.메서드(파일명:줄번호)  ← 이 메서드가 호출
    at 클래스.메서드(파일명:줄번호)  ← 이 메서드가 호출
```
가장 위에 있는 줄이 실제 오류가 발생한 위치입니다.

---

## 문서 정보
- 작성일: 2026-01-27
- 관련 API: Destination API (채널 연동)
- 테스트 환경: core-service (Spring Boot 3.5.9)
