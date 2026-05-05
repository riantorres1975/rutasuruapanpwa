import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Mapa de rutas de camiones y TelefÃ©rico en Uruapan"
  },
  description: "Mapa interactivo para consultar rutas de camiones, TelefÃ©rico y conexiones de transporte pÃºblico en Uruapan.",
  alternates: {
    canonical: "https://www.urugo.app/mapa"
  },
  openGraph: {
    title: "Mapa de rutas de transporte pÃºblico en Uruapan",
    description: "Consulta rutas urbanas, estaciones del TelefÃ©rico y transbordos en Uruapan.",
    url: "https://www.urugo.app/mapa"
  }
};

export default function MapaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
