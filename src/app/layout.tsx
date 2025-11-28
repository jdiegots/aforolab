// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AforoLab · Visualizador de estadios y ocupación",
  description:
    "AforoLab es un visualizador de asistencia y ocupación en estadios de fútbol. Explora métricas por estadio, municipio, provincia y comunidad autónoma.",
  openGraph: {
    title: "AforoLab · Visualizador de estadios y ocupación",
    description:
      "Explora asistencia y ocupación de estadios de fútbol, ajustado a población de municipio, provincia y CCAA.",
    url: "https://aforolab.local",
    siteName: "AforoLab",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AforoLab · Visualizador de estadios y ocupación",
      },
    ],
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
        <div className="flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
