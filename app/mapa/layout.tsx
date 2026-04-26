import type { Metadata } from "next";
import PWAInstallBanner from "@/components/PWAInstallBanner";

export const metadata: Metadata = {
  title: {
    absolute: "Mapa de rutas de camiones y Teleférico en Uruapan"
  },
  description: "Mapa interactivo para consultar rutas de camiones, Teleférico y conexiones de transporte público en Uruapan.",
  alternates: {
    canonical: "/mapa"
  },
  openGraph: {
    title: "Mapa de rutas de transporte público en Uruapan",
    description: "Consulta rutas urbanas, estaciones del Teleférico y transbordos en Uruapan.",
    url: "/mapa"
  }
};

export default function MapaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <PWAInstallBanner />
    </>
  );
}
