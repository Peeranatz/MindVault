"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";

export type ToastKind = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
};

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
  duration?: number;
};

const icons: Record<ToastKind, JSX.Element> = {
  success: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M9.5 16.2 5.8 12.5 4.4 13.9 9.5 19 20 8.5 18.6 7.1z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M12 2 2 22h20L12 2zm1 14h-2v-2h2v2zm0-4h-2V9h2v3z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-6h2Zm0-8h-2V7h2Z" />
    </svg>
  ),
};

export const ToastStack: React.FC<Props> = ({
  toasts,
  onDismiss,
  duration = 3800,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timers = toasts.map((t) =>
      window.setTimeout(() => onDismiss(t.id), duration),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts, onDismiss, duration]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[1200] space-y-2 w-[320px] max-w-[90vw]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={classNames(
            "glass border px-4 py-3 rounded-xl shadow-lg flex gap-3 items-start fade-in",
            toast.kind === "success" &&
              "border-mint/60 bg-mint/10 text-primary",
            toast.kind === "error" &&
              "border-danger/40 bg-danger/10 text-danger",
            toast.kind === "info" && "border-sky/50 bg-sky/10 text-primary",
          )}
        >
          <div
            className={classNames(
              "p-2 rounded-lg",
              toast.kind === "success" && "bg-mint/20 text-primary",
              toast.kind === "error" && "bg-danger/20 text-danger",
              toast.kind === "info" && "bg-sky/20 text-primary",
            )}
            aria-hidden
          >
            {icons[toast.kind]}
          </div>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <div className="text-sm font-semibold leading-tight">
                {toast.title}
              </div>
            )}
            <div className="text-sm leading-snug">{toast.message}</div>
          </div>
          <button
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={() => onDismiss(toast.id)}
            aria-label="ปิดแจ้งเตือน"
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
};
