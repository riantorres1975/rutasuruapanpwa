import { readFileSync } from "fs";
import { join } from "path";
import type { ProductionRoute } from "@/lib/types";

export const revalidate = 3600;

export async function GET() {
  let routes: ProductionRoute[];
  try {
    routes = JSON.parse(readFileSync(join(process.cwd(), "data/rutas_produccion_final.json"), "utf8"));
  } catch {
    return new Response(JSON.stringify({ error: "Route data unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

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
    },
  });
}
