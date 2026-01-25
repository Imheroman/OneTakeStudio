import { create } from "zustand";


interface User {
  id: string
  name: string
}

interface AuthState {
  user: User | null;
  accessToken: string | null
  isLoggedIn: boolean;
  login: (userData: User, token: string) => void; 
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoggedIn: false,

  login: (userData, token) => 
    set({ 
      user: userData, 
      accessToken: token, 
      isLoggedIn: true 
    }),

  logout: () => 
    set({ 
      user: null, 
      accessToken: null, 
      isLoggedIn: false 
    }),
}))