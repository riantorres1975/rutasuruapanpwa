import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { generateMetadata as routeMetadata } from "@/app/ruta/[slug]/page";
import { generateMetadata as placeMetadata } from "@/app/como-llegar/[slug]/page";
import { metadata as telefericoMetadata } from "@/app/teleferico-uruapan-horario/page";
import { getRouteSeoItems } from "@/lib/route-seo";

function titleText(title: unknown): string {
  if (typeof title === "string") return title;
  if (title && typeof title === "object" && "absolute" in title) {
    return String((title as { absolute?: string }).absolute ?? "");
  }
  return "";
}

describe("SEO basado en consultas reales", () => {
  it("responde la intención de recorrido y horario en las rutas", async () => {
    const metadata = await routeMetadata({
      params: Promise.resolve({ slug: "ruta-176-quinta-clinica-76" }),
    });

    expect(titleText(metadata.title)).toBe("Ruta 176 Uruapan: recorrido y horario");
    expect(metadata.description).toContain("Consulta por dónde pasa la Ruta 176");
    expect(metadata.description).toContain("horario 05:30 a 23:30");
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });

  it("mantiene los títulos y descripciones de todas las rutas en un tamaño útil", async () => {
    const routes = getRouteSeoItems().filter((route) => route.slug !== "teleferico-uruapan");
    const metadataItems = await Promise.all(
      routes.map((route) => routeMetadata({ params: Promise.resolve({ slug: route.slug }) }))
    );

    for (const metadata of metadataItems) {
      expect(`${titleText(metadata.title)} | UruGo`.length).toBeLessThanOrEqual(60);
      expect(String(metadata.description).length).toBeLessThanOrEqual(160);
    }
  });

  it("prioriza rutas y mapa para la búsqueda del Centro", async () => {
    const metadata = await placeMetadata({ params: Promise.resolve({ slug: "centro" }) });

    expect(titleText(metadata.title)).toBe("Cómo llegar al Centro de Uruapan: rutas y mapa");
    expect(metadata.description).toContain("rutas de camión pasan cerca del Centro de Uruapan");
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });

  it("mantiene breve la descripción de un lugar con nombre largo", async () => {
    const metadata = await placeMetadata({
      params: Promise.resolve({ slug: "boulevard-industrial-plaza-agora" }),
    });

    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
    expect(metadata.description).toContain("mapa desde tu ubicación");
  });

  it("muestra horario, precio y estaciones en el resultado del Teleférico", () => {
    expect(titleText(telefericoMetadata.title)).toBe("Teleférico de Uruapan: horario, precio y estaciones");
    expect(telefericoMetadata.description).toContain("tarifa de $12 MXN");
    expect(telefericoMetadata.description).toContain("6 estaciones");
  });

  it("publica fechas estables en el sitemap", () => {
    const first = sitemap();
    const second = sitemap();

    expect(first.map((item) => item.lastModified)).toEqual(second.map((item) => item.lastModified));
    expect(first.find((item) => item.url.endsWith("/ruta/ruta-176-quinta-clinica-76"))?.lastModified)
      .toEqual(new Date("2026-06-30T12:00:00-06:00"));
  });
});
