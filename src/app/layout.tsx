import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DG Trading Adviser",
  description:
    "A decision-support tool for crypto and commodities. Not financial advice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Nav />

        {/* Each page's content appears here */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>

        {/* Permanent risk disclaimer — visible on every page */}
        <footer className="border-t border-slate-200 bg-white">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs leading-relaxed text-slate-500">
            This app provides trading and investment decision-support tools. It
            does not guarantee profits and does not replace professional
            financial advice. Markets involve risk, and users are responsible
            for their own decisions.
          </p>
        </footer>
      </body>
    </html>
  );
}
