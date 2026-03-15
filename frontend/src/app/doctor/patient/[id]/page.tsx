"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getApi } from "../../../../lib/api";
import { ToastMessage, ToastStack } from "../../../../components/Toast";
import { LoadingOverlay } from "../../../../components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8001";

type MoodPoint = { date: string; avg_mood: number };
type DistortionCount = { type: string; count: number };
type ProfileData = {
  patient_id: number;
  username: string;
  mbti_type: string | null;
  connected_at: string;
  entries_30d: number;
  avg_mood_30d: number | null;
  crisis_flags_30d: number;
  last_entry_at: string | null;
  mood_trend: MoodPoint[];
  distortions: DistortionCount[];
  ai_summary: string | null;
};

const MOOD_COLORS = [
  "",
  "bg-red-400",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-green-500",
];
const MOOD_LABELS = ["", "แย่มาก", "แย่", "กลางๆ", "ดี", "ดีมาก"];

export default function PatientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string;
  const api = useMemo(() => getApi(), []);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (toast: Omit<ToastMessage, "id">) =>
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), ...toast }]);
  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    loadProfile();
  }, [patientId]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ProfileData>(
        `${API}/doctor/patients/${patientId}/profile`,
      );
      setProfile(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "โหลดข้อมูลไม่สำเร็จ";
      setError(msg);
      pushToast({ kind: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const moodColor = (mood: number) =>
    MOOD_COLORS[Math.min(5, Math.max(1, Math.round(mood)))] || "bg-slate-300";
  const moodLabel = (mood: number) =>
    MOOD_LABELS[Math.min(5, Math.max(1, Math.round(mood)))] || "-";

  const totalDistortions =
    profile?.distortions.reduce((s, d) => s + d.count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/doctor/dashboard")}
            className="btn-ghost px-3 py-2 text-sm no-print"
          >
            ← กลับ
          </button>
          <div>
            <div className="pill bg-primary/10 text-primary w-fit mb-1">
              <span className="w-2 h-2 rounded-full bg-primary" /> รายงานผู้ป่วย
            </div>
            <h1 className="text-2xl font-extrabold text-primaryDark">
              {profile?.username || `ผู้ป่วย #${patientId}`}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap mt-0.5">
              <span className="font-mono">MV-{patientId}</span>
              {profile?.mbti_type && (
                <span className="bg-calm/20 text-calm px-2 py-0.5 rounded-full text-xs font-bold">
                  {profile.mbti_type}
                </span>
              )}
              {profile?.connected_at && (
                <span>
                  เชื่อมต่อ:{" "}
                  {new Date(profile.connected_at).toLocaleDateString("th-TH")}
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="btn-primary no-print" onClick={() => window.print()}>
          Export PDF
        </button>
      </div>

      {error && (
        <div className="card glass p-4 text-danger text-sm">{error}</div>
      )}

      {/* Stat Cards */}
      {profile && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="บันทึก 30 วัน" value={profile.entries_30d} />
          <StatCard
            label="ค่าเฉลี่ยอารมณ์"
            value={
              profile.avg_mood_30d != null
                ? `${profile.avg_mood_30d.toFixed(1)}/5`
                : "-"
            }
            tone="mint"
            hint={
              profile.avg_mood_30d != null
                ? moodLabel(profile.avg_mood_30d)
                : undefined
            }
          />
          <StatCard
            label="Crisis Flags"
            value={profile.crisis_flags_30d}
            tone={profile.crisis_flags_30d > 0 ? "danger" : undefined}
            hint={
              profile.crisis_flags_30d > 0
                ? "ควรติดตามใกล้ชิด"
                : "ไม่พบสัญญาณอันตราย"
            }
          />
          <StatCard
            label="บันทึกล่าสุด"
            value={
              profile.last_entry_at
                ? new Date(profile.last_entry_at).toLocaleDateString("th-TH")
                : "ยังไม่มีบันทึก"
            }
          />
        </div>
      )}

      {/* AI Clinical Summary */}
      {profile && (
        <div className="card glass p-6 print-section">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🧠</span>
            <div>
              <h2 className="text-lg font-bold text-primaryDark">
                AI Clinical Summary
              </h2>
              <p className="text-xs text-slate-500">
                วิเคราะห์จากบันทึก 30 วันล่าสุดโดย Gemini AI
              </p>
            </div>
          </div>
          {profile.ai_summary ? (
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl p-4">
              {profile.ai_summary}
            </div>
          ) : (
            <div className="text-sm text-slate-400 text-center py-8">
              ไม่มีข้อมูลเพียงพอสำหรับสร้าง AI Summary
              <br />
              (ต้องมีบันทึกอย่างน้อย 1 รายการใน 30 วันที่ผ่านมา)
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Mood Trend Chart */}
        {profile && (
          <div className="card glass p-5 print-section">
            <h2 className="text-lg font-semibold text-primaryDark mb-4">
              แนวโน้มอารมณ์ 30 วัน
            </h2>
            {profile.mood_trend.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-end gap-0.5 h-28 bg-slate-50 rounded-xl p-2">
                  {profile.mood_trend.map((pt) => (
                    <div
                      key={pt.date}
                      className="flex-1 flex flex-col items-center justify-end group relative"
                    >
                      <div
                        className={`w-full rounded-t ${moodColor(pt.avg_mood)} opacity-80 group-hover:opacity-100 transition-all cursor-default`}
                        style={{ height: `${(pt.avg_mood / 5) * 100}%` }}
                      />
                      <div className="absolute bottom-full mb-1 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                        {pt.date.slice(5)} — {pt.avg_mood.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{profile.mood_trend[0]?.date.slice(5)}</span>
                  <span>คะแนนอารมณ์ (1–5)</span>
                  <span>
                    {
                      profile.mood_trend[profile.mood_trend.length - 1]?.date.slice(5)
                    }
                  </span>
                </div>
                <div className="flex gap-3 flex-wrap mt-1">
                  {[1, 2, 3, 4, 5].map((m) => (
                    <div
                      key={m}
                      className="flex items-center gap-1 text-xs text-slate-500"
                    >
                      <span
                        className={`w-3 h-3 rounded-sm ${MOOD_COLORS[m]}`}
                      />
                      {MOOD_LABELS[m]}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-8">
                ยังไม่มีข้อมูลอารมณ์
              </div>
            )}
          </div>
        )}

        {/* Cognitive Distortions */}
        {profile && (
          <div className="card glass p-5 print-section">
            <h2 className="text-lg font-semibold text-primaryDark mb-4">
              Cognitive Distortions
            </h2>
            {profile.distortions.length > 0 ? (
              <div className="space-y-3">
                {profile.distortions.map((d) => {
                  const pct =
                    totalDistortions > 0
                      ? Math.round((d.count / totalDistortions) * 100)
                      : 0;
                  return (
                    <div key={d.type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">
                          {d.type}
                        </span>
                        <span className="text-slate-500">
                          {d.count} ครั้ง ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-slate-400 mt-2">
                  รวม {totalDistortions} รายการที่ตรวจพบใน 30 วัน
                </p>
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-8">
                ไม่พบ Cognitive Distortion ในช่วงนี้
              </div>
            )}
          </div>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <LoadingOverlay
        show={loading}
        title="กำลังโหลดข้อมูลผู้ป่วย"
        subtitle="กำลังวิเคราะห์ด้วย Gemini AI — อาจใช้เวลาสักครู่..."
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

function StatCard({ label, value, tone, hint }: StatProps) {
  const toneClass =
    tone === "mint"
      ? "text-calm"
      : tone === "danger"
        ? "text-danger"
        : "text-primaryDark";
  return (
    <div className="card glass p-4 print-section">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-extrabold ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
