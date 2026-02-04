# 워크스페이스 레이아웃 관련 코드 파일 경로

메인 레이아웃(사이드바·알림 패널·메인 영역) 수정 시 참고할 파일 목록입니다.

## 설계 요약 (충돌·성능)

- **알림 패널**: 애니메이션 없음(표시/숨김만). 메인과 별도 Motion 타임라인 없음 → 충돌·프레임 드랍 방지.
- **메인 영역**: `motion`/layout 미사용. 사이드바 width 변경과 별도 엔진으로 재계산하지 않음.
- **사이드바**: `motion.aside`로 width만 애니메이션. 내부 텍스트는 CSS `transition` + ease-out(열림)/ease-in(닫힘).
- **will-change**: `.google-oauth-hover`, `.sidebar-item-hover`는 호버 시에만 `will-change: transform, opacity` 적용 → 상시 메모리 부담 없음.

## 1. 레이아웃·진입점

| 경로 | 설명 |
|------|------|
| `frontend/src/app/(main)/layout.tsx` | 워크스페이스 메인 레이아웃 (사이드바, 탑네비, 메인, 알림 패널 배치) |

## 2. 사이드바

| 경로 | 설명 |
|------|------|
| `frontend/src/widgets/workspace/sidebar/index.tsx` | 워크스페이스 좌측 사이드바 (네비, 검색, 로그아웃) |
| `frontend/src/hooks/useCollapsible.ts` | 사이드바 펼침/접힘 상태 (open, shouldShowText) |
| `frontend/src/shared/lib/sidebar-motion.ts` | 사이드바 spring/ease 전환 설정 (스튜디오와 공유) |

## 3. 탑 네비게이션

| 경로 | 설명 |
|------|------|
| `frontend/src/widgets/workspace/top-nav/index.tsx` | 워크스페이스 상단 바 (로고, 테마, 알림 버튼, 프로필) |

## 4. 알림 패널

| 경로 | 설명 |
|------|------|
| `frontend/src/widgets/workspace/notification-panel/index.tsx` | 알림 패널 export |
| `frontend/src/widgets/workspace/notification-panel/ui/NotificationPanel.tsx` | 알림 패널 UI (리스트, 가상화) |
| `frontend/src/stores/useNotificationStore.ts` | 알림 패널 열림/닫힘 상태 (isOpen, toggle, close) |

## 5. 스토어·테마 (레이아웃/사이드바에서 사용)

| 경로 | 설명 |
|------|------|
| `frontend/src/stores/useAuthStore.ts` | 로그인 사용자, 로그아웃 |
| `frontend/src/stores/useWorkspaceThemeStore.ts` | 테마, useResolvedTheme (다크/라이트) |
| `frontend/src/stores/useWorkspaceDisplayStore.ts` | usePrefersMotion (애니메이션 감소 옵션) |

## 6. 스타일

| 경로 | 설명 |
|------|------|
| `frontend/src/styles/globals.css` | 전역 스타일, .gpu-layer, transition-smooth, --ease-standard, --sidebar 변수 등 |

## 7. FSD 검토 (워크스페이스 레이아웃 관련)

- **app (main)/layout**: widgets, features, entities, shared, stores만 참조 → 허용.
- **widgets/workspace/***: shared, stores, hooks 참조. app 참조 없음 → 허용.
- **entities, features**: widgets/app 상위 레이어 미참조 → 위배 없음.  
상세: `docs/FSD_VERIFICATION_REPORT.md`

## 8. 스튜디오(참고용, 워크스페이스와 별도)

| 경로 | 설명 |
|------|------|
| `frontend/src/widgets/studio/studio-sidebar/ui/StudioSidebar.tsx` | 스튜디오 오른쪽 사이드바 |
| `frontend/src/widgets/studio/studio-main/ui/StudioMain.tsx` | 스튜디오 메인 (사이드바 + 메인 영역 배치) |
