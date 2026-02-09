/**
 * Favorite 엔티티 모델 export
 */
// 타입 export (zod 스키마에서 추론)
export type {
  Favorite,
  FavoriteListResponse,
  UserSearchResult,
  UserSearchResponse,
  AddFavoriteRequest,
  AddFavoriteResponse,
} from "./schemas";

// 스키마 export
export {
  FavoriteSchema,
  FavoriteListResponseSchema,
  UserSearchResultSchema,
  UserSearchResponseSchema,
  AddFavoriteRequestSchema,
  AddFavoriteResponseSchema,
} from "./schemas";

// 공통 스키마 re-export
export { DeleteResponseSchema } from "@/shared/api/schemas";
