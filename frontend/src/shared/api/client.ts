import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
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

// 타입 안전한 apiClient 래퍼
export const apiClient = {
  get: <T = any>(url: string, config?: any): Promise<T> => {
    return axiosInstance.get<T>(url, config).then((res) => res.data);
  },
  post: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    return axiosInstance.post<T>(url, data, config).then((res) => res.data);
  },
  put: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    return axiosInstance.put<T>(url, data, config).then((res) => res.data);
  },
  delete: <T = any>(url: string, config?: any): Promise<T> => {
    return axiosInstance.delete<T>(url, config).then((res) => res.data);
  },
  patch: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    return axiosInstance.patch<T>(url, data, config).then((res) => res.data);
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
