import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { Providers } from "./Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UDN - Unité departementale Nord",
  description: "Plateforme complète pour la gestion des activités de l'UDN.",
  authors: [{ name: "UDN" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "UDN - Unité departementale Nord",
    description: "Gestion des activités de l'UDN - Unité departementale Nord",
    type: "website",
  },
};




export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
