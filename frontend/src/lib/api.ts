import axios, { AxiosInstance } from "axios";

// Update the default base URL port to 8000, which is where FastAPI actually runs out of the box when we use the standard uvicorn command
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

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
