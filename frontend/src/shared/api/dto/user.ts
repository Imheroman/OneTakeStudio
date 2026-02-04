/**
 * 사용자(프로필) API 전용 DTO
 * FSD: shared/api는 entities 미참조. 응답·요청 스키마만 정의.
 */
import { z } from "zod";

/** GET/PUT /api/users/me 응답 data 필드 스키마 */
export const UserProfileDtoSchema = z.object({
  userId: z.string(),
  email: z.string(),
  nickname: z.string(),
  profileImageUrl: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export type UserProfileDto = z.infer<typeof UserProfileDtoSchema>;

/** ApiResponse<UserProfileResponse> 래퍼 스키마 */
export const ApiResponseUserProfileSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: UserProfileDtoSchema,
});
