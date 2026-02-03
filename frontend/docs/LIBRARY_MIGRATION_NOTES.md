# 라이브러리 마이그레이션 및 활용 정리

## 완료된 마이그레이션

### 1. proxy → proxy (Next.js 16)
- **경고**: `The "proxy" file convention is deprecated. Please use "proxy" instead.`
- **조치**: `src/proxy.ts` → `src/proxy.ts`로 파일명 변경, `export function proxy` → `export function proxy`로 함수명 변경.
- **참고**: Next.js 16부터 "proxy"라는 이름이 Express 미들웨어와 혼동된다고 하여 "proxy"로 개칭됨. 동작은 동일.

### 2. 백스테이지 드래그앤드롭 → @dnd-kit
- **기존**: HTML5 `draggable` + `dataTransfer` 직접 구현 (브라우저별 드래그 미동작 이슈).
- **변경**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 사용.
- **효과**: 포인터/키보드 접근성, 터치 지원, 크로스 브라우저 동작 안정화.

---

## 이미 라이브러리 사용 중인 기능

| 기능 | 라이브러리 |
|------|------------|
| 폼 + 검증 | react-hook-form, zod, @hookform/resolvers |
| 차트 | recharts |
| 다이얼로그/탭/아바타 등 | @radix-ui/* |
| 캔버스(미리보기) | konva, react-konva |
| 전역 상태 | zustand |
| 디바운스 | use-debounce |

---

## 추가 라이브러리화 후보

1. **확인 다이얼로그**
   - 현재: `confirm()` 사용 (StagingSourceTile 소스 제거, mypage 로그아웃 등).
   - 제안: 기존 `@radix-ui/react-dialog`로 공통 ConfirmDialog 컴포넌트 만들어 사용하면 스타일/접근성 통일 가능.

2. **날짜/시간 표시**
   - 현재: `new Date(iso)` 등 직접 사용 (StudioRecordingPanel 등).
   - 제안: `date-fns` 또는 `dayjs` 도입 시 포맷/로케일/상대시간(예: "3분 전") 일관 처리 가능.

3. **토스트/스낵바**
   - 현재: 별도 토스트 라이브러리 없음.
   - 제안: 알림/성공 메시지가 많아지면 Radix Toast, sonner, react-hot-toast 등 검토.

원하면 위 후보 중 특정 항목부터 구현 순서 정해서 적용할 수 있음.
