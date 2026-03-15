"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApi } from "../../../lib/api";
import { ToastMessage, ToastStack } from "../../../components/Toast";

interface Me {
  mbti_type?: string | null;
  role: string;
}

const questions = [
  "สวัสดีค่ะ ก่อนที่เราจะเริ่มบันทึกไดอารี่ ขอทำความรู้จักคุณสักนิดนะคะ... ถ้าวันหยุดนี้ไม่มีแผนไปไหน คุณเลือกที่จะทำอะไรเพื่อชาร์จพลังให้ตัวเองคะ?",
  "เวลาที่เจอเรื่องท้าทายหรือปัญหาที่ไม่ได้คาดคิด คุณมักจะรับมือกับมันยังไงเอ่ย เล่าให้ฟังหน่อยได้ไหมคะ?",
  "คุณเติมพลังจากการอยู่ลำพังหรือการอยู่กับผู้คนมากกว่ากัน?",
  "เวลาตัดสินใจเรื่องสำคัญ คุณใช้เหตุผลหรือความรู้สึกนำ?",
  "คุณชอบวางแผนล่วงหน้าเป็นขั้นตอน หรือชอบปรับตามสถานการณ์หน้างาน?",
];

export default function MbtiPage() {
  const router = useRouter();
  const api = useMemo(() => getApi(), []);
  const [answers, setAnswers] = useState<string[]>(
    Array(questions.length).fill(""),
  );
  const [current, setCurrent] = useState(0);
  const [mbti, setMbti] = useState<string | null>(null);
  const [phase, setPhase] = useState<"question" | "analyzing" | "result">(
    "question",
  );
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...toast }]);
  };
  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    api
      .get<Me>("/auth/me")
      .then((res) => {
        if (res.data.mbti_type) {
          setMbti(res.data.mbti_type);
          setPhase("result");
        }
      })
      .catch(() => router.push("/login"));
  }, [api, router]);

  const handleNext = () => {
    if (!answers[current].trim()) {
      setError("กรุณาพิมพ์คำตอบก่อนกดถัดไป");
      pushToast({
        kind: "info",
        message: "กรุณาตอบคำถามเพื่อให้ AI เข้าใจคุณ",
      });
      return;
    }
    setError(null);
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      submit();
    }
  };

  const submit = async () => {
    const filled = answers.filter((a) => a.trim().length > 0);
    if (filled.length === 0) {
      setError("กรุณาตอบอย่างน้อย 1 ข้อ");
      pushToast({ kind: "info", message: "ตอบสักเล็กน้อยเพื่อให้ AI ปรับโทน" });
      return;
    }
    setPhase("analyzing");
    try {
      const res = await api.post<{ mbti_type: string }>("/mbti/analyze", {
        answers: filled,
      });
      setMbti(res.data.mbti_type);
      setPhase("result");
      pushToast({ kind: "success", message: "วิเคราะห์บุคลิกภาพเรียบร้อย" });
      setTimeout(() => router.push("/user/chat"), 1200);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "วิเคราะห์ไม่สำเร็จ";
      setError(detail);
      pushToast({ kind: "error", message: detail });
      setPhase("question");
    }
  };

  const resetAndRetake = () => {
    setAnswers(Array(questions.length).fill(""));
    setCurrent(0);
    setPhase("question");
    setMbti(null);
  };

  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="pill bg-primary/10 text-primary w-fit mb-2">
            <span className="w-2 h-2 rounded-full bg-primary" />{" "}
            การประเมินบุคลิกภาพ (MBTI)
          </div>
          <h1 className="text-3xl font-extrabold text-primaryDark">
            ตั้งค่าโทน AI ให้เข้ากับคุณ
          </h1>
          <p className="text-slate-600">
            ตอบคำถามสั้น ๆ 5 ข้อ ระบบจะใช้ LLM วิเคราะห์ MBTI
            เพื่อปรับสำนวนและน้ำเสียงให้เหมาะสม
          </p>
        </div>
        <button
          className="text-sm text-slate-500 hover:text-primary underline"
          onClick={() => router.push("/login")}
        >
          ออกจากระบบ
        </button>
      </div>

      {phase === "question" && (
        <div className="card glass p-6 space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              คำถามที่ {current + 1} จาก {questions.length}
            </span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xl font-semibold text-primaryDark leading-relaxed">
            {questions[current]}
          </div>
          <textarea
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 min-h-[140px] focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="พิมพ์คำตอบของคุณที่นี่..."
            value={answers[current]}
            onChange={(e) => {
              const next = [...answers];
              next[current] = e.target.value;
              setAnswers(next);
            }}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <div className="flex justify-end">
            <button className="btn-primary min-w-[140px]" onClick={handleNext}>
              {current === questions.length - 1
                ? "วิเคราะห์ด้วย AI"
                : "ข้อต่อไป"}
            </button>
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="card glass p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary mx-auto animate-spin" />
          <div className="text-2xl font-bold text-primaryDark">
            AI กำลังวิเคราะห์บุคลิกภาพของคุณ...
          </div>
          <p className="text-slate-600">
            เรากำลังประมวลผลคำตอบทั้ง {questions.length} ข้อด้วย LLM
          </p>
        </div>
      )}

      {phase === "result" && mbti && (
        <div className="card glass p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-calm/20 text-primary mx-auto flex items-center justify-center text-3xl">
            ✨
          </div>
          <div>
            <p className="text-sm text-slate-600">AI วิเคราะห์ว่า</p>
            <h2 className="text-3xl font-extrabold text-primaryDark">
              ยินดีต้อนรับคุณ {mbti}!
            </h2>
            <p className="text-slate-600">
              ตั้งแต่นี้ AI จะปรับโทนการพูดคุยให้เข้ากับคุณมากที่สุด
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm">
            <div className="font-semibold text-primary mb-1">
              Prompt Injection (เบื้องหลัง):
            </div>
            <pre className="whitespace-pre-wrap text-slate-700">
              {`System: User is ${mbti}. Focus on empathy, emotional validation, and warm tone.`}
            </pre>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              className="btn-primary"
              onClick={() => router.push("/user/chat")}
            >
              เริ่มเขียนไดอารี่
            </button>
            <button className="btn-ghost" onClick={resetAndRetake}>
              ทำแบบประเมินใหม่
            </button>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
