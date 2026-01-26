import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import { z, ZodTypeAny } from "zod";
import { useAuthStore } from "@/stores/useAuthStore";

// 1. MSA 백엔드 주소 설정
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// 2. Axios 인스턴스 생성
const axiosInstance = axios.create({
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
};

// 3. 요청 인터셉터: 모든 요청에 토큰 주입
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 4. 응답 인터셉터: 공통 에러 핸들링
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // 토큰 만료 시 로그인 페이지 리다이렉트 처리
      console.error("인증이 만료되었습니다. 다시 로그인해주세요.");
    }

    return Promise.reject(error);
  },
);
