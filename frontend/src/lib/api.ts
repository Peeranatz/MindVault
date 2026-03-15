import axios, { AxiosInstance } from "axios";

// Default to backend port 8001 used by this project run scripts.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8001";

export function getApi(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE,
  });

  instance.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
      return Promise.reject(err);
    },
  );

  return instance;
}
