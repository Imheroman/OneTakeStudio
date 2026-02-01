# 에셋 및 로고 저장 위치

## 현재 구조 확인 (기준: 프로젝트 구조)

| 위치 | 존재 여부 | 비고 |
|------|-----------|------|
| `frontend/public/` | ✅ 있음 | 현재 `mockServiceWorker.js`만 있음. Next.js 기본 정적 파일 루트 → `logo.svg` 추가 가능 |
| `frontend/src/shared/` | ✅ 있음 | `api`, `common`, `lib`, `providers`, `ui` 있음. **`assets/` 폴더는 없음** → 로고 쓸 때 새로 만들면 됨 |
| path alias (`tsconfig.json`) | `@/*` → `src/*`, `@/shared/*` → `src/shared/*` | `@/shared/assets/logo.svg` 사용 시 정상 resolve |

**결론**: 아래 두 방식 모두 현재 구조에 맞습니다.

---

## 로고 SVG 저장 위치 (권장)

### 1) `public/` 에 두기 (가장 단순)

- **경로**: `frontend/public/logo.svg`
- **사용**: `<img src="/logo.svg" alt="OneTake" />` 또는 Next.js `<Image src="/logo.svg" />`
- **장점**: 설정 없이 바로 사용, URL이 `/logo.svg`로 고정
- **용도**: 랜딩, Auth, favicon 대체 등 어디서나 동일 경로로 참조할 때

```
frontend/
  public/
    logo.svg      ← 로고 파일
    logo-dark.svg ← 다크 배경용 (필요 시)
```

### 2) `src/shared/assets/` 에 두기 (번들 포함)

- **경로**: `frontend/src/shared/assets/logo.svg`
- **사용**: `import logoUrl from '@/shared/assets/logo.svg'` 후 `<img src={logoUrl} />` 또는 SVG를 React 컴포넌트로 쓰려면 `@svgr/webpack` 설정 후 `import { ReactComponent as Logo } from '@/shared/assets/logo.svg'`
- **장점**: 소스와 함께 관리, 컴포넌트로 쓰면 색/크기 등 제어 용이
- **용도**: 로고를 컴포넌트로 여러 곳에서 재사용하고 스타일을 바꿔 쓰고 싶을 때

```
frontend/src/
  shared/
    assets/
      logo.svg
      icons/
```

---

## 정리

| 목적 | 추천 위치 |
|------|-----------|
| 단순히 이미지로만 쓸 때 | `public/logo.svg` |
| React 컴포넌트로 색/크기 제어할 때 | `src/shared/assets/logo.svg` (+ SVGR 설정) |

지금은 **`public/logo.svg`** 에 두고 `<img src="/logo.svg" />` 로 쓰다가, 나중에 컴포넌트로 바꾸고 싶으면 `src/shared/assets/` 로 옮기면 됩니다.
