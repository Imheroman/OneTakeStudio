# Studio Service 구현 문서

## 1. 개요

**Studio Service**는 OneTakeStudio에서 **방송 스튜디오를 관리**하는 핵심 기능입니다.

### 이 기능으로 할 수 있는 것

| 기능          | 설명                                            |
| ------------- | ----------------------------------------------- |
| 스튜디오 생성 | 새로운 방송 스튜디오를 만들 수 있습니다         |
| 스튜디오 관리 | 이름 변경, 썸네일 설정, 삭제가 가능합니다       |
| 멤버 초대     | 다른 사용자를 스튜디오에 초대할 수 있습니다     |
| 역할 관리     | 멤버의 권한(호스트/매니저)을 설정합니다         |
| 씬 관리       | 방송에 사용할 화면 구성(씬)을 만들고 관리합니다 |

---

## 2. 주요 개념 설명

### 스튜디오 (Studio)

> 방송을 진행하는 **가상의 방송실**입니다.

- 각 스튜디오는 고유한 ID를 가집니다
- 스튜디오를 만든 사람이 **호스트(소유자)**가 됩니다
- 상태: 준비중(READY) → 방송중(LIVE) → 종료(ENDED)

### 멤버 역할

| 역할                 | 권한                                                             |
| -------------------- | ---------------------------------------------------------------- |
| **호스트 (HOST)**    | 스튜디오 소유자. 모든 권한 보유. 삭제 가능                       |
| **매니저 (MANAGER)** | 장면 생성·추천, 스튜디오 설정 변경, 멤버 초대/강퇴, 씬 관리 가능 |

### 씬 (Scene)

> 방송 화면의 **레이아웃 구성**입니다.

- 예: "오프닝 화면", "인터뷰 화면", "엔딩 화면"
- 각 씬은 다른 레이아웃(PIP, 분할화면 등)을 가질 수 있습니다

---

## 3. 사용 흐름 (시나리오)

### 시나리오 1: 새 방송 준비하기

```
1. 사용자가 "새 스튜디오 만들기" 클릭
2. 스튜디오 이름 입력 (예: "주간 뉴스")
3. 스튜디오 생성 완료 → 사용자는 자동으로 "호스트"가 됨
4. 함께 방송할 동료를 이메일로 초대
5. 방송에 사용할 씬(화면 구성)을 추가
```

### 시나리오 2: 팀원과 협업하기

```
1. 호스트가 팀원 이메일로 초대 발송
2. 팀원이 초대 수락
3. 호스트가 팀원에게 "매니저" 권한 부여
4. 매니저도 씬 추가/수정 가능
```

---

## 4. API 목록 (개발자용)

### 스튜디오 API

| 기능               | 메서드 | URL                 |
| ------------------ | ------ | ------------------- |
| 스튜디오 생성      | POST   | `/api/studios`      |
| 내 스튜디오 목록   | GET    | `/api/studios`      |
| 스튜디오 상세 조회 | GET    | `/api/studios/{id}` |
| 스튜디오 수정      | PATCH  | `/api/studios/{id}` |
| 스튜디오 삭제      | DELETE | `/api/studios/{id}` |

### 멤버 API

| 기능      | 메서드 | URL                                         |
| --------- | ------ | ------------------------------------------- |
| 멤버 목록 | GET    | `/api/studios/{id}/members`                 |
| 멤버 초대 | POST   | `/api/studios/{id}/members/invite`          |
| 역할 변경 | PATCH  | `/api/studios/{id}/members/{memberId}`      |
| 멤버 강퇴 | POST   | `/api/studios/{id}/members/{memberId}/kick` |

### 씬 API

| 기능    | 메서드 | URL                                  |
| ------- | ------ | ------------------------------------ |
| 씬 목록 | GET    | `/api/studios/{id}/scenes`           |
| 씬 생성 | POST   | `/api/studios/{id}/scenes`           |
| 씬 수정 | PUT    | `/api/studios/{id}/scenes/{sceneId}` |
| 씬 삭제 | DELETE | `/api/studios/{id}/scenes/{sceneId}` |

---

## 5. 파일 구조

```
core-service/src/main/java/com/onetake/core/studio/
├── controller/          # API 요청 처리
│   ├── StudioController.java
│   ├── StudioMemberController.java
│   └── SceneController.java
├── service/             # 비즈니스 로직
│   ├── StudioService.java
│   ├── StudioMemberService.java
│   └── SceneService.java
├── entity/              # 데이터베이스 테이블
│   ├── Studio.java
│   ├── StudioMember.java
│   ├── MemberInvite.java
│   └── Scene.java
├── dto/                 # 요청/응답 데이터 형식
│   └── (12개 파일)
├── repository/          # 데이터베이스 접근
│   └── (4개 파일)
└── exception/           # 오류 처리
    └── (6개 파일)
```

**총 35개 파일** 구현 완료

---

## 6. 데이터베이스 테이블

### studios (스튜디오)

| 컬럼      | 설명                    |
| --------- | ----------------------- |
| id        | 고유 번호               |
| studio_id | 외부 공개용 ID (UUID)   |
| owner_id  | 소유자                  |
| name      | 스튜디오 이름           |
| status    | 상태 (READY/LIVE/ENDED) |

### studio_members (멤버)

| 컬럼      | 설명                |
| --------- | ------------------- |
| studio_id | 소속 스튜디오       |
| user_id   | 멤버 사용자         |
| role      | 역할 (HOST/MANAGER) |

### scenes (씬)

| 컬럼       | 설명                  |
| ---------- | --------------------- |
| studio_id  | 소속 스튜디오         |
| name       | 씬 이름               |
| layout     | 화면 구성 정보 (JSON) |
| sort_order | 정렬 순서             |

---

## 7. 테스트 방법

### 테스트 페이지 사용

1. `api-test-studio.html` 파일을 브라우저에서 열기
2. 로그인하여 토큰 획득
3. 각 API 버튼을 클릭하여 테스트

### 테스트 순서 (권장)

1. 로그인
2. 스튜디오 생성
3. 스튜디오 목록/상세 조회
4. 씬 생성
5. 멤버 초대
6. 수정/삭제 테스트

---

## 8. 응답 형식

### 성공 시

```json
{
  "resultCode": "SUCCESS",
  "success": true,
  "message": "스튜디오 생성 성공",
  "data": { ... }
}
```

### 실패 시

```json
{
  "resultCode": "FAILURE",
  "success": false,
  "message": "스튜디오를 찾을 수 없습니다",
  "errorCode": "STUDIO_NOT_FOUND"
}
```

---

## 9. 에러 코드 목록

| 에러 코드            | 의미                         | HTTP 상태 |
| -------------------- | ---------------------------- | --------- |
| STUDIO_NOT_FOUND     | 스튜디오를 찾을 수 없음      | 404       |
| STUDIO_ACCESS_DENIED | 접근 권한 없음               | 403       |
| STUDIO_IN_USE        | 스튜디오 사용 중 (삭제 불가) | 409       |
| MEMBER_NOT_FOUND     | 멤버를 찾을 수 없음          | 404       |
| INVALID_ROLE         | 유효하지 않은 역할           | 400       |
| SCENE_NOT_FOUND      | 씬을 찾을 수 없음            | 404       |

---

## 10. 연락처

구현 관련 문의: [담당자 이름]
