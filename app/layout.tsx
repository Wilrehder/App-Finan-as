import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { NavigationProgress } from "@/components/layout/navigation-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas - Controle financeiro inteligente",
  description: "Controle suas finanças de forma simples através de uma inteligência artificial.",
  manifest: "/manifest.json",
  themeColor: "#09090b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Atlas",
  },
  icons: {
    icon: "/logo.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-[100dvh] overflow-hidden`}
      >
        <NavigationProgress />
        <main className="max-w-md mx-auto h-full relative overflow-y-auto no-scrollbar pb-[80px]">
          <InstallPrompt />
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
