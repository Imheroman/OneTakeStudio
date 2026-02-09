# Lombok 컴파일 오류 해결 가이드

> 작성일: 2026-01-28

---

## 문제 상황

프로젝트 빌드(컴파일) 시 다음과 같은 오류 발생:

```
cannot find symbol
  symbol:   method builder()
  location: class com.onetake.common.dto.ApiResponse
```

`@Builder`, `@Getter` 등 Lombok 어노테이션이 작동하지 않음

---

## 원인 (쉬운 설명)

**Lombok**이라는 도구는 "자동 코드 생성기"입니다.

개발자가 `@Builder`라는 표시만 붙여두면, Lombok이 알아서 필요한 코드를 만들어줍니다.
마치 **"여기에 문 달아주세요"라고 메모만 붙여두면 자동으로 문이 설치되는 것**과 같습니다.

**문제는:**
- 메모(`@Builder`)는 붙여뒀는데
- 실제로 문을 설치해주는 작업자(Lombok annotation processor)가 **현장에 배치되지 않았던 것**

그래서 컴파일러가 "문이 없는데요?" 하고 오류를 낸 겁니다.

---

## 원인 (기술적 설명)

Maven 멀티 모듈 프로젝트에서 `maven-compiler-plugin`의 `annotationProcessorPaths` 설정이 누락되어 Lombok annotation processor가 컴파일 시점에 실행되지 않았음.

부모 `pom.xml`에 Lombok 의존성이 있더라도, 각 모듈에서 annotation processor 경로를 명시하지 않으면 작동하지 않을 수 있음.

---

## 해결책

각 모듈의 `pom.xml`에 다음 설정 추가:

### 1. Lombok 의존성 추가 (없는 경우)

```xml
<dependencies>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### 2. maven-compiler-plugin 설정 추가

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                        <version>${lombok.version}</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
    </plugins>
</build>
```

> `${lombok.version}`은 Spring Boot Parent POM에서 관리하는 버전을 사용합니다.

---

## 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `common/pom.xml` | Lombok 의존성 + annotation processor 설정 추가 |
| `core-service/pom.xml` | annotation processor 설정 추가 |

---

## 요약

| 항목 | 내용 |
|------|------|
| **문제** | Lombok 자동 코드 생성이 안 됨 |
| **원인** | annotation processor 설정 누락 |
| **해결** | `pom.xml`에 `annotationProcessorPaths` 설정 추가 |
| **관련 커밋** | `fix(build): Lombok annotation processor 설정 추가로 컴파일 오류 해결` |

---

## 참고

- 이 문제는 주로 Maven 멀티 모듈 프로젝트에서 발생
- IntelliJ IDEA에서는 정상 작동하지만 Maven CLI 빌드에서만 실패하는 경우가 많음
- Java 21 이상에서 Lombok 사용 시 `sun.misc.Unsafe` 관련 경고가 발생할 수 있으나, 컴파일에는 영향 없음
