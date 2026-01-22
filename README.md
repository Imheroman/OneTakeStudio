# Git 커밋 컨벤션 가이드

> Conventional Commits 표준 기반

---

## 1. 개요

이 문서는 팀 내 Git 커밋 메시지 작성에 대한 표준을 정의합니다. 일관된 커밋 메시지는 코드 리뷰 효율성을 높이고, 자동화된 릴리즈 노트 생성 및 변경 이력 추적을 용이하게 합니다.

---

## 2. 커밋 메시지 구조

커밋 메시지는 **제목(Header)**, **본문(Body)**, **꼬리말(Footer)**로 구성되며, 각 영역은 빈 줄로 구분합니다.

```
<type>(<scope>): <subject>   ← 제목 (필수)
                             ← 빈 줄
<body>                       ← 본문 (선택)
                             ← 빈 줄
<footer>                     ← 꼬리말 (선택)
```

---

## 3. Type (타입)

커밋의 성격을 나타내는 필수 태그입니다.

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat: add user login feature` |
| `fix` | 버그 수정 | `fix: resolve null pointer exception` |
| `docs` | 문서 수정 (README, Wiki 등) | `docs: update API documentation` |
| `style` | 코드 포맷팅, 세미콜론 누락 등 (로직 변경 없음) | `style: fix indentation` |
| `refactor` | 코드 리팩토링 (기능 변경 없음) | `refactor: simplify validation logic` |
| `test` | 테스트 코드 추가/수정 | `test: add unit tests for auth` |
| `chore` | 빌드 업무, 패키지 매니저 설정 등 | `chore: update dependencies` |
| `perf` | 성능 개선 | `perf: optimize database queries` |
| `ci` | CI 설정 파일 수정 | `ci: add GitHub Actions workflow` |
| `build` | 빌드 시스템 또는 외부 종속성 변경 | `build: update webpack config` |
| `revert` | 이전 커밋 되돌리기 | `revert: revert commit abc123` |

---

## 4. 작성 규칙

### 4.1 제목 (Header)

| 항목 | 규칙 |
|------|------|
| **형식** | `type(scope): subject` |
| **언어** | 영문 소문자로 작성 권장 |
| **동사** | 명령문(Imperative mood) 사용 |
| **길이** | 50자 이내 권장 |
| **기타** | 문장 끝에 마침표(.) 금지 |

**동사 사용 예시:**
- ✅ `add`, `fix`, `update`, `remove`, `change`
- ❌ `added`, `fixed`, `updated` (과거형 사용 금지)

### 4.2 본문 (Body)

- **언어:** 한글 작성 권장 (복잡한 내용의 명확한 전달)
- **내용:** '무엇을', '왜' 변경했는지 상세히 작성 (어떻게는 코드로)
- **형식:** 72자마다 줄바꿈, 글머리 기호(`-`) 사용 가능

### 4.3 꼬리말 (Footer)

| 용도 | 키워드 |
|------|--------|
| 이슈 종결 | `Fixes: #123`, `Closes: #123`, `Resolves: #123` |
| 이슈 참조 | `Ref: #123`, `Related to: #123` |
| Breaking Change | `BREAKING CHANGE:` 로 시작하여 변경 사항 기술 |

---

## 5. Scope (범위)

변경 사항의 영향 범위를 나타냅니다. 프로젝트 구조에 맞게 팀에서 정의하여 사용합니다.

| Scope | 설명 |
|-------|------|
| `auth` | 인증/인가 관련 |
| `user` | 사용자 관리 관련 |
| `api` | API 엔드포인트 관련 |
| `ui` | 사용자 인터페이스 관련 |
| `db` | 데이터베이스 관련 |
| `config` | 설정 파일 관련 |
| `core` | 핵심 비즈니스 로직 |
| `common` | 공통 유틸리티, 헬퍼 함수 |

---

## 6. 자주 사용하는 동사

| 동사 | 용도 |
|------|------|
| `add` | 새 파일, 기능, 의존성 추가 |
| `remove` | 파일, 기능, 의존성 삭제 |
| `update` | 기존 기능 수정, 버전 업데이트 |
| `fix` | 버그, 오류 수정 |
| `refactor` | 코드 구조 개선 (동작 변경 없음) |
| `rename` | 파일, 변수, 함수명 변경 |
| `move` | 파일, 코드 위치 이동 |
| `improve` | 성능, 가독성 개선 |
| `implement` | 새 기능 구현 |
| `simplify` | 코드 단순화 |

---

## 7. 커밋 메시지 예시

### 7.1 좋은 예시

**기능 추가 (feat)**
```
feat(auth): add JWT token based authentication

- 로그인 성공 시 Access/Refresh Token 발급 로직 구현
- Redis를 사용하여 Refresh Token 관리
- 기존 세션 기반 인증 방식 Deprecated 처리

Resolves: #102
```

**버그 수정 (fix)**
```
fix(payment): handle negative amount error

- 결제 금액이 음수로 들어올 경우 500 에러 발생 문제 수정
- 유효성 검사 로직 추가 (0보다 큰 값만 허용)

Fixes: #45
```

**리팩토링 (refactor)**
```
refactor(user): simplify sign-up validation logic

- 복잡한 if-else 중첩 제거 및 Early Return 패턴 적용
- 가독성 향상을 위해 검증 로직을 별도 서비스로 분리
```

**Breaking Change**
```
feat(api)!: change user endpoint response format

- GET /users 응답 형식 변경으로 클라이언트 수정 필요

BREAKING CHANGE: GET /users 응답이 배열에서 객체로 변경됨
- 기존: [user1, user2]
- 변경: { data: [user1, user2], total: 2 }
```

### 7.2 피해야 할 패턴

| 잘못된 예시 | 문제점 |
|-------------|--------|
| `fix: 버그 수정` | 무슨 버그인지 불명확 |
| `feat: 기능 추가` | 무슨 기능인지 불명확 |
| `update code` | 타입 누락, 내용 모호 |
| `Fixed login bug` | 과거형 사용, 대문자 시작 |
| `feat: add login and signup and profile` | 여러 변경사항을 하나의 커밋에 포함 |
| `wip` | 작업 중인 상태로 커밋 (지양) |

---

## 8. 이모지 사용 (선택 사항)

가독성 향상을 위해 Gitmoji를 사용할 수 있습니다. 팀 합의에 따라 도입 여부를 결정하세요.

| 이모지 | 타입 | 예시 |
|--------|------|------|
| ✨ | `feat` | `✨ feat(auth): add social login` |
| 🐛 | `fix` | `🐛 fix(cart): resolve quantity sync issue` |
| 📝 | `docs` | `📝 docs: update README` |
| ♻️ | `refactor` | `♻️ refactor(user): simplify validation` |
| 🚀 | `perf` | `🚀 perf(db): optimize slow queries` |
| ✅ | `test` | `✅ test(auth): add integration tests` |
| 🔧 | `chore` | `🔧 chore: update eslint config` |
| 💄 | `style` | `💄 style: fix code formatting` |

---

## 9. 자동화 도구 (권장)

컨벤션의 강제성을 위해 다음 도구 도입을 권장합니다.

### 9.1 Commitlint + Husky 설치

커밋 시 메시지 형식을 자동으로 검증합니다.

```bash
# 설치
npm install -D @commitlint/cli @commitlint/config-conventional husky

# Husky 활성화
npx husky install
npx husky add .husky/commit-msg 'npx commitlint --edit $1'
```

### 9.2 commitlint.config.js 예시

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'test', 'chore', 'perf', 'ci', 'build', 'revert'
    ]],
    'scope-enum': [2, 'always', [
      'auth', 'user', 'api', 'ui', 'db', 'config', 'core', 'common'
    ]],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 50],
    'body-max-line-length': [2, 'always', 72]
  }
};
```

---

## 10. 추가 팁

- 잘못된 커밋 메시지는 `git rebase -i` 또는 `git commit --amend`로 수정 가능
- 하나의 커밋에는 하나의 논리적 변경만 포함 (atomic commit)
- WIP(Work In Progress) 커밋은 push 전에 squash하여 정리
- 커밋 메시지는 다른 개발자가 6개월 후에도 이해할 수 있도록 작성
- `git log --oneline`으로 이력 확인 시 가독성을 고려하여 작성
- 팀 내 코드 리뷰 시 커밋 메시지도 함께 리뷰

---

*— End of Document —*
