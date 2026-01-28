# Zod vs tRPC 적합성 분석

## 📋 현재 프로젝트 상황

### 아키텍처
- **MSA (Microservices Architecture)**: 백엔드와 프론트엔드가 완전히 분리
- **API 통신**: Axios 기반 RESTful API
- **프론트엔드**: Next.js App Router
- **타입 정의**: TypeScript 인터페이스로 수동 정의
- **폼 검증**: zod + react-hook-form (일부만 적용)
- **모킹**: MSW 사용

### 현재 타입 안정성 상태
- ✅ 폼 검증: zod 사용 중 (LoginForm, SignupForm, MyPage)
- ❌ API 요청/응답: 수동 타입 정의 (`apiClient.get<Type>()`)
- ❌ 런타임 검증: 없음 (API 응답 검증 없음)
- ❌ 타입 동기화: 백엔드 변경 시 수동 업데이트 필요

---

## 🔍 Zod vs tRPC 비교

### 1. tRPC 분석

#### ✅ 장점
- **End-to-End 타입 안전성**: 백엔드와 프론트엔드 타입이 자동 동기화
- **자동 타입 추론**: API 호출 시 자동으로 타입 추론
- **런타임 검증**: zod 기반으로 런타임 검증 포함
- **개발자 경험**: 자동완성, 타입 체크 등 우수한 DX

#### ❌ 단점 (현재 프로젝트에 부적합)
1. **MSA 구조와 부적합**
   - 백엔드와 프론트엔드가 분리된 구조에서는 tRPC 사용 불가
   - tRPC는 같은 코드베이스 내에서만 작동 (monorepo 또는 단일 프로젝트)

2. **기존 인프라 재작성 필요**
   - 현재 RESTful API를 완전히 재작성해야 함
   - 백엔드 팀과의 협의 및 대규모 리팩토링 필요

3. **백엔드 제약**
   - 백엔드가 Node.js/TypeScript가 아닐 경우 사용 불가
   - 다른 언어/프레임워크 사용 시 tRPC 적용 불가

4. **학습 곡선**
   - 팀원들의 tRPC 학습 필요
   - 기존 RESTful API 지식과 다른 패러다임

#### 결론: **현재 프로젝트에 부적합** ❌

---

### 2. Zod 분석

#### ✅ 장점 (현재 프로젝트에 적합)
1. **MSA 구조와 완벽 호환**
   - 백엔드와 프론트엔드 분리 구조에서도 사용 가능
   - RESTful API와 함께 사용 가능

2. **점진적 적용 가능**
   - 기존 코드를 유지하면서 점진적으로 적용 가능
   - 폼 검증부터 시작하여 API 응답 검증까지 확장 가능

3. **런타임 타입 검증**
   - API 응답 데이터의 런타임 검증 가능
   - 잘못된 데이터로 인한 버그 사전 방지

4. **이미 사용 중**
   - 프로젝트에 이미 설치되어 있음 (`zod: ^4.3.6`)
   - 폼 검증에 이미 사용 중 (LoginForm, SignupForm, MyPage)

5. **유연성**
   - 폼 검증, API 응답 검증, 환경 변수 검증 등 다양한 용도로 사용 가능
   - TypeScript 타입과 함께 사용 가능 (`z.infer<typeof schema>`)

6. **학습 곡선 낮음**
   - 간단한 스키마 정의로 시작 가능
   - 기존 TypeScript 지식으로 충분

#### ⚠️ 단점
1. **완전한 End-to-End 타입 안전성은 아님**
   - 백엔드와 프론트엔드 타입이 자동 동기화되지 않음
   - 수동으로 스키마를 정의해야 함

2. **수동 타입 정의 필요**
   - API 응답 스키마를 수동으로 작성해야 함
   - 백엔드 변경 시 수동 업데이트 필요

#### 결론: **현재 프로젝트에 적합** ✅

---

## 🎯 권장 사항: Zod 점진적 적용

### 적용 전략

#### Phase 1: API 응답 스키마 정의 (우선순위 높음)
```typescript
// entities/studio/model/schemas.ts
import { z } from "zod";

export const StudioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  transmissionType: z.enum(["live", "saved_video"]),
  storageLocation: z.enum(["local", "cloud"]),
  platforms: z.array(z.enum(["youtube", "chzzk", "twitch"])),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const StudioDetailSchema = StudioSchema.extend({
  currentLayout: z.enum(["full", "split", "three-grid", "four-grid", "custom"]),
  scenes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    isActive: z.boolean(),
  })),
  sources: z.array(z.object({
    id: z.string(),
    type: z.enum(["video", "audio", "image", "text", "browser"]),
    name: z.string(),
    isVisible: z.boolean(),
  })),
  isLive: z.boolean(),
  elapsedTime: z.string().optional(),
});

// 타입 추론
export type Studio = z.infer<typeof StudioSchema>;
export type StudioDetail = z.infer<typeof StudioDetailSchema>;
```

#### Phase 2: API 클라이언트에 검증 추가
```typescript
// shared/api/client.ts
export const apiClient = {
  get: async <T extends z.ZodTypeAny>(
    url: string,
    schema: T,
    config?: any
  ): Promise<z.infer<T>> => {
    const response = await axiosInstance.get(url, config);
    return schema.parse(response.data); // 런타임 검증
  },
  // ...
};
```

#### Phase 3: 모든 엔티티에 스키마 적용
- User, Channel, Video, Favorite 등 모든 엔티티에 zod 스키마 정의
- API 요청/응답에 검증 적용

---

## 📊 비교 요약표

| 항목 | Zod | tRPC |
|------|-----|------|
| **MSA 구조 호환** | ✅ 가능 | ❌ 불가능 |
| **점진적 적용** | ✅ 가능 | ❌ 불가능 (전면 재작성) |
| **기존 코드 유지** | ✅ 가능 | ❌ 불가능 |
| **End-to-End 타입 안전성** | ⚠️ 부분적 (수동 동기화) | ✅ 완전 자동 |
| **런타임 검증** | ✅ 가능 | ✅ 가능 |
| **학습 곡선** | ✅ 낮음 | ⚠️ 중간 |
| **백엔드 제약** | ✅ 없음 | ❌ Node.js/TS 필요 |
| **현재 프로젝트 적합성** | ✅ **적합** | ❌ **부적합** |

---

## ✅ 최종 결론

**Zod를 선택하는 것이 현재 프로젝트에 가장 적합합니다.**

### 이유:
1. ✅ MSA 구조와 완벽 호환
2. ✅ 이미 프로젝트에 설치되어 있음
3. ✅ 점진적 적용 가능 (기존 코드 유지)
4. ✅ 런타임 타입 검증으로 버그 방지
5. ✅ 학습 곡선이 낮음
6. ✅ RESTful API와 함께 사용 가능

### 다음 단계:
1. 엔티티 모델에 zod 스키마 추가
2. API 클라이언트에 검증 로직 추가
3. 점진적으로 모든 API 응답에 검증 적용

---

*작성일: 2026-01-26*
