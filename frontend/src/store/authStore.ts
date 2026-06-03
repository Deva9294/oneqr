import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  qrCode: string;
  qrCodeImage: string;
  upiId: string;
  activeProfile: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, isAuthenticated: true, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false, token: null });
  },
}));
