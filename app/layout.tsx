import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import PWARegistrar from "@/components/PWARegistrar";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app"),
  title: {
    default: "VoyUruapan | Rutas de camiones y Teleférico en Uruapan",
    template: "%s | VoyUruapan"
  },
  description: "Rutas de camiones, combis suburbanas y Teleférico en Uruapan, Michoacán.",
  applicationName: "VoyUruapan",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoyUruapan"
  },
  openGraph: {
    siteName: "VoyUruapan",
    locale: "es_MX",
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "VoyUruapan" }]
  },
  twitter: {
    card: "summary",
    title: "VoyUruapan",
    description: "Rutas de camiones y Teleférico en Uruapan."
  }
};

export const viewport: Viewport = {
  themeColor: "#0b1220"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${spaceGrotesk.variable} min-h-dvh bg-[var(--background)] font-sans text-[var(--foreground)] antialiased`}
      >
        <PWARegistrar />
        {children}
      </body>
    </html>
  );
}
