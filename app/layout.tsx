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
  title: "Finchat - Controle financeiro inteligente",
  description: "Controle suas finanças de forma simples através de uma inteligência artificial.",
  manifest: "/manifest.json",
  themeColor: "#09090b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finchat",
    startupImage: "/apple-touch-icon.png",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        {/* iOS lê diretamente essa tag — ignora o manifest para o ícone da área de trabalho */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon.png?v=2" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon.png?v=2" />
        <link rel="shortcut icon" href="/apple-touch-icon.png?v=2" />
      </head>
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
