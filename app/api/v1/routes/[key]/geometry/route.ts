import { getPublishedRouteData } from "@/lib/route-repository";
import { findRouteSeoItem } from "@/lib/route-seo";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
};

type Context = { params: Promise<{ key: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { key } = await params;
  const route = findRouteSeoItem(key);
  if (!route) return Response.json({ error: "Ruta no encontrada." }, { status: 404 });

  const bundle = await getPublishedRouteData();
  const directions = bundle.routes
    .filter((candidate) => candidate.name === route.name)
    .map((candidate) => ({
      id: candidate.id,
      label: candidate.original_name,
      color: candidate.color,
      path: candidate.path,
    }));

  if (directions.length === 0) {
    return Response.json({ error: "Recorrido temporalmente no disponible." }, { status: 503 });
  }

  return Response.json({ routeKey: key, routeName: route.name, directions }, { headers: CACHE_HEADERS });
}
