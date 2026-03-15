"use client";

import React from "react";
import classNames from "classnames";

type Props = {
  mood?: number | null;
};

const moodMap: Record<number, { label: string; color: string }> = {
  1: { label: "เศร้า/กังวล", color: "bg-danger/15 text-danger" },
  2: { label: "ไม่ค่อยดี", color: "bg-warn/15 text-warn" },
  3: { label: "ปกติ", color: "bg-slate-200 text-slate-800" },
  4: { label: "ดี", color: "bg-calm/20 text-calm" },
  5: { label: "ยินดี/สดใส", color: "bg-primary/10 text-primary" },
};

export const MoodBadge: React.FC<Props> = ({ mood }) => {
  if (!mood || mood < 1 || mood > 5) return null;
  const { label, color } = moodMap[mood];
  return (
    <span
      className={classNames(
        "px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5",
        color,
      )}
    >
      <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
      อารมณ์: {label}
    </span>
  );
};
