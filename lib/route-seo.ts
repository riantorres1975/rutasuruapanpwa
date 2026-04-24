import rutasGrouped from "@/data/rutas-grouped.json";
import { getRouteDestination } from "@/lib/route-names";

type SeoRouteSource = {
  ruta: string;
  color?: string;
  ida?: unknown[];
  vuelta?: unknown[];
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRouteSeoItems(): RouteSeoItem[] {
  const routes = rutasGrouped as SeoRouteSource[];

  return routes.map((route) => {
    const destination = getRouteDestination(route.ruta);
    const destinationSlug = destination ? `-${slugify(destination)}` : "";

    return {
      name: route.ruta,
      destination,
      slug: `${slugify(route.ruta)}${destinationSlug}`,
      color: route.color ?? "#00D4AA",
      hasIda: Array.isArray(route.ida) && route.ida.length > 1,
      hasVuelta: Array.isArray(route.vuelta) && route.vuelta.length > 1
    };
  });
}

export function findRouteSeoItem(slug: string) {
  return getRouteSeoItems().find((route) => route.slug === slug) ?? null;
}
