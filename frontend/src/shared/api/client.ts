import axios, { AxiosInstance, AxiosError } from "axios";
import { z, ZodTypeAny } from "zod";

// 1. MSA 백엔드 주소 설정
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// 2. Axios 인스턴스 생성 (토큰 인터셉터는 app 레이어에서 등록)
export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 타입 안전한 apiClient 래퍼
 * zod 스키마를 사용하여 런타임 검증을 수행합니다.
 */
export const apiClient = {
  /**
   * GET 요청 (zod 스키마로 검증)
   * @param url API 엔드포인트
   * @param schema zod 스키마 (검증용)
   * @param config Axios 설정
   * @returns 검증된 데이터
   */
  get: <T extends ZodTypeAny>(
    url: string,
    schema: T,
    config?: any,
  ): Promise<z.infer<T>> => {
    return axiosInstance
      .get(url, config)
      .then((res) => res.data)
      .then((data) => {
        try {
          return schema.parse(data);
        } catch (error) {
          console.error(`[API Validation Error] GET ${url}:`, error);
          if (error instanceof z.ZodError) {
            const zodError = error as z.ZodError;
            throw new Error(
              `API 응답 검증 실패: ${zodError.issues.map((issue) => issue.message).join(", ")}`,
            );
          }
          throw new Error("API 응답 검증 실패: 알 수 없는 오류");
        }
      });
  },

  /**
   * POST 요청 (zod 스키마로 검증)
   * @param url API 엔드포인트
   * @param schema zod 스키마 (검증용)
   * @param data 요청 데이터
   * @param config Axios 설정
   * @returns 검증된 데이터
   */
  post: <T extends ZodTypeAny>(
    url: string,
    schema: T,
    data?: any,
    config?: any,
  ): Promise<z.infer<T>> => {
    return axiosInstance
      .post(url, data, config)
      .then((res) => res.data)
      .then((responseData) => {
        try {
          return schema.parse(responseData);
        } catch (error) {
          console.error(`[API Validation Error] POST ${url}:`, error);
          if (error instanceof z.ZodError) {
            const zodError = error as z.ZodError;
            throw new Error(
              `API 응답 검증 실패: ${zodError.issues.map((issue) => issue.message).join(", ")}`,
            );
          }
          throw new Error("API 응답 검증 실패: 알 수 없는 오류");
        }
      })
      .catch((error: any) => {
        // 네트워크 에러 처리
        if (
          error.code === "ERR_NETWORK" ||
          error.message?.includes("Network Error")
        ) {
          const networkError = new Error(
            "네트워크 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요.",
          );
          (networkError as any).isNetworkError = true;
          throw networkError;
        }
        // 기존 에러는 그대로 전달
        throw error;
      });
  },

  /**
   * PUT 요청 (zod 스키마로 검증)
   * @param url API 엔드포인트
   * @param schema zod 스키마 (검증용)
   * @param data 요청 데이터
   * @param config Axios 설정
   * @returns 검증된 데이터
   */
  put: <T extends ZodTypeAny>(
    url: string,
    schema: T,
    data?: any,
    config?: any,
  ): Promise<z.infer<T>> => {
    return axiosInstance
      .put(url, data, config)
      .then((res) => res.data)
      .then((responseData) => {
        try {
          return schema.parse(responseData);
        } catch (error) {
          console.error(`[API Validation Error] PUT ${url}:`, error);
          if (error instanceof z.ZodError) {
            const zodError = error as z.ZodError;
            throw new Error(
              `API 응답 검증 실패: ${zodError.issues.map((issue) => issue.message).join(", ")}`,
            );
          }
          throw new Error("API 응답 검증 실패: 알 수 없는 오류");
        }
      });
  },

  /**
   * DELETE 요청 (zod 스키마로 검증)
   * @param url API 엔드포인트
   * @param schema zod 스키마 (검증용)
   * @param config Axios 설정
   * @returns 검증된 데이터
   */
  delete: <T extends ZodTypeAny>(
    url: string,
    schema: T,
    config?: any,
  ): Promise<z.infer<T>> => {
    return axiosInstance
      .delete(url, config)
      .then((res) => res.data)
      .then((data) => {
        try {
          return schema.parse(data);
        } catch (error) {
          console.error(`[API Validation Error] DELETE ${url}:`, error);
          if (error instanceof z.ZodError) {
            const zodError = error as z.ZodError;
            throw new Error(
              `API 응답 검증 실패: ${zodError.issues.map((issue) => issue.message).join(", ")}`,
            );
          }
          throw new Error("API 응답 검증 실패: 알 수 없는 오류");
        }
      });
  },

  /**
   * PATCH 요청 (zod 스키마로 검증)
   * @param url API 엔드포인트
   * @param schema zod 스키마 (검증용)
   * @param data 요청 데이터
   * @param config Axios 설정
   * @returns 검증된 데이터
   */
  patch: <T extends ZodTypeAny>(
    url: string,
    schema: T,
    data?: any,
    config?: any,
  ): Promise<z.infer<T>> => {
    return axiosInstance
      .patch(url, data, config)
      .then((res) => res.data)
      .then((responseData) => {
        try {
          return schema.parse(responseData);
        } catch (error) {
          console.error(`[API Validation Error] PATCH ${url}:`, error);
          if (error instanceof z.ZodError) {
            const zodError = error as z.ZodError;
            throw new Error(
              `API 응답 검증 실패: ${zodError.issues.map((issue) => issue.message).join(", ")}`,
            );
          }
          throw new Error("API 응답 검증 실패: 알 수 없는 오류");
        }
      });
  },

  /**
   * FormData 업로드 (multipart/form-data, Content-Type 자동 설정)
   */
  postForm: (
    url: string,
    formData: FormData,
    config?: any,
  ): Promise<unknown> => {
    return axiosInstance
      .post(url, formData, {
        ...config,
        headers: {
          ...config?.headers,
          "Content-Type": undefined, // 브라우저가 boundary 포함 multipart/form-data 설정
        },
      })
      .then((res) => res.data);
  },
};

// 3. 요청 인터셉터는 app 레이어(ApiAuthProvider)에서 등록 (FSD: shared는 stores 미참조)
// 4. 응답 인터셉터: 공통 에러 핸들링
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // 토큰 만료 시 로그아웃 처리 및 로그인 페이지로 리다이렉트
      console.error("[Auth] 인증이 만료되었습니다. 로그아웃 처리합니다.");
      useAuthStore.getState().logout();

      // 브라우저 환경에서만 리다이렉트
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);
