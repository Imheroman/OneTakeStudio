/**
 * Favorite 엔티티 zod 스키마 정의
 */
import { z } from "zod";
import { DeleteResponseSchema } from "@/shared/api/schemas";

// 즐겨찾기 파트너 스키마
export const FavoriteSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  email: z.string().email().optional(),
});

// 즐겨찾기 목록 응답 스키마
export const FavoriteListResponseSchema = z.object({
  favorites: z.array(FavoriteSchema),
  total: z.number(),
  maxCount: z.number(),
});

// 사용자 검색 결과 스키마
export const UserSearchResultSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  email: z.string().email(),
});

// 사용자 검색 응답 스키마
export const UserSearchResponseSchema = z.object({
  users: z.array(UserSearchResultSchema),
});

// 즐겨찾기 추가 요청 스키마
export const AddFavoriteRequestSchema = z.object({
  userId: z.string(),
});

// 즐겨찾기 추가 응답 스키마
export const AddFavoriteResponseSchema = z.object({
  message: z.string().optional(),
  favorite: FavoriteSchema.optional(),
});

// 삭제 응답 스키마는 shared/api/schemas.ts에서 import

// 타입 추론
export type Favorite = z.infer<typeof FavoriteSchema>;
export type FavoriteListResponse = z.infer<typeof FavoriteListResponseSchema>;
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;
export type UserSearchResponse = z.infer<typeof UserSearchResponseSchema>;
export type AddFavoriteRequest = z.infer<typeof AddFavoriteRequestSchema>;
export type AddFavoriteResponse = z.infer<typeof AddFavoriteResponseSchema>;
// DeleteResponse는 shared/api/schemas에서 export
