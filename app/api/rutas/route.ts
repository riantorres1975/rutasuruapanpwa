import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  let rutasGrouped: unknown;
  try {
    rutasGrouped = JSON.parse(readFileSync(join(process.cwd(), "data/rutas-grouped.json"), "utf8"));
  } catch {
    return new Response(JSON.stringify({ error: "Route data unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!Array.isArray(rutasGrouped) || rutasGrouped.length === 0) {
    console.error("[GET /api/rutas] rutas-grouped.json is empty or invalid");
    return new Response(JSON.stringify({ error: "Route data unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return Response.json(rutasGrouped, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600"
    }
  });
}
