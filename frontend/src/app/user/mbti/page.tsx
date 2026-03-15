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
      // แก้ไขที่ 1: ลบ auto-redirect ออก ให้ผู้ใช้กดปุ่มเองเท่านั้น
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "วิเคราะห์ไม่สำเร็จ";
      setError(detail);
      pushToast({ kind: "error", message: detail });
      setPhase("question");
    }
  };

  // แก้ไขที่ 1: MBTI type descriptions
  const mbtiDescriptions: Record<string, { title: string; description: string; emoji: string }> = {
    INFP: { emoji: "🌿", title: "นักอุดมคติ (The Mediator)", description: "คุณเป็นคนที่มีอุดมการณ์สูง ใฝ่ฝันถึงโลกที่ดีกว่า มีความเห็นอกเห็นใจลึกซึ้ง และชอบแสดงออกผ่านงานสร้างสรรค์" },
    INFJ: { emoji: "🔮", title: "นักปกป้อง (The Advocate)", description: "คุณเป็นคนที่หายากและมีวิสัยทัศน์ มีความเข้าใจลึกซึ้งในตัวผู้อื่น และมุ่งมั่นทำให้โลกดีขึ้น" },
    INTP: { emoji: "🔭", title: "นักคิด (The Logician)", description: "คุณเป็นคนที่หลงใหลในทฤษฎีและแนวคิด ชอบวิเคราะห์ทุกอย่างอย่างลึกซึ้ง และมีความฉลาดเฉียบแหลม" },
    INTJ: { emoji: "♟️", title: "นักกลยุทธ์ (The Architect)", description: "คุณเป็นนักวางแผนที่เฉียบคม มีความมั่นใจในตัวเอง และมุ่งมั่นพัฒนาตัวเองและสิ่งรอบข้างอยู่เสมอ" },
    ENFP: { emoji: "✨", title: "นักรณรงค์ (The Campaigner)", description: "คุณเป็นคนที่เต็มไปด้วยพลังและความคิดสร้างสรรค์ ชื่นชอบการค้นหาความเป็นไปได้ใหม่ๆ และสร้างแรงบันดาลใจให้ผู้อื่น" },
    ENFJ: { emoji: "🌟", title: "ผู้นำที่เปี่ยมเมตตา (The Protagonist)", description: "คุณเป็นคนที่มีเสน่ห์และเห็นอกเห็นใจ เป็นธรรมชาติที่จะเป็นผู้นำในการช่วยเหลือและพัฒนาผู้อื่น" },
    ENTP: { emoji: "💡", title: "นักโต้แย้ง (The Debater)", description: "คุณเป็นคนที่ชาญฉลาดและอยากรู้อยากเห็น ชอบท้าทายทุกอย่างและมองหาวิธีคิดใหม่ๆ ที่สร้างสรรค์" },
    ENTJ: { emoji: "👑", title: "ผู้บัญชาการ (The Commander)", description: "คุณเป็นผู้นำที่กล้าหาญและมีความมั่นใจสูง มีความสามารถในการวางแผนและขับเคลื่อนให้บรรลุเป้าหมาย" },
    ISFP: { emoji: "🎨", title: "ศิลปิน (The Adventurer)", description: "คุณเป็นคนที่อ่อนโยน มีจิตใจที่เปิดกว้าง ชอบสำรวจโลกผ่านประสาทสัมผัส และมีความงดงามในจิตใจ" },
    ISFJ: { emoji: "🛡️", title: "ผู้พิทักษ์ (The Defender)", description: "คุณเป็นคนที่อบอุ่น ห่วงใย และเชื่อถือได้ มุ่งมั่นดูแลและปกป้องคนที่คุณรัก" },
    ISTP: { emoji: "🔧", title: "นักปฏิบัติ (The Virtuoso)", description: "คุณเป็นคนที่สังเกตทุกอย่างอย่างเงียบๆ มีทักษะในการแก้ปัญหาและทำสิ่งต่างๆ ด้วยมือของตัวเอง" },
    ISTJ: { emoji: "📋", title: "ผู้มีหลักการ (The Logistician)", description: "คุณเป็นคนที่มีความรับผิดชอบสูง เชื่อในกฎระเบียบ และมุ่งมั่นทำทุกอย่างให้เสร็จสมบูรณ์" },
    ESFP: { emoji: "🎉", title: "นักแสดง (The Entertainer)", description: "คุณเป็นคนที่มีชีวิตชีวา สนุกสนาน และชอบสร้างความสุขให้กับคนรอบข้างในทุกโอกาส" },
    ESFJ: { emoji: "🤝", title: "ผู้ดูแล (The Consul)", description: "คุณเป็นคนที่ใส่ใจผู้อื่นอย่างจริงจัง ชอบสร้างความสามัคคีในกลุ่ม และดูแลให้ทุกคนมีความสุข" },
    ESTP: { emoji: "⚡", title: "ผู้ประกอบการ (The Entrepreneur)", description: "คุณเป็นคนที่กระตือรือร้น กล้าเสี่ยง และแก้ปัญหาได้อย่างรวดเร็วในทุกสถานการณ์" },
    ESTJ: { emoji: "🏛️", title: "ผู้บริหาร (The Executive)", description: "คุณเป็นคนที่มีระเบียบ มีความเป็นผู้นำที่เข้มแข็ง และมุ่งมั่นดูแลให้ทุกอย่างดำเนินไปตามแผน" },
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

      {/* แก้ไขที่ 1: หน้าผลลัพธ์ MBTI แบบใหม่ มีคำอธิบาย และผู้ใช้กดปุ่มเองเพื่อไปหน้าไดอารี่ */}
      {phase === "result" && mbti && (() => {
        const info = mbtiDescriptions[mbti];
        return (
          <div className="card glass p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary mx-auto flex items-center justify-center text-4xl">
                {info?.emoji ?? "✨"}
              </div>
              <p className="text-sm text-slate-500">AI วิเคราะห์บุคลิกภาพของคุณแล้ว</p>
              <h2 className="text-4xl font-extrabold text-primaryDark tracking-wide">
                {mbti}
              </h2>
              {info && (
                <p className="text-lg font-semibold text-primary">{info.title}</p>
              )}
            </div>

            {/* Description */}
            {info && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <p className="text-slate-700 leading-relaxed text-center">
                  {info.description}
                </p>
              </div>
            )}

            {/* AI tone note */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-center">
              <span className="text-slate-500">ตั้งแต่นี้ </span>
              <span className="font-semibold text-primary">MindVault AI</span>
              <span className="text-slate-500"> จะปรับโทนการพูดคุยให้เข้ากับบุคลิกภาพ </span>
              <span className="font-semibold text-primaryDark">{mbti}</span>
              <span className="text-slate-500"> ของคุณโดยเฉพาะ</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                className="btn-primary px-8 py-3 text-base"
                onClick={() => router.push("/user/chat")}
              >
                เริ่มเขียนไดอารี่ →
              </button>
              <button className="btn-ghost px-6 py-3" onClick={resetAndRetake}>
                ทำแบบประเมินใหม่
              </button>
            </div>
          </div>
        );
      })()}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
