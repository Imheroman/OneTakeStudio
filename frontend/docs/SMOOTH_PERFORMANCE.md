# 부드러운 주사율(스크롤·애니메이션) 전략

노션처럼 60fps 이상 유지·자연스러운 가감속을 위한 전략과 점진적 적용 계획.

---

## 1. 하드웨어 가속(GPU 레이어 분리)

### 원리
- `transform: translateZ(0)` 또는 `will-change: transform`을 주면 브라우저가 해당 요소를 **별도 컴포지터 레이어**로 올려 GPU에서 처리한다.
- 레이아웃/페인트 없이 합성만 하므로 스크롤·호버·메뉴 열림 시 **주사율이 안정**된다.

### 적용 대상(우선순위)
| 대상 | 위치 | 방법 |
|------|------|------|
| 카드 호버(scale/shadow) | `WorkspaceHome` 스튜디오 카드, `ActionCard`, `VideoCard` 등 | 호버 시 `will-change: transform` 또는 상시 `transform: translateZ(0)` |
| 드롭다운/메뉴 열림 | `DropdownMenuContent`, `NotificationPanel` 슬라이드 | `data-[state=open]` 시 `will-change: transform` |
| 사이드바 토글 | 메인 레이아웃 사이드바 `transition-[width]` | 컨테이너에 `transform: translateZ(0)` |
| 테마 토글·버튼 | `WorkspaceThemeToggle`, 프로필 드롭다운 Chevron | 회전 등 `transition-transform` 요소에 GPU 레이어 |

### 주의사항
- **will-change**: 애니메이션/호버 구간에만 제한적으로 사용. 상시 쓰면 메모리 사용 증가.
- **translateZ(0)**: 상시 적용해도 되는 가벼운 옵션. 서브픽셀 렌더링 이슈가 있을 수 있어 필요 시만 적용.

### 구현
- `globals.css`에 `.gpu-layer` 유틸 클래스: `transform: translateZ(0)`.
- 호버/열림 시에만 `will-change: transform` 쓰는 클래스는 `hover:will-change-transform` 또는 Radix `data-[state=open]:will-change-transform`로 적용.

### Headless UI vs Radix (라이브러리 선택)
- **Headless UI 추가는 권장하지 않음.** 이미 **Radix UI**로 Dialog, Dropdown, Tabs, Avatar 등 대부분의 헤드리스 패턴을 쓰고 있음. 두 라이브러리는 역할이 겹침(접근성·키보드·포커스·열림/닫힘 상태). 중복 도입 시 번들 증가·일관성 저하만 생김.
- **결론**: Radix 유지. 끊김은 **CSS 전략**으로 해결 — **width 애니메이션** 대신 **transform: translateX()** 사용.
- **width 트랜지션**은 매 프레임 **layout(reflow)** 를 일으켜 프레임 드랍이 심함. **transform** 은 **composite** 만 하므로 GPU로 부드럽게 처리됨.

### 사이드바·알림 패널 (Spring Physics, 제미나이 스타일)
- **알림 패널**: **Framer Motion layout + spring.** `motion.div` 에 `layout` + `animate={{ width: 0 | 384 }}` + `transition: { type: "spring", stiffness: 300, damping: 30 }`. 내부 패널은 `animate={{ x: "100%" | 0 }}` 동일 spring. 탑네비 밑에서 콘텐츠를 밀어내며 부드럽게 동작.
- **사이드바**: width 토글(80↔256px)은 **motion.aside** + `animate={{ width }}` + **spring (stiffness: 300, damping: 30)**. 토글 버튼·메뉴·로그아웃에 **whileHover/whileTap** 마이크로 인터랙션(scale 1.02/0.98 등).
- **메인 콘텐츠**: **motion.main** 에 `layout` 추가 — 사이드바·알림 패널 전환 시 콘텐츠가 끊기지 않고 부드럽게 자리 잡음.

### Radix Content + Framer Motion (Spring)
- **DropdownMenuContent**: `initial` → `animate` + **spring (stiffness: 300, damping: 30)**.
- **DialogContent**: 동일 **spring (stiffness: 300, damping: 30)**. 중앙 정렬은 `x: "-50%", y: "-50%"` 유지.

### 성능 사양(고사양/저사양) 및 워크스페이스 세팅
- **현재 기본값**: 풀 애니메이션(0.28s ease)은 **고사양 PC 기준**으로 부드럽게 동작. 저사양·저전력 기기에서는 **워크스페이스 세팅**에서 사양을 낮출 수 있음.
- **워크스페이스 세팅** (`/workspace/[id]/settings`): **디스플레이** 탭 — 테마, 디스플레이 밀도(보통/컴팩트). **사양** 탭 — 성능 사양(고사양/보통/저사양), 애니메이션 감소.
- **저사양·애니메이션 감소** 선택 시: 사이드바·알림 패널 전환을 **0.08s**로 단축해 끊김을 줄임. (`useWorkspaceDisplayStore`, `usePrefersMotion`)

---

## 2. 가상화(Virtualization)

### 목적
긴 목록에서 **보이는 영역만 DOM에 두고** 나머지는 언마운트해 렌더 비용·메모리를 줄여 스크롤 주사율을 높인다.

### 라이브러리 선택
| 라이브러리 | 특징 | 권장 |
|------------|------|------|
| **react-window** | 단순 API, 작은 번들, 리스트/그리드/고정 크기 | 리스트·테이블에 적합 |
| **react-virtualized** | 기능 많음(자동 크기 등), 번들 큼 | 복잡한 레이아웃 필요 시 |

**권장**: 먼저 **react-window**로 도입. `FixedSizeList` / `VariableSizeList`로 충분한 화면이 많음.

### 가상화 후보(데이터 개수·스크롤 빈도 기준)
| 컴포넌트 | 경로 | 비고 |
|----------|------|------|
| 비디오 목록 | `VideoLibrary` | 그리드 → `FixedSizeGrid` 검토 |
| 즐겨찾기 테이블 | `FavoriteTable` | 테이블 행 → `FixedSizeList` |
| 알림 목록 | `NotificationPanel` | 스크롤 영역 → `FixedSizeList` |
| 스토리지 최근 파일 | `storage/page` | 행 많을 때만 |
| 초대 목록 | `ReceivedInvitesPanel` | 카드 수 많을 때 |
| 스튜디오 채팅 | `StudioChatPanel` | 메시지 수 많을 때(역방향 스크롤 고려) |

### 점진적 도입
1. **Phase A**: 목록이 **50개 이상** 나오는 화면부터 적용(예: VideoLibrary, FavoriteTable).
2. **Phase B**: 알림·초대·채팅 등 스크롤 영역이 있는 패널에 적용.
3. **Phase C**: 그리드 레이아웃이 있는 곳은 `FixedSizeGrid` 또는 `VariableSizeList`로 통일.

---

## 3. 이징(Easing)

### 목표
선형보다 **가감속이 있는 곡선**을 쓰면 사용자가 더 자연스럽게 느낀다.

### 권장 곡선
- **Material Design 표준**: `cubic-bezier(0.4, 0, 0.2, 1)` — 진입/퇴장 공통.
- **진입 강조**: `cubic-bezier(0, 0, 0.2, 1)` (ease-out).
- **퇴장 강조**: `cubic-bezier(0.4, 0, 1, 1)` (ease-in).

### 적용
- **CSS**: `globals.css`에 `--ease-standard`, `--ease-out`, `--ease-in` 변수 정의 후 `transition-timing-function`에 사용.
- **Motion**: `transition: { ease: [0.4, 0, 0.2, 1] }` 또는 `ease: "easeOut"` 등. 랜딩 페이지 등 기존 Motion 사용처에 통일.

### 적용 대상
- 사이드바/패널 width·opacity 전환.
- 드롭다운/모달 열림·닫힘 (tw-animate-css + 커스텀 이징 병행 가능).
- 카드 호버 transition.

---

## 4. Motion(Framer Motion) 사용 전략

### 현재 사용처
- **랜딩**: `(landing)/page.tsx`, `GlassmorphicFeatureCard`, `TimelineScanAnimation`, `SocialProofBand`, `ScrollProgressWaveform`.
- **대시보드**: Motion 직접 사용 없음. CSS `transition` + Tailwind `animate-in` 등으로 처리.

### layout vs animate
| 속성 | 용도 | 사용 시점 |
|------|------|------------|
| **layout** | 레이아웃 변경 시 자동 애니메이션(플렉스/그리드 재계산, 순서 변경) | 리스트 정렬·필터 변경, 드래그 정렬 결과 등 |
| **animate** | 진입/퇴장/반복 등 명시적 키프레임 | 모달·토스트·온보딩, 랜딩 스크롤 애니메이션 |

### 권장
- **대시보드**: 카드 호버·메뉴 열림은 **CSS transition + GPU 레이어**로 충분. 복잡한 레이아웃 애니메이션(예: 벤토 그리드 순서 변경)이 생기면 그때만 Motion `layout` 도입.
- **랜딩**: 현재처럼 `motion` + `transition` 유지. 이징만 `cubic-bezier(0.4, 0, 0.2, 1)` 등으로 통일.
- **layout**은 “요소가 추가/제거/위치 변경될 때 부드럽게 움직이게” 할 때만 사용. 과하면 오버헤드 증가.

---

## 5. 점진적 적용 로드맵

| 단계 | 내용 | 상태 |
|------|------|------|
| **Phase 1** | 전역 이징 변수·GPU 레이어 유틸 추가, 카드/드롭다운 샘플 적용 | 완료 |
| **Phase 2** | 대시보드 카드·메뉴에 GPU 레이어·이징 일괄 적용 | 완료 |
| **Phase 3** | 랜딩 Motion transition에 표준 이징 적용 | 완료 |
| **Phase 4** | 목록 50개 이상 화면에 react-window 도입 | 완료 |
| **Phase 5** | 알림·채팅·초대 등 스크롤 패널 가상화 | 완료 |

### Phase 5 상세
- **NotificationPanel**: 15개 초과 시 `List` 가상화(행 높이 120px), ResizeObserver로 패널 높이 측정.
- **StudioChatPanel**: 25개 초과 시 `List` 가상화(행 높이 48px), ResizeObserver로 채팅 영역 높이 측정.
- **ReceivedInvitesPanel**: 10개 초과 시 `List` 가상화(행 높이 200px).

### Phase 4 상세
- **react-window** 설치 및 `FixedSizeList` 사용.
- **FavoriteTable**: 15개 초과 시 가상 리스트(행 높이 56px), 그 미만은 기존 테이블 렌더.
- **VideoLibrary**: 24개 초과 시 행 단위 가상화(행 높이 260px), 컨테이너 너비로 열 수(1~4) 계산 후 `FixedSizeList`로 행만 렌더.

---

## 6. 참고

- [CSS will-change - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- [react-window](https://github.com/bvaughn/react-window)
- Material Design: [Motion - Easing](https://m3.material.io/styles/motion/easing-and-duration)

---

## 7. 사이드바·패널 비교 및 개선 제안 (미적용)

알림 패널 / 워크스페이스 사이드바 / 스튜디오 오른쪽 사이드바를 비교한 뒤, **지금 코드는 건드리지 않고** 나중에 적용할 수 있는 최적화·UI 개선만 정리.

### 7.1 현재 비교 요약

| 구분 | 알림 패널 | 워크스페이스 사이드바 | 스튜디오 오른쪽 사이드바 |
|------|-----------|------------------------|----------------------------|
| 전환 | Motion spring | Motion spring | CSS transition만 |
| 너비 | 0 ↔ 384px | 80 ↔ 256px | 64px ↔ 25rem |
| 레이아웃 | motion.main + layout | motion.aside layout | 일반 aside |

### 7.2 최적화 제안

- **스튜디오 사이드바**: 나중에 알림/워크스페이스와 톤 맞추고 싶다면 Motion spring + width 애니메이션 도입 검토. (지금은 CSS만 사용)
- **알림·워크스페이스**: width 애니메이션은 매 프레임 reflow를 유발하므로, 저사양 모드에서 이미 0.08s로 단축해 둔 상태 유지. 추가로 `contain: layout` 등으로 리플로우 범위 제한 검토 가능.
- **가상화**: 알림 패널·스튜디오 채팅 등 긴 목록은 react-window 적용 상태 확인 후, 미적용 구간만 단계적으로 적용.

### 7.3 UI 개선 제안

- **일관성**: 스튜디오 사이드바도 spring + 페이드 느낌으로 통일하면 전체 앱 톤이 맞음. (선택)
- **접근성**: 세 패널 모두 포커스 트랩·Esc 닫기·`aria-expanded` 등 키보드/스크린리더 대응 점검.
- **밀도**: 워크스페이스 세팅의 “디스플레이 밀도(보통/컴팩트)”가 실제로 사이드바·알림 패널 간격/폰트에 반영되는지 확인 후, 미반영이면 적용.
- **스튜디오 탭**: 탭 전환 시 패널이 조건부 렌더라서 “튀어나오는” 느낌이 있음. 나중에 페이드/슬라이드 등으로 부드럽게 바꿀 수 있음.

### 7.4 사이드바별 리소스 (핵심만)

- **알림**: 닫혀 있어도 DOM·알림 데이터 유지. 열 때 spring 2개. 15개 초과 시 가상화.
- **워크스페이스**: 항상 마운트, motion 노드 많지만 구조 단순 → 부하 작음.
- **스튜디오**: Motion 없음(애니 부하 최소). 탭 1개만 열림 → 열린 패널 1개가 무거우면 그만큼 무거움(채팅은 가상화, 나머지는 전부 렌더).
