import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "往事书 · 回忆录智能体",
  description: "让长辈用说话的方式，留下一本自己的回忆录。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
