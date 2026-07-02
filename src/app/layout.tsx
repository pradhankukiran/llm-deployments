import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "boosted/dist/css/boosted.min.css";
import "./globals.css";
import BoostedJS from "./components/BoostedJS";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orange Serverless Ops - Modal LLM Deployments",
  description: "Telemetry, logs, and deployment manager for serverless LLM infrastructure on Modal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-bs-theme="dark">
      <body className="bg-black text-white">
        <BoostedJS />
        {children}
      </body>
    </html>
  );
}

