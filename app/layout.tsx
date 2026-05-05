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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.urugo.app"),
  title: {
    default: "UruGo | Rutas de camiones y TelefÃ©rico en Uruapan",
    template: "%s | UruGo"
  },
  description: "Consulta rutas de camiones Uruapan, horario y tarifa del TelefÃ©rico 2026. Mapa interactivo multimodal, sin registro ni instalaciÃ³n.",
  applicationName: "UruGo",
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
    title: "UruGo"
  },
  openGraph: {
    title: "UruGo â€” Rutas de camiones y TelefÃ©rico en Uruapan",
    description: "Encuentra tu ruta en Uruapan. Camiones urbanos y TelefÃ©rico en un solo mapa interactivo.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.urugo.app",
    siteName: "UruGo",
    images: [
      {
        url: "https://www.urugo.app/api/og",
        width: 1200,
        height: 630,
        alt: "UruGo â€” Mapa de rutas de transporte en Uruapan"
      }
    ],
    locale: "es_MX",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "UruGo â€” Rutas Uruapan",
    description: "Camiones urbanos y TelefÃ©rico en Uruapan en un mapa interactivo.",
    images: ["https://www.urugo.app/api/og"]
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
