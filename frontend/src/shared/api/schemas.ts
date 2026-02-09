/**
 * 공통 API 응답 스키마
 */
import { z } from "zod";

// 삭제 응답 스키마 (공통)
export const DeleteResponseSchema = z.object({
  message: z.string().optional(),
});

// 성공 응답 스키마 (공통)
export const SuccessResponseSchema = z.object({
  message: z.string().optional(),
  success: z.boolean().optional(),
});

// 에러 응답 스키마 (공통)
export const ErrorResponseSchema = z.object({
  message: z.string(),
  error: z.string().optional(),
  code: z.string().optional(),
});

// 타입 추론
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
