import axios, { AxiosInstance, AxiosError } from "axios";
import { useAuthStore } from "@/stores/useAuthStore";

// 1. MSA 백엔드 주소 설정
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// 2. Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 3. 요청 인터셉터: 모든 요청에 토큰 주입
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 4. 응답 인터셉터: 공통 에러 핸들링 및 데이터 포맷팅
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // 토큰 만료 시 로그인 페이지 리다이렉트 처리
      console.error("인증이 만료되었습니다. 다시 로그인해주세요.");
    }

    return Promise.reject(error);
  },
);
