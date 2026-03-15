"use client";

import React from "react";
import classNames from "classnames";

type Props = {
  show: boolean;
  title?: string;
  subtitle?: string;
  tone?: "primary" | "calm";
};

export const LoadingOverlay: React.FC<Props> = ({
  show,
  title = "กำลังทำงาน...",
  subtitle,
  tone = "primary",
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="card glass p-6 w-full max-w-md text-center space-y-3">
        <div
          className={classNames(
            "mx-auto w-16 h-16 rounded-full border-4 border-transparent animate-spin",
            tone === "primary"
              ? "border-t-primary border-l-primary/70"
              : "border-t-calm border-l-calm/70",
          )}
          aria-hidden
        />
        <div className="text-lg font-semibold text-primary">{title}</div>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
    </div>
  );
};
