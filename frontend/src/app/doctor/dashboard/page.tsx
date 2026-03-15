"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { getApi } from "../../../lib/api";
import { ToastMessage, ToastStack } from "../../../components/Toast";
import { LoadingOverlay } from "../../../components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8001";

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

  // Phase 3: Search state
  const [searchQuery, setSearchQuery] = useState("");

  // ฟีเจอร์ที่ 3: QR Invite state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

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

  // ฟีเจอร์ที่ 3: สร้าง Invite Token สำหรับ QR Code
  const generateInvite = async () => {
    setGeneratingQr(true);
    try {
      const res = await api.post<{ token: string; invite_url: string; expires_at: string }>(`${API}/doctor/invite`);
      const fullUrl = `${window.location.origin}${res.data.invite_url}`;
      setInviteUrl(fullUrl);
      setInviteExpiry(new Date(res.data.expires_at).toLocaleString("th-TH"));
      setQrModalOpen(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "สร้าง QR Code ไม่สำเร็จ";
      pushToast({ kind: "error", message: msg });
    } finally {
      setGeneratingQr(false);
    }
  };

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
            <div className="mt-3 flex gap-2 flex-wrap">
              {doctorCode && (
                <button
                  className="btn-ghost px-3 py-2"
                  onClick={() => navigator.clipboard.writeText(doctorCode)}
                >
                  คัดลอก
                </button>
              )}
              {/* ฟีเจอร์ที่ 3: ปุ่มสร้าง QR Code */}
              <button
                className="btn-primary px-3 py-2 text-sm"
                onClick={generateInvite}
                disabled={generatingQr}
              >
                {generatingQr ? "กำลังสร้าง..." : "📱 สร้าง QR เชิญผู้ป่วย"}
              </button>
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-primaryDark">
                รายชื่อผู้ป่วย
              </h2>
              <span className="text-xs text-slate-500">
                {patients.length} คน
              </span>
            </div>
            {/* Phase 3: Search Bar */}
            <div className="mb-3">
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                placeholder="🔍 ค้นหาชื่อหรือรหัสผู้ป่วย..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ul className="divide-y">
              {patients
                .filter(
                  (p) =>
                    searchQuery.trim() === "" ||
                    p.username
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    String(p.id).includes(searchQuery),
                )
                .map((p) => (
                  <li
                    key={p.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-800">
                        {p.username}
                      </div>
                      <div className="text-xs text-slate-500">
                        รหัส MV-{p.id} • เชื่อมต่อ:{" "}
                        {new Date(p.connected_at).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                    {/* Phase 3: navigate to patient profile page */}
                    <button
                      onClick={() => router.push(`/doctor/patient/${p.id}`)}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      ดูโปรไฟล์ →
                    </button>
                  </li>
                ))}
              {patients.filter(
                (p) =>
                  searchQuery.trim() === "" ||
                  p.username
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  String(p.id).includes(searchQuery),
              ).length === 0 && (
                <li className="py-4 text-sm text-slate-500 text-center">
                  {searchQuery
                    ? `ไม่พบผู้ป่วย "${searchQuery}"`
                    : "ยังไม่มีการเชื่อมผู้ป่วย"}
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

      {/* ฟีเจอร์ที่ 3: QR Code Modal */}
      {qrModalOpen && inviteUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1040]">
          <div className="card glass p-6 max-w-sm w-full space-y-4 fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primaryDark">📱 เชิญผู้ป่วยด้วย QR Code</h3>
              <button
                className="text-slate-400 hover:text-slate-700 text-xl"
                onClick={() => setQrModalOpen(false)}
              >×</button>
            </div>
            <p className="text-sm text-slate-600">
              ให้ผู้ป่วยสแกน QR Code นี้เพื่อสมัครสมาชิก QR คู่นี้มีอายุ 24 ชั่วโมง
            </p>
            <div className="flex justify-center bg-white p-4 rounded-2xl">
              <QRCodeSVG value={inviteUrl} size={200} />
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 break-all">
              {inviteUrl}
            </div>
            {inviteExpiry && (
              <p className="text-xs text-slate-400 text-center">หมดอายุ: {inviteExpiry}</p>
            )}
            <div className="flex gap-2">
              <button
                className="btn-ghost flex-1"
                onClick={() => { navigator.clipboard.writeText(inviteUrl); pushToast({ kind: "success", message: "คัดลอกลิงก์แล้ว" }); }}
              >
                คัดลอกลิงก์
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => setQrModalOpen(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
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
