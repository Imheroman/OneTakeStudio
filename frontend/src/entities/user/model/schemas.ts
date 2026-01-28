/**
 * User 엔티티 zod 스키마 정의
 * 백엔드 Core Service 응답 구조에 맞춤
 */
import { z } from "zod";

// 사용자 스키마 (백엔드 LoginResponse.UserDto 매핑)
export const UserSchema = z.object({
  userId: z.string(),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  nickname: z.string(),
  profileImageUrl: z.string().nullable().optional(),
});

// 로그인 응답 데이터 스키마
export const LoginDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

// 백엔드 ApiResponse 래퍼 스키마
export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: LoginDataSchema,
});

// 간단한 응답 스키마 (회원가입, 이메일 인증 등)
export const SimpleResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
});

// 이메일 중복 확인 응답
export const CheckEmailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    available: z.boolean(),
    reason: z.string(),
  }),
});

// 로그인 요청 스키마
export const LoginRequestSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

// 회원가입 요청 스키마 (백엔드 RegisterRequest 매핑)
export const SignupRequestSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
  verificationCode: z.string().min(6, "인증 코드를 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  nickname: z.string().min(2, "닉네임은 2글자 이상이어야 합니다."),
});

// 이메일 인증 요청 스키마
export const SendVerificationRequestSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
});

export const VerifyEmailRequestSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6),
});

// 타입 추론
export type User = z.infer<typeof UserSchema>;
export type LoginData = z.infer<typeof LoginDataSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type SimpleResponse = z.infer<typeof SimpleResponseSchema>;
export type CheckEmailResponse = z.infer<typeof CheckEmailResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
