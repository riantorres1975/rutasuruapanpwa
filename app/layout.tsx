import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import PWARegistrar from "@/components/PWARegistrar";
import AdaptiveTheme from "@/components/AdaptiveTheme";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://rutasuruapanpwa.vercel.app"),
  title: {
    default: "VoyUruapan | Rutas de camiones y Teleférico en Uruapan",
    template: "%s | VoyUruapan"
  },
  description: "Rutas de camiones urbanos y Teleférico en Uruapan, Michoacán.",
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
    title: "VoyUruapan — Rutas de camiones y Teleférico en Uruapan",
    description: "Encuentra tu ruta en Uruapan. Camiones urbanos y Teleférico en un solo mapa interactivo.",
    url: "https://rutasuruapanpwa.vercel.app",
    siteName: "VoyUruapan",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "VoyUruapan — Mapa de rutas de transporte en Uruapan"
      }
    ],
    locale: "es_MX",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "VoyUruapan — Rutas Uruapan",
    description: "Camiones urbanos y Teleférico en Uruapan en un mapa interactivo.",
    images: ["/opengraph-image"]
  }
};

export const viewport: Viewport = {
  themeColor: "#0c110a"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${playfair.variable} min-h-dvh bg-[var(--background)] font-sans text-[var(--foreground)] antialiased`}
      >
        {/* Inline script runs before paint to set the correct theme and avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var h=new Date().getHours();var dark=h<6||h>=19;document.documentElement.setAttribute('data-theme',dark?'dark':'light');if(dark)document.documentElement.classList.add('dark');})();`
          }}
        />
        <AdaptiveTheme />
        <PWARegistrar />
        {children}
      </body>
    </html>
  );
}
