import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400"],
});

export const metadata: Metadata = {
  title: "Mantra AI — Starter Engine",
  description:
    "MantraAI Starter Engine — Voice-controlled AI desktop assistant and automation system. Start, monitor, and control your MantraAI instance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scheme="dark" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full w-full">{children}</body>
    </html>
  );
}
