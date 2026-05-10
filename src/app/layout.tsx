import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OralNote AI | 次世代AI歯科システム",
  description: "しゃべるだけで完璧なカルテが完成する。毎日の診療をサポートする次世代のAI歯科カルテ作成・スライド自動生成システム「OralNote AI」",
  openGraph: {
    title: "OralNote AI | 次世代AI歯科システム",
    description: "しゃべるだけで完璧なカルテが完成する次世代AI歯科カルテシステム",
    siteName: "OralNote AI",
    images: [
      {
        url: "/OralNoteAI_Banner.png",
        width: 1024,
        height: 1024,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
