import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lookas - AI-Powered Codebase Documentation",
  description: "Automatically generate, maintain, and visualize living documentation that evolves with your code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ 
          backgroundColor: 'var(--color-canvas)', 
          color: 'var(--color-text-primary)',
          minHeight: '100vh'
        }}
      >
        {children}
      </body>
    </html>
  );
}
