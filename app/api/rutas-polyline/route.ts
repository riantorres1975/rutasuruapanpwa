import { getPublishedRouteData } from "@/lib/route-repository";

export const revalidate = 3600;

export async function GET() {
  const bundle = await getPublishedRouteData();
  const routes = bundle.routes;

  if (!Array.isArray(routes) || routes.length === 0) {
    console.error("[GET /api/rutas-polyline] rutas_produccion_final.json is empty or invalid");
    return new Response(JSON.stringify({ error: "Route data unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // El cliente no usa `verified`; se omite para aligerar el payload.
  const payload = routes.map(({ verified: _verified, ...rest }) => rest);

  return Response.json(payload, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-UruGo-Data-Source": bundle.source,
      "X-UruGo-Data-Version": bundle.version,
    },
  });
}
