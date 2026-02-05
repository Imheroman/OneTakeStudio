# UI Stage 송출 문제 분석 및 해결 계획

## 문제 현상
- **증상**: 유튜브 라이브 송출 화면에 좌측 상단에 작은 프리뷰 화면이 함께 송출됨
- **발견 시점**: 2026-02-04
- **심각도**: 높음 (송출 품질에 직접적인 영향)

## 문제 원인 분석

### 가설 1: UI Stage가 Virtual Canvas Stage에 포함되어 렌더링
**가능성**: 낮음
- 코드 확인 결과, UI Stage와 Virtual Canvas Stage는 완전히 분리되어 있음
- 각각 독립적인 `<Stage>` 컴포넌트로 구현됨
- `getPreviewStreamRef`는 오직 `captureLayerRef`만 사용

### 가설 2: 소스 중 하나가 UI Stage 자체를 캡처하고 있음
**가능성**: 높음
- `sources` 배열에 "screen" 타입 소스가 있을 경우, 화면 공유로 브라우저 탭 자체를 캡처했을 가능성
- 화면 공유 시 현재 브라우저 탭을 선택하면 UI Stage가 포함된 전체 화면이 소스로 추가됨
- 이 소스가 Virtual Canvas Stage에 렌더링되면서 재귀적으로 UI Stage가 포함됨

### 가설 3: displayScale/displayOffset이 잘못 적용됨
**가능성**: 중간
- UI Stage의 `Group`이 `displayScale`로 스케일링되고 `displayOffset`으로 이동됨
- Virtual Canvas Stage의 `transform` 계산이 UI Stage의 스케일을 고려하지 않아 좌표가 어긋남
- 결과적으로 소스가 좌측 상단에 작게 표시됨

### 가설 4: getTransform 함수가 두 Stage에 다른 값을 반환
**가능성**: 중간
- `getTransform`은 `stageWidth`, `stageHeight`를 기준으로 픽셀 변환
- UI Stage는 `displayWidth`, `displayHeight`를 사용하지만, Virtual Canvas Stage는 `stageWidth`, `stageHeight` 사용
- 두 Stage가 다른 해상도를 참조하여 좌표 불일치 발생 가능

## 가장 유력한 원인

**화면 공유 소스가 현재 브라우저 탭을 캡처하고 있음**

### 근거
1. 좌측 상단의 작은 화면은 UI Stage의 레이아웃과 동일
2. 화면 공유 기능 사용 시 브라우저 탭을 선택하면 이런 현상 발생
3. Virtual Canvas Stage는 모든 소스를 렌더링하므로, 화면 공유 소스에 UI Stage가 포함되면 재귀적으로 표시됨

## 해결 계획

### Phase 1: 문제 진단 및 검증 (우선순위: 최고)
1. **소스 목록 확인**
   - `sources` 배열에서 "screen" 타입 소스 확인
   - 해당 소스의 `MediaStream`이 현재 브라우저 탭을 캡처하고 있는지 확인
   - 콘솔 로그 추가하여 각 소스의 타입과 스트림 정보 출력

2. **좌표 변환 검증**
   - `getTransform` 함수가 UI Stage와 Virtual Canvas Stage에 동일한 값을 반환하는지 확인
   - 콘솔 로그 추가하여 각 소스의 transform 값 출력

3. **렌더링 순서 확인**
   - UI Stage와 Virtual Canvas Stage의 렌더링 순서 확인
   - `sortedSources`가 두 Stage에 동일하게 전달되는지 확인

### Phase 2: 임시 해결 방안 (우선순위: 높음)
1. **화면 공유 소스 필터링**
   - Virtual Canvas Stage에서 현재 브라우저 탭을 캡처하는 소스 제외
   - 또는 화면 공유 시 브라우저 탭 선택 방지 안내 추가

2. **좌표 변환 수정**
   - `getTransform` 함수가 항상 `stageWidth`, `stageHeight` 기준으로 계산하도록 수정
   - UI Stage의 `displayScale`을 고려하지 않도록 수정

### Phase 3: 근본적 해결 방안 (우선순위: 중간)
1. **화면 공유 소스 검증 로직 추가**
   - 화면 공유 시작 시 현재 브라우저 탭인지 자동 감지
   - 감지되면 경고 메시지 표시 및 소스 추가 방지

2. **좌표 시스템 통일**
   - UI Stage와 Virtual Canvas Stage가 동일한 좌표 시스템 사용
   - 정규화 좌표(0-1)를 일관되게 적용

3. **테스트 케이스 추가**
   - 화면 공유 소스가 포함된 경우 테스트
   - 다양한 해상도에서 좌표 변환 테스트

## 예상 소요 시간
- Phase 1: 30분 (진단 및 검증)
- Phase 2: 1시간 (임시 해결)
- Phase 3: 2시간 (근본적 해결)

## Phase 1 진단 결과 (완료)

### 발견된 문제
- **소스 ID**: `screen-1770174486688`
- **Track Label**: `web-contents-media-stream://19C9C5C8416B3F0AC4D3921C881B3524`
- **문제**: Electron 앱의 웹 컨텐츠(현재 브라우저 탭)를 캡처하고 있음
- **결과**: 화면 공유 소스에 UI Stage가 포함되어 재귀적으로 송출됨

### 원인 확정
가설 2가 정확했습니다: **소스 중 하나가 UI Stage 자체를 캡처하고 있음**

## Phase 2 해결 방안 (완료)

### 구현 내용

#### 1. 자기 참조 화면 공유 감지 로직
- `trackLabel` 검사를 통한 자기 참조 소스 감지
  - `web-contents-media-stream`: Electron 웹 컨텐츠
  - `browser`, `Chrome Tab`, `Firefox Tab`: 브라우저 탭
- 감지된 소스 ID를 `selfReferencingSourceIds` Set에 저장

#### 2. Virtual Canvas Stage 필터링
- `sortedSources.filter()`를 사용하여 자기 참조 소스 제외
- UI Stage에는 계속 표시되지만, Virtual Canvas Stage(송출)에서만 제외
- 콘솔에 제외된 소스 로그 출력

#### 3. 사용자 경고 메시지
- 자기 참조 소스 감지 시 화면 상단에 경고 배너 표시
- 사용자에게 다른 창/화면 선택 안내
- 닫기 버튼으로 경고 숨김 가능

### 적용된 파일
- `frontend/src/widgets/studio/preview-area/ui/PreviewArea.tsx`
  - `selfReferencingSourceIds` ref 추가
  - `showSelfReferenceWarning` state 추가
  - `addElement` 함수에 감지 로직 추가
  - Virtual Canvas Stage의 `sortedSources` 필터링
  - 경고 UI 컴포넌트 추가

### 테스트 방법
1. 화면 공유 소스 추가
2. 현재 브라우저 탭 선택
3. 경고 메시지 확인
4. 송출 화면에서 해당 소스가 제외되었는지 확인
5. 다른 창 선택 시 정상 송출 확인

## 결과
- ✅ Phase 1 진단 코드 추가
- ✅ 콘솔 로그 확인
- ✅ 원인 확정: 화면 공유 소스가 현재 브라우저 탭을 캡처
- ✅ Phase 2 완료: 자기 참조 화면 공유 감지 및 차단
- ✅ 디버깅 로그 정리

## 향후 개선 사항 (Phase 3)
1. 화면 공유 시작 전 사전 검증
2. 자동으로 다른 창 선택 유도
3. 테스트 케이스 추가
