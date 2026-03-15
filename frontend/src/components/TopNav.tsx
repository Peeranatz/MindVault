"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import classNames from "classnames";

export const TopNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const t =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setHasToken(!!t);
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    setHasToken(false);
    router.push("/login");
  };

  const isDoctor = pathname?.startsWith("/doctor");
  const isUser = pathname?.startsWith("/user");

  return (
    <header className="flex items-center justify-between py-4 mb-6">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
          <svg viewBox="0 0 24 24" className="w-6 h-6">
            <path
              d="M12 21c-4.97-4.35-8-7.8-8-11.42A6.58 6.58 0 0 1 10.58 3c.53 0 1.05.07 1.56.2A6.57 6.57 0 0 1 20 9.58C20 13.2 16.97 16.65 12 21Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div>
          <div className="text-xl font-extrabold text-primary leading-tight">
            MindVault
          </div>
          <div className="text-xs text-slate-500 leading-tight">
            Safe space for your mind
          </div>
        </div>
      </Link>

      <nav className="flex items-center gap-2 text-sm">
        {hasToken && (
          <>
            <Link
              href="/user/chat"
              className={classNames(
                "px-3 py-2 rounded-lg transition",
                isUser
                  ? "bg-primary/10 text-primary"
                  : "text-slate-700 hover:text-primary",
              )}
            >
              ผู้ใช้ทั่วไป
            </Link>
            <Link
              href="/doctor/dashboard"
              className={classNames(
                "px-3 py-2 rounded-lg transition",
                isDoctor
                  ? "bg-primary/10 text-primary"
                  : "text-slate-700 hover:text-primary",
              )}
            >
              แพทย์
            </Link>
          </>
        )}
        {!hasToken && (
          <>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-white border border-primary/30 text-primary font-semibold hover:bg-primary/5"
            >
              เข้าสู่ระบบ
            </Link>
            <Link href="/register" className="btn-primary">
              สมัครสมาชิก
            </Link>
          </>
        )}
        {hasToken && (
          <button
            onClick={logout}
            className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            ออกจากระบบ
          </button>
        )}
      </nav>
    </header>
  );
};
