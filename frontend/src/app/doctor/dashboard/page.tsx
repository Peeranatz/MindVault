"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApi } from "../../../lib/api";
import { ToastMessage, ToastStack } from "../../../components/Toast";
import { LoadingOverlay } from "../../../components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type Patient = { id: number; username: string; connected_at: string };
type Summary = {
  patient_id: number;
  entries: number;
  avg_mood: number | null;
  crisis_flags: number;
  last_entry_at: string | null;
};
type ConnectReq = {
  id: number;
  patient_id: number;
  status: string;
  created_at: string;
  patient?: { username: string };
};
type Me = {
  username: string;
  role: "doctor" | "user";
  doctor_code?: string | null;
};

export default function DoctorDashboard() {
  const router = useRouter();
  const api = useMemo(() => getApi(), []);
  const [token, setToken] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [patientUsername, setPatientUsername] = useState("");
  const [requests, setRequests] = useState<ConnectReq[]>([]);
  const [doctorCode, setDoctorCode] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...toast }]);
  };
  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) {
      loadPatients();
      loadRequests();
      loadMe();
    } else {
      router.push("/login");
    }
  }, []);

  const loadPatients = async () => {
    try {
      const res = await api.get<Patient[]>(`${API}/doctor/patients`);
      setPatients(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "โหลดรายชื่อผู้ป่วยไม่สำเร็จ");
    }
  };

  const loadRequests = async () => {
    try {
      const res = await api.get<ConnectReq[]>(`${API}/connect/requests`);
      setRequests(res.data);
    } catch (err: any) {
      /* ignore */
    }
  };

  const loadMe = async () => {
    try {
      const res = await api.get<Me>("/auth/me");
      setDoctorCode(res.data.doctor_code || null);
    } catch (err) {
      /* ignore */
    }
  };

  const loadSummary = async (id: number) => {
    if (!token) return;
    setLoadingSummary(true);
    try {
      const res = await api.get<Summary>(
        `${API}/doctor/patients/${id}/summary`,
      );
      setSummary(res.data);
      setSelected(id);
      const found = patients.find((p) => p.id === id);
      setSelectedPatientName(found?.username || null);
    } catch (err: any) {
      const message = err?.response?.data?.detail || "โหลดสรุปไม่สำเร็จ";
      setError(message);
      pushToast({ kind: "error", message });
    } finally {
      setLoadingSummary(false);
    }
  };

  const connectPatient = async () => {
    if (!token || !patientUsername.trim()) return;
    setError(null);
    try {
      await api.post(`${API}/doctor/connect`, {
        patient_username: patientUsername.trim(),
      });
      setPatientUsername("");
      await loadPatients();
      pushToast({ kind: "success", message: "เชื่อมผู้ป่วยสำเร็จ" });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(detail || "เชื่อมผู้ป่วยไม่สำเร็จ");
      pushToast({ kind: "error", message: detail || "เชื่อมผู้ป่วยไม่สำเร็จ" });
    }
  };

  const handleRequest = async (id: number, action: "approve" | "reject") => {
    try {
      await api.post(`${API}/connect/handle`, { request_id: id, action });
      await loadPatients();
      await loadRequests();
      pushToast({
        kind: action === "approve" ? "success" : "info",
        message: action === "approve" ? "อนุมัติคำขอแล้ว" : "ปฏิเสธคำขอแล้ว",
      });
    } catch (err: any) {
      const message = err?.response?.data?.detail || "ดำเนินการไม่สำเร็จ";
      setError(message);
      pushToast({ kind: "error", message });
    }
  };

  const exportPdf = () => {
    if (!summary) {
      const msg = "กรุณาเลือกผู้ป่วยและดูสรุปก่อน";
      setError(msg);
      pushToast({ kind: "info", message: msg });
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="pill bg-primary/10 text-primary w-fit mb-2">
            <span className="w-2 h-2 rounded-full bg-primary" /> MindVault Pro •
            Doctor
          </div>
          <h1 className="text-3xl font-extrabold text-primaryDark">
            Patient Dashboard
          </h1>
          <p className="text-slate-600">
            เชื่อมต่อผู้ป่วย ดูสรุป AI และ Export PDF
          </p>
        </div>
        <button
          className="btn-primary no-print"
          onClick={exportPdf}
          disabled={!summary}
        >
          Export PDF
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-4 no-print">
          <div className="card glass p-5">
            <div className="text-sm text-slate-500">รหัสแพทย์ของคุณ</div>
            <div className="text-2xl font-bold text-primaryDark">
              {doctorCode || "-"}
            </div>
            <div className="mt-3 flex gap-2">
              {doctorCode && (
                <button
                  className="btn-ghost px-3 py-2"
                  onClick={() => navigator.clipboard.writeText(doctorCode)}
                >
                  คัดลอก
                </button>
              )}
            </div>
          </div>

          <div className="card glass p-5 space-y-3">
            <div className="text-lg font-semibold text-primaryDark">
              เชื่อมผู้ป่วยด้วยชื่อผู้ใช้
            </div>
            <div className="flex gap-2">
              <input
                className="border border-slate-200 rounded-xl px-3 py-3 flex-1 focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="patient username"
                value={patientUsername}
                onChange={(e) => setPatientUsername(e.target.value)}
              />
              <button
                className="btn-primary px-4"
                disabled={!patientUsername.trim()}
                onClick={connectPatient}
              >
                เชื่อม
              </button>
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
          </div>

          <div className="card glass p-5 space-y-3">
            <div className="text-lg font-semibold text-primaryDark">
              คำขอเชื่อมต่อ
            </div>
            <ul className="divide-y">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="py-2 flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-medium">
                      ผู้ป่วย #{r.patient_id}{" "}
                      {r.patient?.username && `(${r.patient.username})`}
                    </div>
                    <div className="text-xs text-slate-500">
                      สถานะ: {r.status}
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(r.id, "approve")}
                        className="px-3 py-1 rounded bg-calm text-white text-xs"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => handleRequest(r.id, "reject")}
                        className="px-3 py-1 rounded bg-danger text-white text-xs"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {requests.length === 0 && (
                <li className="py-2 text-sm text-slate-500">ยังไม่มีคำขอ</li>
              )}
            </ul>
          </div>
        </aside>

        <main className="lg:col-span-8 space-y-4">
          <div className="card glass p-5 no-print">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-primaryDark">
                รายชื่อผู้ป่วย
              </h2>
              <span className="text-xs text-slate-500">
                เลือกเพื่อดูสรุป 30 วัน
              </span>
            </div>
            <ul className="divide-y">
              {patients.map((p) => (
                <li
                  key={p.id}
                  className={`py-3 flex items-center justify-between ${
                    selected === p.id ? "bg-primary/5 rounded-xl px-3" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      {p.username}
                    </div>
                    <div className="text-xs text-slate-500">
                      เชื่อมต่อ: {new Date(p.connected_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => loadSummary(p.id)}
                    className="text-sm text-primary hover:underline"
                  >
                    ดูสรุป
                  </button>
                </li>
              ))}
              {patients.length === 0 && (
                <li className="py-3 text-sm text-slate-500">
                  ยังไม่มีการเชื่อมผู้ป่วย
                </li>
              )}
            </ul>
          </div>

          {summary ? (
            <div className="card glass p-6 print-section">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">
                    สรุป 30 วัน (ผู้ป่วย #{summary.patient_id}
                    {selectedPatientName ? ` • ${selectedPatientName}` : ""})
                  </div>
                  <h3 className="text-2xl font-bold text-primaryDark">
                    AI Clinical Summary
                  </h3>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <StatCard label="จำนวนบันทึก" value={summary.entries} />
                <StatCard
                  label="ค่าเฉลี่ยอารมณ์"
                  value={summary.avg_mood ?? "-"}
                  tone="mint"
                />
                <StatCard
                  label="จำนวน Crisis"
                  value={summary.crisis_flags}
                  tone="danger"
                  hint="หากมีสูงควรติดตามใกล้ชิด"
                />
                <StatCard
                  label="บันทึกล่าสุด"
                  value={
                    summary.last_entry_at
                      ? new Date(summary.last_entry_at).toLocaleString()
                      : "-"
                  }
                />
              </div>
            </div>
          ) : (
            <div className="card glass p-6 text-center text-slate-500">
              เลือกผู้ป่วยเพื่อดูสรุป AI 30 วัน
            </div>
          )}

          <div className="card glass p-6 no-print">
            <h3 className="text-lg font-semibold text-primaryDark">
              Global Statistics
            </h3>
            <p className="text-slate-600">
              หน้ารวมสถิติผู้ป่วยทั้งหมด (placeholder)
              เมื่อมีข้อมูลรวมจะแสดงที่นี่
            </p>
          </div>
        </main>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <LoadingOverlay
        show={loadingSummary}
        title="กำลังโหลดสรุปผู้ป่วย"
        subtitle="เรียกข้อมูล 30 วันล่าสุด"
      />
    </div>
  );
}

type StatProps = {
  label: string;
  value: React.ReactNode;
  tone?: "mint" | "danger";
  hint?: string;
};

const StatCard: React.FC<StatProps> = ({ label, value, tone, hint }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div
        className={`text-xl font-bold ${
          tone === "mint"
            ? "text-primary"
            : tone === "danger"
              ? "text-danger"
              : "text-primaryDark"
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
};
