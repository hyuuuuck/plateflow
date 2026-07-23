import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = new URL(
    host ? `${protocol}://${host}` : "http://localhost:3000",
  );

  return {
    metadataBase,
    title: {
      default: "도면·거래 통합 업무시스템",
      template: "%s · 도면·거래 통합 업무시스템",
    },
    description:
      "도면 등록, 단가 승인, 주문·납품, 거래명세서, 매출과 CS를 한 곳에서 관리하는 내부 업무시스템",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "도면부터 거래명세서까지",
      description:
        "도면 등록과 단가 승인부터 거래명세서, 매출, CS까지 한 곳에서 관리합니다.",
      images: [
        {
          url: "/og.png",
          width: 1536,
          height: 1024,
          alt: "도면부터 거래명세서까지 이어지는 도금 업무시스템",
        },
      ],
      type: "website",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: "도면부터 거래명세서까지",
      description: "도면·거래 통합 업무시스템",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
