/**
 * User 엔티티 zod 스키마 정의
 */
import { z } from "zod";

// 사용자 스키마
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  name: z.string().min(1, "이름을 입력해주세요."),
});

// 인증 응답 스키마
export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  message: z.string().optional(),
});

// 로그인 요청 스키마
export const LoginRequestSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

// 회원가입 요청 스키마
export const SignupRequestSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  name: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
  nickname: z.string().min(2, "닉네임은 2글자 이상이어야 합니다."),
});

// 타입 추론
export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
