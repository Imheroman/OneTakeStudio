# Canvas Preview 테스트 가이드

## 🧪 테스트 방법

### 1. 기본 테스트 (MSW Mock 데이터)

현재 MSW 핸들러에서 스튜디오 조회 시 기본 소스 2개가 제공됩니다:
- `source_1`: Video Capture Device
- `source_2`: Audio Input Capture

**테스트 단계:**
1. 개발 서버 실행: `npm run dev`
2. 로그인: `test@example.com` / `12345678`
3. 스튜디오 생성 또는 기존 스튜디오 접속
4. `/studio/{id}` 페이지에서 PreviewArea 확인

**현재 상태:**
- 소스는 표시되지만 실제 비디오/이미지 엘리먼트가 없어 플레이스홀더만 표시됩니다.

---

### 2. MSW 핸들러에 테스트 소스 추가

더 다양한 소스를 테스트하려면 `src/mock/handlers.ts`의 스튜디오 조회 핸들러를 수정:

```typescript
// src/mock/handlers.ts - 스튜디오 조회 핸들러 수정
http.get(`${BASE_URL}/api/v1/studios/:id`, async ({ params }) => {
  const studioDetail = {
    // ... 기존 필드
    sources: [
      { id: "source_1", type: "video", name: "Video Capture", isVisible: true },
      { id: "source_2", type: "image", name: "Test Image", isVisible: true },
      { id: "source_3", type: "text", name: "Text Overlay", isVisible: true },
      { id: "source_4", type: "audio", name: "Audio Input", isVisible: true },
      { id: "source_5", type: "browser", name: "Browser Source", isVisible: true },
    ],
  };
  return HttpResponse.json(studioDetail);
}),
```

---

### 3. 실제 웹캠 테스트

**PreviewArea 컴포넌트에 웹캠 연결 기능 추가:**

```typescript
// src/widgets/studio/preview-area/ui/PreviewArea.tsx
useEffect(() => {
  sources.forEach(async (source) => {
    if (source.type === "video" && source.name.includes("Camera")) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        await video.play();
        
        registerSourceElement(source.id, video, stream);
      } catch (error) {
        console.error("웹캠 접근 실패:", error);
      }
    }
  });

  return () => {
    sources.forEach((source) => {
      unregisterSourceElement(source.id);
      // 스트림 정리
      const sourceData = sourceElementsRef.current.get(source.id);
      if (sourceData?.stream) {
        sourceData.stream.getTracks().forEach(track => track.stop());
      }
    });
  };
}, [sources, registerSourceElement, unregisterSourceElement]);
```

**주의사항:**
- 브라우저에서 웹캠 권한 요청이 나타납니다.
- HTTPS 또는 localhost에서만 작동합니다.

---

### 4. 이미지 소스 테스트

**테스트용 이미지 URL 사용:**

```typescript
// PreviewArea.tsx에 추가
useEffect(() => {
  sources.forEach((source) => {
    if (source.type === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "https://picsum.photos/800/600?random=1";
      img.onload = () => {
        registerSourceElement(source.id, img);
      };
    }
  });
}, [sources, registerSourceElement]);
```

---

### 5. 개발 모드 테스트 패널 추가 (권장)

개발 환경에서만 소스를 추가/제거할 수 있는 테스트 패널을 만들 수 있습니다:

```typescript
// src/widgets/studio/preview-area/ui/PreviewArea.tsx
{process.env.NODE_ENV === 'development' && (
  <div className="absolute top-2 right-2 bg-gray-800 p-2 rounded text-xs">
    <button onClick={handleAddTestImage}>이미지 추가</button>
    <button onClick={handleAddTestText}>텍스트 추가</button>
    <button onClick={handleAddWebcam}>웹캠 추가</button>
  </div>
)}
```

---

### 6. 레이아웃 테스트

**다양한 레이아웃 확인:**

1. LayoutControls에서 레이아웃 변경:
   - `full`: 전체 화면
   - `split`: 좌우 분할
   - `three-grid`: 2x2 그리드
   - `four-grid`: 2x2 그리드

2. 소스 수에 따른 배치 확인:
   - 1개 소스: 전체 화면
   - 2개 소스: split 레이아웃에서 좌우 분할
   - 3-4개 소스: grid 레이아웃에서 그리드 배치

---

### 7. 비디오/오디오 토글 테스트

**ControlBar에서 토글:**
- 비디오 비활성화: Canvas에 "비디오가 비활성화되었습니다" 메시지 표시
- 오디오 비활성화: 오디오 소스는 시각화만 표시되므로 변화 없음

---

## 🔍 디버깅 팁

### Canvas 확인
브라우저 개발자 도구에서:
1. Elements 탭에서 `<canvas>` 요소 선택
2. Console에서 `canvasRef.current` 확인
3. Canvas 크기 확인: `canvasRef.current.width`, `canvasRef.current.height`

### 렌더링 루프 확인
```typescript
// useCanvasPreview.ts의 render 함수에 로그 추가
console.log('렌더링:', {
  sources: visibleSources.length,
  layout,
  canvasSize: { width: canvas.width, height: canvas.height }
});
```

### 소스 엘리먼트 확인
```typescript
// PreviewArea.tsx에서
console.log('등록된 소스:', sourceElementsRef.current);
```

---

## ✅ 체크리스트

- [ ] MSW 핸들러에서 소스 데이터 확인
- [ ] Canvas가 렌더링되는지 확인 (소스가 있을 때)
- [ ] 플레이스홀더가 표시되는지 확인 (소스가 없을 때)
- [ ] 레이아웃 변경 시 소스 배치 확인
- [ ] 비디오 토글 시 메시지 표시 확인
- [ ] 웹캠 연결 테스트 (선택사항)
- [ ] 이미지 소스 렌더링 테스트 (선택사항)
- [ ] 텍스트 소스 렌더링 테스트
- [ ] 오디오 소스 시각화 확인

---

## 🚀 빠른 테스트 방법

**가장 빠른 테스트:**
1. 개발 서버 실행
2. 스튜디오 페이지 접속
3. 브라우저 콘솔에서 직접 소스 추가:

```javascript
// 브라우저 콘솔에서 실행
const testSources = [
  { id: 'test_1', type: 'text', name: '테스트 텍스트', isVisible: true },
  { id: 'test_2', type: 'image', name: '테스트 이미지', isVisible: true },
];

// StudioMain 컴포넌트의 상태를 직접 수정 (개발 모드에서만)
// 또는 MSW 핸들러를 수정하여 더 많은 소스 반환
```

---

*작성일: 2026-01-26*
