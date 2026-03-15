"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastMessage, ToastStack } from "../../../components/Toast";
import { LoadingOverlay } from "../../../components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8001";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "doctor">("user");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doctorCode, setDoctorCode] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // ฟีเจอร์ที่ 3: รับ invite token จาก URL query string
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("invite");
    if (t) setInviteToken(t);
  }, []);

  const pushToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...toast }]);
  };
  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const parseError = (err: any): string => {
    const detail = err?.response?.data?.detail;
    if (!detail) return "สมัครไม่สำเร็จ";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d?.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof detail === "object") return detail.msg || JSON.stringify(detail);
    return "สมัครไม่สำเร็จ";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = { username, password, role };
      if (doctorCode.trim()) payload.doctor_code = doctorCode.trim();
      // ฟีเจอร์ที่ 3: ส่ง invite_token ไปด้วยถ้ามี (เชื่อมผู้ป่วยกับแพทย์อัตโนมัติ)
      if (inviteToken) payload.invite_token = inviteToken;
      await axios.post(`${API}/auth/register`, payload);
      // auto login
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);
      const loginRes = await axios.post(`${API}/auth/login`, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("token", loginRes.data.access_token);
      pushToast({ kind: "success", message: "สมัครสำเร็จและเข้าสู่ระบบแล้ว" });
      router.push(role === "doctor" ? "/doctor/dashboard" : "/user/chat");
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
        <div className="pill bg-mint/15 text-primary w-fit">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
          สร้างบัญชีใหม่
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-primaryDark leading-tight">
          เริ่มต้นใช้ MindVault
        </h1>
        <p className="text-slate-600 leading-relaxed">
          เลือกได้ทั้งโหมดผู้ใช้ทั่วไปสำหรับบันทึกความรู้สึก
          หรือโหมดแพทย์เพื่อดูแลผู้ป่วยและส่งสรุป AI ราย 30 วัน
        </p>
        <ul className="text-slate-700 space-y-2">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" /> Export PDF สรุปผู้ป่วย
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warn" /> คำขอเชื่อมต่อระหว่างแพทย์-ผู้ป่วย
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-calm" /> ปรับโทน AI ตาม MBTI
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
            <div className="text-lg font-bold text-primary">สมัครสมาชิก</div>
            <div className="text-sm text-slate-500">เลือกรูปแบบบัญชีที่เหมาะกับคุณ</div>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              บทบาท
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  role === "user"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-700 hover:border-primary/40"
                }`}
                onClick={() => setRole("user")}
              >
                ผู้ใช้ทั่วไป
                <div className="text-xs text-slate-500">จดบันทึกและคุยกับ AI</div>
              </button>
              <button
                type="button"
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  role === "doctor"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-700 hover:border-primary/40"
                }`}
                onClick={() => setRole("doctor")}
              >
                แพทย์
                <div className="text-xs text-slate-500">เชื่อมผู้ป่วยและดูสรุป</div>
              </button>
            </div>
          </div>
          {role === "doctor" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                รหัสแพทย์ (ถ้ามี)
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={doctorCode}
                onChange={(e) => setDoctorCode(e.target.value)}
                placeholder="กรอกเพื่อให้ผู้ป่วยเชื่อมถึงคุณได้เร็วขึ้น"
              />
            </div>
          )}
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl text-base"
          >
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>

        <p className="text-sm mt-5 text-slate-600 text-center">
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="text-primary font-semibold">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <LoadingOverlay show={loading} title="กำลังสร้างบัญชี" subtitle="กำลังเชื่อมต่อระบบ MindVault" />
    </div>
  );
}
