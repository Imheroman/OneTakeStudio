/**
 * User 엔티티 모델 export
 * FSD Phase 1: User 타입은 shared/api/dto에서 재사용 (entities → shared 허용)
 */
export type { UserProfileDto as User } from "@/shared/api/dto/user";

// 타입 export (zod 스키마에서 추론, User 제외)
export type {
  LoginData,
  AuthResponse,
  SimpleResponse,
  CheckEmailResponse,
  LoginRequest,
  SignupRequest,
} from "./schemas";

// 스키마 export
export {
  UserSchema,
  LoginDataSchema,
  AuthResponseSchema,
  SimpleResponseSchema,
  CheckEmailResponseSchema,
  LoginRequestSchema,
  SignupRequestSchema,
  SendVerificationRequestSchema,
  VerifyEmailRequestSchema,
} from "./schemas";
