import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dental OS | 次世代AI歯科システム",
  description: "しゃべるだけで完璧なカルテが完成する。毎日の診療をサポートする次世代のAI歯科カルテ作成・スライド自動生成システム「Dental OS」",
  openGraph: {
    title: "Dental OS | 次世代AI歯科システム",
    description: "しゃべるだけで完璧なカルテが完成。次世代のAI歯科カルテ作成・スライド自動生成システム",
    siteName: "Dental OS",
    images: [
      {
        url: "/DentalOS_Banner.png",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
