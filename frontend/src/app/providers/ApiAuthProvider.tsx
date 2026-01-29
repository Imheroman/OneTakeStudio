"use client";

import { useEffect } from "react";
import { axiosInstance } from "@/shared/api/client";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * app 레이어: shared axios 인스턴스에 인증 토큰 인터셉터 등록.
 * FSD: shared는 stores를 참조하지 않고, app에서 stores와 shared를 연결.
 */
export function ApiAuthProvider() {
  useEffect(() => {
    const interceptorId = axiosInstance.interceptors.request.use(
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
    return () => {
      axiosInstance.interceptors.request.eject(interceptorId);
    };
  }, []);
  return null;
}
