"use client";

import React from "react";

type Props = {
  sources: string[];
  title?: string;
  onClose: () => void;
};

export const RagSourcePopup: React.FC<Props> = ({
  sources,
  onClose,
  title = "แหล่งอ้างอิงข้อมูล (RAG)",
}) => {
  if (!sources.length) return null;
  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-[1050]">
      <div className="w-full max-w-lg card glass p-6 relative fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-800"
          aria-label="ปิด"
        >
          ✕
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-sky/20 text-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path
                d="M12 3 3 7l9 4 9-4-9-4Zm0 7-9-4v10l9 4 9-4V6l-9 4Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary">{title}</div>
            <p className="text-sm text-slate-600">
              อ้างอิงจากคลังความรู้สุขภาพจิต
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {sources.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm leading-relaxed whitespace-pre-line"
            >
              {s}
            </div>
          ))}
        </div>
        <div className="mt-5 text-center">
          <button className="btn-ghost min-w-[140px]" onClick={onClose}>
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
