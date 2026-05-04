import rutasProduccion from "@/data/rutas_produccion_final.json";
import { getRouteDestination } from "@/lib/route-names";

type ProductionRouteRaw = {
  id: number;
  name: string;
  original_name: string;
  color: string;
};

export type RouteSeoItem = {
  name: string;
  destination: string | null;
  slug: string;
  color: string;
  hasIda: boolean;
  hasVuelta: boolean;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRouteSeoItems(): RouteSeoItem[] {
  const routes = rutasProduccion as ProductionRouteRaw[];

  // Deduplicate by name, aggregating directions
  const seen = new Map<string, RouteSeoItem>();
  for (const r of routes) {
    const isVuelta = r.original_name.includes("Vuelta");
    const existing = seen.get(r.name);
    if (existing) {
      if (isVuelta) existing.hasVuelta = true;
      else existing.hasIda = true;
    } else {
      const destination = getRouteDestination(r.name);
      const destinationSlug = destination ? `-${slugify(destination)}` : "";
      seen.set(r.name, {
        name: r.name,
        destination,
        slug: `${slugify(r.name)}${destinationSlug}`,
        color: r.color,
        hasIda: !isVuelta,
        hasVuelta: isVuelta,
      });
    }
  }

  return Array.from(seen.values());
}

export function findRouteSeoItem(slug: string) {
  return getRouteSeoItems().find((route) => route.slug === slug) ?? null;
}
