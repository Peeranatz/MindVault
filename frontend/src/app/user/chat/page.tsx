"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RagSourcePopup } from "../../../components/RagSourcePopup";
import { MoodBadge } from "../../../components/MoodBadge";
import { getApi } from "../../../lib/api";
import { ToastMessage, ToastStack } from "../../../components/Toast";
import { LoadingOverlay } from "../../../components/LoadingOverlay";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type Journal = {
  id: number;
  content: string;
  ai_response?: string;
  detected_mood?: number;
  cognitive_distortion?: string | null;
  is_crisis: boolean;
  sources?: string[];
};

const distortionLibrary: Record<
  string,
  { title: string; subtitle: string; description: string; tips: string }
> = {
  Overgeneralization: {
    title: "Overgeneralization",
    subtitle: "การคิดเหมารวม (Cognitive Distortion)",
    description:
      "การนำเหตุการณ์ด้านลบเพียงครั้งเดียวมาสรุปเหมารวมว่าจะเกิดขึ้นแบบนี้ตลอด เช่น สอบตก 1 วิชา แล้วคิดว่า “ฉันล้มเหลวตลอด ทำอะไรไม่เคยสำเร็จเลย”.",
    tips: "เตือนตัวเองว่านี่เป็นเพียงเหตุการณ์หนึ่ง ไม่ใช่คำทำนายชีวิตทั้งหมดของเรา",
  },
  "All-or-Nothing": {
    title: "All-or-Nothing Thinking",
    subtitle: "คิดแบบสุดโต่ง",
    description:
      "มองทุกอย่างเป็นขาวหรือดำ ไม่มีพื้นที่ตรงกลาง เช่น “ทำได้ไม่ 100% = ล้มเหลว”.",
    tips: "ลองหาช่วงสีเทา ยอมรับว่าความคืบหน้าเล็ก ๆ ก็คือความสำเร็จ",
  },
};

const ragSamples: string[] = [];

export default function ChatPage() {
  const router = useRouter();
  const api = useMemo(() => getApi(), []);
  const [token, setToken] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [items, setItems] = useState<Journal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [doctorCode, setDoctorCode] = useState("");
  const [hasMbti, setHasMbti] = useState<boolean>(true);
  const [mbtiType, setMbtiType] = useState<string | null>(null);
  const [crisisAlert, setCrisisAlert] = useState<boolean>(false);
  const [selectedDistortion, setSelectedDistortion] = useState<string | null>(
    null,
  );
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
      fetchJournals();
      api
        .get("/auth/me")
        .then((res) => {
          if (!res.data.mbti_type) {
            setHasMbti(false);
            router.push("/user/mbti");
          } else {
            setHasMbti(true);
            setMbtiType(res.data.mbti_type);
          }
        })
        .catch(() => router.push("/login"));
    } else {
      router.push("/login");
    }
  }, []);

  const fetchJournals = async () => {
    try {
      const res = await api.get<Journal[]>(`${API}/journal`);
      setItems(res.data);
      setCrisisAlert(res.data.some((j) => j.is_crisis));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "โหลดข้อมูลไม่สำเร็จ");
      pushToast({ kind: "error", message: "โหลดข้อมูลไม่สำเร็จ" });
    }
  };

  const submit = async () => {
    if (!token) {
      setError("กรุณาเข้าสู่ระบบใหม่");
      return;
    }
    if (!content.trim()) {
      pushToast({ kind: "info", message: "พิมพ์ความรู้สึกก่อนส่งนะ" });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<Journal>(`${API}/journal`, { content });
      setItems([res.data, ...items]);
      setContent("");
      setSources([]); // อย่าเปิด popup RAG อัตโนมัติ รอให้ผู้ใช้กดปุ่ม
      setCrisisAlert(res.data.is_crisis || items.some((j) => j.is_crisis));
      pushToast({ kind: "success", message: "บันทึกสำเร็จแล้ว" });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "บันทึกไม่สำเร็จ";
      setError(detail);
      pushToast({ kind: "error", message: detail });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDoctor = async () => {
    setError(null);
    try {
      await api.post(`${API}/connect/request`, {
        doctor_code: doctorCode.trim(),
      });
      setDoctorCode("");
      pushToast({ kind: "success", message: "ส่งคำขอเชื่อมต่อถึงแพทย์แล้ว" });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "ส่งคำขอไม่สำเร็จ";
      setError(detail);
      pushToast({ kind: "error", message: detail });
    }
  };

  const sortedItems = [...items].sort((a, b) => a.id - b.id);
  const activeDistortion =
    selectedDistortion && distortionLibrary[selectedDistortion];

  const handleOpenSources = (item: Journal) => {
    const list =
      item.sources && item.sources.length ? item.sources : ragSamples;
    if (!list.length) {
      pushToast({
        kind: "info",
        message: "ยังไม่มีแหล่งอ้างอิงสำหรับบันทึกนี้",
      });
      return;
    }
    setSources(list);
  };

  return (
    <div className="space-y-6">
      {crisisAlert && (
        <div className="card p-4 border-danger/40 bg-danger/5 text-danger flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
            พบข้อความที่อาจมีความเสี่ยง หากต้องการความช่วยเหลือด่วน โทร 1323
          </div>
          <a
            href="tel:1323"
            className="px-3 py-1 rounded-lg bg-danger text-white text-xs hover:bg-red-600"
          >
            โทร 1323
          </a>
        </div>
      )}

      <div className="card p-5 border-white/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
            MV
          </div>
          <div>
            <div className="text-xl font-bold text-primaryDark">
              MindVault AI
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              {mbtiType && (
                <span className="pill bg-primary/10 text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary" /> MBTI
                  tone: {mbtiType}
                </span>
              )}
              <span className="text-slate-500">พื้นที่ปลอดภัยสำหรับคุณ</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {sortedItems.map((j) => (
            <div key={j.id} className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-3xl bg-primary text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-md">
                  <div className="text-sm opacity-80 mb-1">คุณ #{j.id}</div>
                  <p className="whitespace-pre-line leading-relaxed">
                    {j.content}
                  </p>
                </div>
              </div>

              {j.ai_response && (
                <div className="flex justify-start">
                  <div className="max-w-3xl bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="text-sm text-primary font-semibold mb-2">
                      MindVault ตอบกลับ
                    </div>
                    <p className="whitespace-pre-line leading-relaxed text-slate-800">
                      {j.ai_response}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3 items-center">
                      <MoodBadge mood={j.detected_mood} />
                      {j.cognitive_distortion && (
                        <button
                          className="pill bg-blush/30 text-danger"
                          onClick={() =>
                            setSelectedDistortion(j.cognitive_distortion!)
                          }
                        >
                          ⚠️ {j.cognitive_distortion}
                        </button>
                      )}
                      {j.ai_response && (
                        <button
                          className="pill bg-primary/10 text-primary"
                          onClick={() => handleOpenSources(j)}
                        >
                          📖 แหล่งอ้างอิง (RAG)
                        </button>
                      )}
                      {j.is_crisis && (
                        <span className="pill bg-danger/10 text-danger">
                          CRISIS • โทร 1323
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {sortedItems.length === 0 && (
            <div className="text-center text-slate-500 py-10">
              ยังไม่มีบันทึก เริ่มเล่าเรื่องราววันนี้ได้เลย
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 border-white/60 space-y-3">
        <h2 className="text-lg font-semibold text-primaryDark">
          บันทึกความรู้สึก
        </h2>
        <textarea
          className="w-full border border-slate-200 rounded-2xl px-4 py-3 min-h-[140px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="เล่าสิ่งที่คุณเจอวันนี้ให้ฟังหน่อยค่ะ..."
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            AI จะช่วยวิเคราะห์อารมณ์และแจ้งเตือน Crisis อัตโนมัติ
          </div>
          <button
            onClick={submit}
            disabled={loading}
            className="btn-primary px-5 py-2.5 rounded-xl"
          >
            {loading ? "กำลังส่ง..." : "ส่ง"}
          </button>
        </div>
      </div>

      <div className="card p-5 border-white/60">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primaryDark">
              เชื่อมกับแพทย์
            </h3>
            <p className="text-sm text-slate-600">
              ใส่รหัสแพทย์เพื่อขอเชื่อมต่อและให้แพทย์เห็นสรุปของคุณ
            </p>
          </div>
          <span className="pill bg-primary/10 text-primary">
            ปลอดภัย • ควบคุมการแชร์
          </span>
        </div>
        <div className="flex gap-3 mt-4">
          <input
            className="border border-slate-200 rounded-xl px-3 py-3 flex-1 focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="รหัสแพทย์"
            value={doctorCode}
            onChange={(e) => setDoctorCode(e.target.value)}
          />
          <button
            className="btn-ghost"
            disabled={!doctorCode.trim()}
            onClick={handleConnectDoctor}
          >
            ส่งคำขอ
          </button>
        </div>
      </div>

      {activeDistortion && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-[1040]">
          <div className="card glass p-6 max-w-lg w-full relative fade-in">
            <button
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
              onClick={() => setSelectedDistortion(null)}
              aria-label="ปิด"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-blush/40 text-danger flex items-center justify-center">
                ❗
              </div>
              <div>
                <div className="text-lg font-bold text-primaryDark">
                  {activeDistortion.title}
                </div>
                <div className="text-sm text-danger">
                  {activeDistortion.subtitle}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              {activeDistortion.description}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-primaryDark">
              <span className="font-semibold">วิธีปรับความคิด:</span>{" "}
              {activeDistortion.tips}
            </div>
            <div className="mt-5 text-center">
              <button
                className="btn-ghost min-w-[140px]"
                onClick={() => setSelectedDistortion(null)}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      <RagSourcePopup sources={sources} onClose={() => setSources([])} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <LoadingOverlay
        show={loading}
        title="AI กำลังประมวลผล"
        subtitle="กำลังสร้างคำตอบและตรวจสอบสัญญาณ Crisis"
      />
    </div>
  );
}
