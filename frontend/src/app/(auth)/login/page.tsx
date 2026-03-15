"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getApi } from "../../../lib/api";
import { ToastMessage, ToastStack } from "../../../components/Toast";
import { LoadingOverlay } from "../../../components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8001";

type UserMe = {
  id: number;
  username: string;
  role: "user" | "doctor";
  mbti_type?: string | null;
  doctor_code?: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const api = useMemo(() => getApi(), []);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...toast }]);
  };
  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (t) {
      api
        .get<UserMe>("/auth/me")
        .then((res) => {
          router.push(res.data.role === "doctor" ? "/doctor/dashboard" : "/user/chat");
        })
        .catch(() => {
          localStorage.removeItem("token");
        });
    }
  }, [api, router]);

  const parseError = (err: any): string => {
    const detail = err?.response?.data?.detail;
    if (!detail) return "เข้าสู่ระบบไม่สำเร็จ";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d?.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof detail === "object") return detail.msg || JSON.stringify(detail);
    return "เข้าสู่ระบบไม่สำเร็จ";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);
      const res = await axios.post(`${API}/auth/login`, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const token = res.data.access_token;
      localStorage.setItem("token", token);
      const me = await api.get<UserMe>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      pushToast({ kind: "success", message: "ยินดีต้อนรับกลับเข้าสู่ MindVault" });
      router.push(me.data.role === "doctor" ? "/doctor/dashboard" : "/user/chat");
    } catch (err: any) {
      const message = parseError(err);
      setError(message);
      pushToast({ kind: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-10 items-center min-h-[70vh]">
      <div className="space-y-4">
        <div className="pill bg-primary/10 text-primary w-fit">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
          พื้นที่ปลอดภัยสำหรับจิตใจ
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-primaryDark leading-tight">
          MindVault: ดูแลใจคุณ พร้อมทีมแพทย์
        </h1>
        <p className="text-slate-600 leading-relaxed">
          จดบันทึกความรู้สึก รับการตอบกลับจาก AI ที่ปรับโทนตาม MBTI ของคุณ
          และเชื่อมต่อกับแพทย์ของคุณได้อย่างปลอดภัย
        </p>
        <ul className="text-slate-700 space-y-2">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mint" /> แจ้งเตือน Crisis พร้อมเบอร์ 1323
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky" /> รองรับแพทย์และผู้ใช้ทั่วไป
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blush" /> ข้อมูลถูกแยกส่วน ปลอดภัย
          </li>
        </ul>
      </div>

      <div className="card glass p-7 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
            <svg viewBox="0 0 24 24" className="w-7 h-7">
              <path
                d="M12 2a5 5 0 0 0-5 5v3H6a1 1 0 0 0-1 1v9h4v-5a3 3 0 0 1 6 0v5h4v-9a1 1 0 0 0-1-1h-1V7a5 5 0 0 0-5-5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <div className="text-lg font-bold text-primary">เข้าสู่ระบบ</div>
            <div className="text-sm text-slate-500">สำหรับผู้ใช้ทั่วไปและแพทย์</div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ชื่อผู้ใช้
            </label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              type="password"
              className="w-full border border-slate-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••"
            />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl text-base"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="text-sm mt-5 text-slate-600 text-center">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-primary font-semibold">
            สมัครสมาชิก
          </Link>
        </p>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <LoadingOverlay show={loading} title="กำลังเข้าสู่ระบบ" subtitle="โปรดรอสักครู่" />
    </div>
  );
}
