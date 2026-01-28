# 코드 리팩토링 분석 보고서

> 작성일: 2026-01-28  
> Studio 관련 코드의 과설계 및 중복 코드 분석

## 🔍 발견된 문제점

### 1. 중복 필드: `name`과 `title` ⚠️ **높은 우선순위**

**위치**: `Studio` 엔티티, `CreateStudioRequest` DTO

**문제점**:
- `Studio` 엔티티에 `name`과 `title` 필드가 둘 다 NOT NULL로 존재
- 실제로는 항상 같은 값으로 설정됨 (`StudioService.createStudio()`에서 확인)
- `CreateStudioRequest`에서 둘 다 받지만 `getEffectiveName()`으로 하나만 사용
- 데이터베이스에 불필요한 중복 저장

**현재 코드**:
```java
// Studio.java
@Column(nullable = false, length = 100)
private String name;

@Column(nullable = false, length = 100)
private String title;

// StudioService.java
Studio studio = Studio.builder()
    .name(studioName)
    .title(studioName) // 항상 같은 값
    .build();

// CreateStudioRequest.java
public String getEffectiveName() {
    if (name != null && !name.isBlank()) {
        return name;
    }
    if (title != null && !title.isBlank()) {
        return title;
    }
    return null;
}
```

**권장 해결책**:
1. **옵션 A (권장)**: `title` 필드 제거, `name`만 사용
   - 데이터베이스에서 `title` 컬럼 제거
   - `CreateStudioRequest`에서 `title` 필드 제거
   - `getEffectiveName()` 메서드 제거, `name`만 사용

2. **옵션 B**: `name` 필드 제거, `title`만 사용
   - 프론트엔드가 `title`을 사용한다면 이 방법

**영향 범위**:
- `Studio` 엔티티
- `CreateStudioRequest` DTO
- `StudioService.createStudio()` 메서드
- 데이터베이스 마이그레이션 필요

---

### 2. 중복 필드: `owner_id`와 `host_user_id` ⚠️ **중간 우선순위**

**위치**: `Studio` 엔티티

**문제점**:
- `owner_id`와 `host_user_id`가 둘 다 NOT NULL로 존재
- 실제로는 항상 같은 값으로 설정됨
- `StudioService.createStudio()`에서 확인: `hostUserId(internalUserId)`와 `ownerId(internalUserId)`

**현재 코드**:
```java
// Studio.java
@Column(name = "owner_id", nullable = false)
private Long ownerId;

@Column(name = "host_user_id", nullable = false)
private Long hostUserId;

// StudioService.java
Studio studio = Studio.builder()
    .ownerId(internalUserId)
    .hostUserId(internalUserId) // 항상 같은 값
    .build();
```

**권장 해결책**:
1. **옵션 A (권장)**: `host_user_id` 필드 제거, `owner_id`만 사용
   - 데이터베이스에서 `host_user_id` 컬럼 제거
   - 모든 곳에서 `ownerId`만 사용

2. **옵션 B**: `owner_id` 필드 제거, `host_user_id`만 사용
   - 만약 향후 호스트가 소유자와 다를 수 있다면 이 방법

**영향 범위**:
- `Studio` 엔티티
- `StudioService.createStudio()` 메서드
- 데이터베이스 마이그레이션 필요

---

### 3. 중복 메서드: `StudioDetailResponse.from()` ⚠️ **낮은 우선순위**

**위치**: `StudioDetailResponse` DTO

**문제점**:
- `from(Studio studio)`와 `from(Studio studio, List, List)` 두 오버로드 존재
- 첫 번째 메서드는 `members`와 `scenes`를 null로 설정 (사용하지 않음)
- 두 메서드에서 많은 필드 매핑 코드가 중복됨

**현재 코드**:
```java
// StudioDetailResponse.java
public static StudioDetailResponse from(Studio studio, List<StudioMemberResponse> members, List<SceneResponse> scenes) {
    return StudioDetailResponse.builder()
        .studioId(studio.getId())
        .name(studio.getName())
        .description(studio.getDescription())
        .thumbnail(studio.getThumbnail())
        .template(studio.getTemplate())
        .status(studio.getStatus().name().toLowerCase())
        .joinUrl("https://studio.example.com/join/" + studio.getStudioId())
        .members(members)
        .scenes(scenes)
        .createdAt(studio.getCreatedAt())
        .updatedAt(studio.getUpdatedAt())
        .build();
}

public static StudioDetailResponse from(Studio studio) {
    return StudioDetailResponse.builder()
        .studioId(studio.getId())
        .name(studio.getName())
        .description(studio.getDescription())
        .thumbnail(studio.getThumbnail())
        .template(studio.getTemplate())
        .status(studio.getStatus().name().toLowerCase())
        .joinUrl("https://studio.example.com/join/" + studio.getStudioId())
        // members와 scenes가 null
        .createdAt(studio.getCreatedAt())
        .updatedAt(studio.getUpdatedAt())
        .build();
}
```

**권장 해결책**:
- 첫 번째 오버로드를 기본으로 사용하고, 두 번째는 첫 번째를 호출하도록 리팩토링:
```java
public static StudioDetailResponse from(Studio studio) {
    return from(studio, List.of(), List.of());
}
```

**영향 범위**:
- `StudioDetailResponse` DTO
- `StudioService.updateStudio()` 메서드 (현재 두 번째 오버로드 사용)

---

### 4. 사용하지 않는 필드: `CreateStudioRequest` ⚠️ **낮은 우선순위**

**위치**: `CreateStudioRequest` DTO

**문제점**:
- `transmissionType`, `storageLocation`, `platforms` 필드가 정의되어 있지만 사용되지 않음
- 프론트엔드에서 전송하지만 백엔드에서 무시됨

**현재 코드**:
```java
// CreateStudioRequest.java
private String transmissionType;
private String storageLocation;
private List<String> platforms;

// StudioService.java - 사용되지 않음
Studio studio = Studio.builder()
    .name(studioName)
    .title(studioName)
    .description(request.getDescription())
    .template(request.getTemplate())
    // transmissionType, storageLocation, platforms는 사용되지 않음
    .build();
```

**권장 해결책**:
1. **옵션 A**: 필드 제거 (프론트엔드도 수정 필요)
2. **옵션 B**: 향후 사용 예정이라면 주석으로 표시

**영향 범위**:
- `CreateStudioRequest` DTO
- 프론트엔드 `StudioCreation.tsx` (필드 제거 시)

---

### 5. 하드코딩된 URL: `joinUrl` ⚠️ **낮은 우선순위**

**위치**: `StudioDetailResponse.from()`

**문제점**:
- `joinUrl`이 하드코딩된 예시 URL로 생성됨
- 실제 환경에 맞지 않음

**현재 코드**:
```java
.joinUrl("https://studio.example.com/join/" + studio.getStudioId())
```

**권장 해결책**:
- 환경 변수나 설정 파일에서 URL 가져오기
- 또는 실제 구현 시 동적으로 생성

---

## 📊 우선순위별 정리

### 높은 우선순위 (즉시 리팩토링 권장)
1. ✅ **`name`과 `title` 중복 필드 제거**
   - 데이터베이스 스키마 정리
   - 코드 단순화
   - 저장 공간 절약

### 중간 우선순위 (계획된 리팩토링)
2. ✅ **`owner_id`와 `host_user_id` 중복 필드 제거**
   - 현재는 항상 같은 값이지만, 향후 호스트 변경 가능성 고려 필요

### 낮은 우선순위 (코드 품질 개선)
3. ✅ **`StudioDetailResponse.from()` 중복 코드 제거**
4. ✅ **사용하지 않는 필드 제거**
5. ✅ **하드코딩된 URL 설정화**

---

## 🔧 리팩토링 계획

### Phase 1: `name`과 `title` 통합 (권장)

**작업 내용**:
1. 데이터베이스에서 `title` 컬럼 제거 (마이그레이션)
2. `Studio` 엔티티에서 `title` 필드 제거
3. `CreateStudioRequest`에서 `title` 필드 제거, `getEffectiveName()` 제거
4. `StudioService.createStudio()`에서 `title` 설정 제거
5. 프론트엔드에서 `title` 대신 `name` 사용

**예상 효과**:
- 데이터베이스 저장 공간 절약
- 코드 단순화
- 유지보수성 향상

### Phase 2: `owner_id`와 `host_user_id` 통합 (검토 필요)

**작업 내용**:
1. 향후 요구사항 확인 (호스트가 소유자와 다를 수 있는지)
2. 다를 수 없다면 `host_user_id` 제거
3. 다를 수 있다면 현재 설계 유지

**주의사항**:
- 비즈니스 로직 변경 가능성 확인 필요

---

## 📝 결론

현재 코드에서 가장 큰 문제는 **`name`과 `title` 필드의 중복**입니다. 이는 즉시 리팩토링을 권장합니다.

나머지 문제들은 우선순위가 낮거나 비즈니스 요구사항에 따라 결정해야 합니다.
