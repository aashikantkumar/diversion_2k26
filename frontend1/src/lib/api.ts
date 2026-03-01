import axios, { type InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Token store (access token in memory, refresh token in localStorage) ───
const REFRESH_KEY = "auth_refresh_token";
let _accessToken: string | null = null;

export const tokenStore = {
  getAccess: () => _accessToken,
  setAccess: (t: string | null) => { _accessToken = t; },
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string | null) => {
    if (t) localStorage.setItem(REFRESH_KEY, t);
    else localStorage.removeItem(REFRESH_KEY);
  },
  clear: () => {
    _accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Shared axios instance */
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

// ── Request: attach access token ──────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: on 401 → try refresh → retry once ──────────────
let _refreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const is401 = error.response?.status === 401;
    const isRefreshRoute = original.url?.includes("/auth/refresh") || original.url?.includes("/auth/login");

    if (is401 && !original._retry && !isRefreshRoute) {
      original._retry = true;

      if (_refreshing) {
        // Queue request until refresh completes
        return new Promise((resolve, reject) => {
          _refreshQueue.push((newToken) => {
            if (newToken) {
              original.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(original));
            } else {
              reject(error);
            }
          });
        });
      }

      _refreshing = true;
      const storedRefresh = tokenStore.getRefresh();
      if (!storedRefresh) {
        _refreshing = false;
        tokenStore.clear();
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken: storedRefresh,
        });
        tokenStore.setAccess(data.accessToken);
        tokenStore.setRefresh(data.refreshToken);

        // Flush queue
        _refreshQueue.forEach((cb) => cb(data.accessToken));
        _refreshQueue = [];

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        _refreshQueue.forEach((cb) => cb(null));
        _refreshQueue = [];
        tokenStore.clear();
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(error);
      } finally {
        _refreshing = false;
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;
