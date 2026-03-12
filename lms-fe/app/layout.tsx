import type { Metadata } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sora = Sora({
  variable: "--font-primary",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-secondary",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LMS - 社内研修学習管理システム",
  description: "エンジニアリングおよびデザイン領域のスキル習得を目的とした社内学習プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${sora.variable} ${ibmPlexMono.variable} font-primary antialiased`}
      >
        <NextTopLoader color="#00B0EC" height={2} showSpinner={false} />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
