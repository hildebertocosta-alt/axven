import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Axven Digital | Estratégia, Tecnologia e Performance",
    template: "%s | Axven Digital",
  },
  description: "Estruturas de crescimento que conectam aquisição, automação, IA, CRM, vendas e dados.",
  applicationName: "Axven Digital",
  keywords: ["Axven Digital", "marketing digital", "automação", "CRM", "inteligência artificial", "performance", "aquisição de clientes"],
  openGraph: {
    title: "Axven Digital | Crescimento não acontece por acaso. Ele é construído.",
    description: "Estratégia, tecnologia e performance conectadas para construir crescimento.",
    type: "website",
    locale: "pt_BR",
    siteName: "Axven Digital",
  },
  twitter: {
    card: "summary_large_image",
    title: "Axven Digital",
    description: "Estratégia, tecnologia e performance conectadas para construir crescimento.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
