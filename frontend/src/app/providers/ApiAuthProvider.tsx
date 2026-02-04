"use client";

import { useEffect } from "react";
import { AxiosError } from "axios";
import { axiosInstance } from "@/shared/api/client";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * app 레이어: shared axios 인스턴스에 인증 요청·응답 인터셉터 등록.
 * FSD: shared는 stores를 참조하지 않고, app에서 stores와 shared를 연결.
 */
export function ApiAuthProvider() {
  useEffect(() => {
    const requestId = axiosInstance.interceptors.request.use(
      (config) => {
        const { accessToken, user } = useAuthStore.getState();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        if (user?.userId && config.headers) {
          config.headers["X-User-Id"] = user.userId;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseId = axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.error("[Auth] 인증이 만료되었습니다. 로그아웃 처리합니다.");
          useAuthStore.getState().logout();
          if (typeof window !== "undefined") {
            const redirect = encodeURIComponent(
              window.location.pathname || "/workspace"
            );
            window.location.href = `/?auth=login&redirect=${redirect}`;
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(requestId);
      axiosInstance.interceptors.response.eject(responseId);
    };
  }, []);
  return null;
}
