import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Mina Puzzle",
  description: "Assemblez des puzzles artisanaux et détendez-vous avec Mina Puzzle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={plusJakartaSans.variable}>
      <body className="min-h-screen antialiased font-sans">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
