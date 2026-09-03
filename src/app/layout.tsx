import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedUnbox — Your Private Medical Vault",
  description:
    "MedUnbox is a patient-controlled longitudinal medical-record platform. Upload, organize, and securely share your medical history with evidence-first AI.",
  keywords: [
    "MedUnbox",
    "medical records",
    "patient portal",
    "health vault",
    "longitudinal history",
    "AI medical assistant",
  ],
  authors: [{ name: "MedUnbox" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "MedUnbox — Your Private Medical Vault",
    description:
      "Patient-controlled longitudinal medical-record platform with evidence-first AI.",
    siteName: "MedUnbox",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
