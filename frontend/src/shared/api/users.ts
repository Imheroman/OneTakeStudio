/**
 * 사용자(프로필) API — GET/PUT /api/users/me
 * 백엔드 ApiResponse<UserProfileResponse> 형식
 */
import { z } from "zod";
import { apiClient } from "./client";
import type { User } from "@/entities/user/model";

const UserProfileResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
  nickname: z.string(),
  profileImageUrl: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

const ApiResponseUserProfileSchema = z.object({
  resultCode: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
  data: UserProfileResponseSchema,
});

export type UpdateProfileRequest = {
  nickname?: string;
  profileImageUrl?: string | null;
};

/** 내 프로필 조회 — GET /api/users/me */
export async function getMyProfile(): Promise<User> {
  const res = await apiClient.get(
    "/api/users/me",
    ApiResponseUserProfileSchema,
  );
  const d = res.data;
  return {
    userId: d.userId,
    email: d.email,
    nickname: d.nickname,
    profileImageUrl: d.profileImageUrl ?? undefined,
  };
}

/** 프로필 수정 — PUT /api/users/me */
export async function updateProfile(
  body: UpdateProfileRequest,
): Promise<User> {
  const res = await apiClient.put(
    "/api/users/me",
    ApiResponseUserProfileSchema,
    body,
  );
  const d = res.data;
  return {
    userId: d.userId,
    email: d.email,
    nickname: d.nickname,
    profileImageUrl: d.profileImageUrl ?? undefined,
  };
}
