# 공통 컴포넌트 (Shared Common Components)

프로젝트 전반에서 재사용 가능한 공통 컴포넌트 모음입니다.

## 📦 컴포넌트 목록

### 1. Container
레이아웃 컨테이너 (max-width, padding 자동 적용)

```tsx
import { Container } from "@/components/shared/common";

<Container size="md"> {/* sm | md | lg | xl | full */}
  {/* 내용 */}
</Container>
```

### 2. Section
섹션 래퍼 (Container + padding)

```tsx
import { Section } from "@/components/shared/common";

<Section padding="md" containerSize="md">
  {/* 내용 */}
</Section>
```

### 3. SectionHeader
섹션 제목 + 설명 조합

```tsx
import { SectionHeader } from "@/components/shared/common";

<SectionHeader
  title="제목"
  description="설명"
  badge={<Badge>Badge</Badge>}
  align="center" // left | center
/>
```

### 4. ActionButton
링크가 포함된 버튼 (Next.js Link 자동 적용)

```tsx
import { ActionButton } from "@/components/shared/common";

<ActionButton
  href="/path"
  variant="primary" // primary | secondary | outline | ghost
  size="md" // sm | md | lg
  icon={<Icon />}
  external={false}
>
  버튼 텍스트
</ActionButton>
```

### 5. ActionCard
아이콘 + 제목 + 설명 + 액션 버튼이 있는 카드

```tsx
import { ActionCard } from "@/components/shared/common";

<ActionCard
  title="제목"
  description="설명"
  icon={<Icon />}
  href="/path"
  actionLabel="시작하기"
  iconBg="indigo" // indigo | gray | blue
/>
```

### 6. IconButton
아이콘만 있는 버튼 (알림, 프로필 등)

```tsx
import { IconButton } from "@/components/shared/common";

<IconButton
  icon={<Bell />}
  label="알림"
  badge={3} // 숫자 또는 ReactNode
  onClick={() => {}}
  size="md" // sm | md | lg
/>
```

### 7. PageHeader
페이지 상단 헤더 (제목 + 설명 + 액션)

```tsx
import { PageHeader } from "@/components/shared/common";

<PageHeader
  title="페이지 제목"
  description="설명"
  action={<Button>액션</Button>}
/>
```

### 8. ButtonGroup
버튼들을 그룹으로 묶기

```tsx
import { ButtonGroup } from "@/components/shared/common";

<ButtonGroup direction="row" align="center">
  <Button>버튼 1</Button>
  <Button>버튼 2</Button>
</ButtonGroup>
```

## 🎯 사용 예시

### 랜딩 페이지 섹션
```tsx
import { Section, SectionHeader, ActionButton, ButtonGroup } from "@/components/shared/common";

<Section padding="lg" containerSize="md">
  <SectionHeader
    title="핵심 기능"
    description="설명"
    align="center"
  />
  <ButtonGroup align="center">
    <ActionButton href="/signup" variant="primary">
      시작하기
    </ActionButton>
    <ActionButton href="/login" variant="outline">
      로그인
    </ActionButton>
  </ButtonGroup>
</Section>
```

### 워크스페이스 액션 카드
```tsx
import { ActionCard } from "@/components/shared/common";

<div className="grid grid-cols-2 gap-6">
  <ActionCard
    title="라이브 스트리밍"
    description="설명"
    icon={<Radio />}
    href="/studio"
    actionLabel="시작하기"
  />
</div>
```

## 📝 주의사항

- 모든 컴포넌트는 `@/components/shared/common`에서 일괄 import 가능
- `index.ts`를 통해 named export로 제공
- 기존 `LandingButton` 등은 점진적으로 `ActionButton`으로 마이그레이션 권장
