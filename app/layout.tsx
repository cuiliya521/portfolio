import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "崔丽娅｜AI Product Workspace",
  description:
    "崔丽娅的 AI 产品运营 / 产品运营 / AI 应用作品集：盘古智绘、小红书内容运营与 NoteGuard AI。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
