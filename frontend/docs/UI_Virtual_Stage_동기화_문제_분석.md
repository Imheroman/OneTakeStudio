# UI Stage와 Virtual Canvas Stage 동기화 문제 분석

## 문제 재정의

### 사용자 요구사항
- UI Stage (프리뷰): 사용자가 보고 편집하는 화면
- Virtual Canvas Stage (송출): 유튜브로 나가는 화면
- **두 화면이 똑같이 보여야 함**

### 현재 문제
- 송출 화면에 좌측 상단에 작은 화면이 보임
- UI Stage와 Virtual Canvas Stage가 다르게 렌더링됨

## 원인 분석

### 가설 1: 좌표 시스템 불일치
**가능성**: 매우 높음

UI Stage는 `displayScale`과 `displayOffset`을 사용하여 반응형으로 렌더링:
```typescript
const displayScale = Math.min(displayWidth / stageWidth, displayHeight / stageHeight);
const displayOffsetX = (displayWidth - stageWidth * displayScale) / 2;
const displayOffsetY = (displayHeight - stageHeight * displayScale) / 2;

<Group
  scaleX={displayScale}
  scaleY={displayScale}
  x={displayOffsetX}
  y={displayOffsetY}
>
```

Virtual Canvas Stage는 고정 해상도로 렌더링:
```typescript
<Stage
  width={stageWidth}  // 1280 or 1920
  height={stageHeight}  // 720 or 1080
  pixelRatio={1}
>
```

**문제점**: 
- UI Stage의 `Group`이 스케일되어 있어, 내부의 소스들도 스케일된 좌표를 가짐
- Virtual Canvas Stage는 스케일 없이 렌더링
- `getTransform`이 두 Stage에 동일한 픽셀 값을 반환하지만, UI Stage는 스케일이 적용되어 실제 화면에서 다르게 보임

### 가설 2: sourceTransforms가 UI Stage 기준으로 저장됨
**가능성**: 높음

`setSourceTransform`이 호출될 때:
1. UI Stage에서 드래그/변형
2. 픽셀 좌표 전달 (UI Stage의 논리 좌표)
3. 정규화 좌표로 변환하여 저장
4. Virtual Canvas Stage에서 다시 픽셀로 변환

**문제점**:
- UI Stage의 논리 좌표 (스케일 적용 전)를 기준으로 정규화
- Virtual Canvas Stage도 동일한 논리 해상도 사용
- 이론적으로는 동일해야 함

### 가설 3: 초기 레이아웃 계산 오류
**가능성**: 높음

`arrangeSourcesInLayout`이 반환하는 셀 좌표:
```typescript
const arranged = arrangeSourcesInLayout(
  layout,
  sortedSources.map((s, i) => ({ source: s, index: i })),
  stageWidth,
  stageHeight
);
```

**문제점**:
- `arranged` 셀이 `stageWidth`, `stageHeight` 기준으로 계산됨
- UI Stage는 `displayWidth`, `displayHeight`를 사용
- 초기 레이아웃이 잘못 계산될 수 있음

## 진단 계획

### Step 1: 좌표 값 확인
콘솔 로그에서 다음 확인:
1. `getTransform`의 `normalized` 값
2. `getTransform`의 `pixel` 값
3. `stageSize` (UI Stage vs Virtual Canvas Stage)

### Step 2: 렌더링 비교
1. UI Stage의 실제 렌더링 위치
2. Virtual Canvas Stage의 실제 렌더링 위치
3. 두 Stage의 소스 크기 비교

### Step 3: 해결 방안
- 좌표 시스템 통일
- 또는 각 Stage에 맞는 별도 transform 계산

## 예상 해결 방안

### 방안 A: UI Stage도 고정 해상도로 렌더링
- `displayScale`과 `displayOffset`을 Stage 레벨이 아닌 컨테이너 레벨에서 적용
- 두 Stage 모두 동일한 논리 해상도 사용

### 방안 B: 각 Stage에 별도 transform 제공
- `getTransform`을 `getUITransform`과 `getVirtualTransform`으로 분리
- UI Stage는 `displayScale` 고려
- Virtual Canvas Stage는 고정 해상도 기준

### 방안 C: Virtual Canvas Stage를 UI Stage 기준으로 조정
- Virtual Canvas Stage의 해상도를 UI Stage와 동일하게 설정
- 캡처 시점에 해상도 조정
