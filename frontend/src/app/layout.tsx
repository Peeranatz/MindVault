import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import { TopNav } from "../components/TopNav";

export const metadata: Metadata = {
  title: "MindVault",
  description: "Mental health journaling with doctor dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <TopNav />
          {children}
        </div>
      </body>
    </html>
  );
}
