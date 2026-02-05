/**
 * 사용자(프로필) API — GET/PUT /api/users/me
 * 백엔드 ApiResponse<UserProfileResponse> 형식
 * FSD: shared는 entities 미참조. dto/user 사용.
 */
import { apiClient } from "./client";
import {
  ApiResponseUserProfileSchema,
  type UserProfileDto,
} from "./dto/user";
import { SuccessResponseSchema } from "./schemas";

export type UpdateProfileRequest = {
  nickname?: string;
  profileImageUrl?: string | null;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function toProfileDto(d: { userId: string; email: string; nickname: string; profileImageUrl?: string | null; createdAt?: string }): UserProfileDto {
  return {
    userId: d.userId,
    email: d.email,
    nickname: d.nickname,
    profileImageUrl: d.profileImageUrl ?? undefined,
    ...(d.createdAt != null && { createdAt: d.createdAt }),
  };
}

/** 내 프로필 조회 — GET /api/users/me */
export async function getMyProfile(): Promise<UserProfileDto> {
  const res = await apiClient.get(
    "/api/users/me",
    ApiResponseUserProfileSchema,
  );
  return toProfileDto(res.data);
}

/** 프로필 수정 — PUT /api/users/me */
export async function updateProfile(
  body: UpdateProfileRequest,
): Promise<UserProfileDto> {
  const res = await apiClient.put(
    "/api/users/me",
    ApiResponseUserProfileSchema,
    body,
  );
  return toProfileDto(res.data);
}

/** 비밀번호 변경 — PUT /api/users/password */
export async function changePassword(
  body: ChangePasswordRequest,
): Promise<void> {
  await apiClient.put(
    "/api/users/password",
    SuccessResponseSchema,
    body,
  );
}
