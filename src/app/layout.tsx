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
  title: "랭킹도르그 - 우리 학교에서 내 게임 랭킹은?",
  description: "발로란트, 롤 게임 아이디를 검색하고 우리 학교에서 몇 등인지 확인하세요. 친구들에게 자랑하기!",
  openGraph: {
    title: "랭킹도르그 - 우리 학교에서 내 게임 랭킹은?",
    description: "발로란트, 롤 게임 아이디를 검색하고 우리 학교에서 몇 등인지 확인하세요.",
    siteName: "랭킹도르그",
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakNGPyeA"
          crossOrigin="anonymous"
          async
        />
      </head>
      <body className="min-h-full flex flex-col bg-background">{children}</body>
    </html>
  );
}
