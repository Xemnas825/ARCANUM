import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client';

const TOKEN_KEY = 'arcanum_token';
const USER_KEY = 'arcanum_user';

export interface User {
  id: number;
  username: string;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  let initialUser: User | null = null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    initialUser = raw ? JSON.parse(raw) : null;
  } catch {
    initialUser = null;
  }
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<User | null>(initialUser);

  const isLoggedIn = computed(() => !!token.value && !!user.value);

  function setAuth(newUser: User, newToken: string) {
    user.value = newUser;
    token.value = newToken;
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    localStorage.setItem(TOKEN_KEY, newToken);
  }

  function clearAuth() {
    user.value = null;
    token.value = null;
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  async function register(username: string, email: string, password: string) {
    const data = await api.post<{ user: User; token: string }>('/auth/register', {
      username,
      email,
      password,
    });
    setAuth(data.user, data.token);
    return data;
  }

  async function login(email: string, password: string) {
    const data = await api.post<{ user: User; token: string }>('/auth/login', {
      email,
      password,
    });
    setAuth(data.user, data.token);
    return data;
  }

  function logout() {
    clearAuth();
  }

  function initFromStorage() {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t) token.value = t;
    if (u) {
      try {
        user.value = JSON.parse(u);
      } catch {
        user.value = null;
      }
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    register,
    login,
    logout,
    initFromStorage,
  };
});
