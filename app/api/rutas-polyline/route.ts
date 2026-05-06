import { readFileSync } from "fs";
import { join } from "path";
import type { ProductionRoute } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  return Response.json(routes, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
