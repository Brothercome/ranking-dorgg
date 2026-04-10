import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_URL ?? "https://ranking-dorgg.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "랭킹도르그 | 학교별 롤·발로란트 랭킹",
    template: "%s | 랭킹도르그",
  },
  description: "롤·발로란트 게임 아이디로 우리 학교 친구들 사이 내 등수를 확인하세요. 전국 중·고·대학교 실시간 교내 랭킹.",
  keywords: ["랭킹도르그", "학교 랭킹", "롤 학교 랭킹", "발로란트 학교 랭킹", "교내 랭킹", "리그오브레전드 랭킹", "LoL 랭킹", "발로란트 티어", "게임 아이디 검색"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "랭킹도르그 | 학교별 롤·발로란트 랭킹",
    description: "롤·발로란트 게임 아이디로 우리 학교 친구들 사이 내 등수를 확인하세요.",
    url: "/",
    siteName: "랭킹도르그",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "랭킹도르그" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "랭킹도르그 | 학교별 롤·발로란트 랭킹",
    description: "롤·발로란트 게임 아이디로 우리 학교 친구들 사이 내 등수를 확인하세요.",
    images: ["/og-default.png"],
  },
  icons: {
    icon: "/favicon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
      <body className="min-h-full flex flex-col bg-background">
        <Header />
        {children}
      </body>
    </html>
  );
}
