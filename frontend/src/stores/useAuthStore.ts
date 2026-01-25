// src/stores/useAuthStore.ts
import { create } from "zustand";

// 1. 상태(State)와 동작(Action)의 타입 정의
interface User {
  id: string;
  name?: string;
}

interface AuthState {
  user: User | null; // 로그인한 유저 정보 (없으면 null)
  isLoggedIn: boolean; // 로그인 여부
  login: (userData: User) => void; // 로그인 함수
  logout: () => void; // 로그아웃 함수
}

// 2. 스토어 생성
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,

  // 로그인 시 유저 정보를 저장하고 isLoggedIn을 true로 변경
  login: (userData) => set({ user: userData, isLoggedIn: true }),

  // 로그아웃 시 정보를 초기화
  logout: () => set({ user: null, isLoggedIn: false }),
}));
