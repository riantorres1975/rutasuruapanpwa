import rutasGrouped from "@/data/rutas-grouped.json";

// Revalidate at most once per day. The data is static route geometry
// that changes only when the data pipeline is re-run and deployed.
export const revalidate = 86400;

export async function GET() {
  // Guard: if the JSON file is empty or malformed after a bad pipeline run,
  // return a 500 rather than silently serving an empty array to all clients.
  if (!Array.isArray(rutasGrouped) || rutasGrouped.length === 0) {
    console.error("[GET /api/rutas] rutas-grouped.json is empty or invalid");
    return new Response(JSON.stringify({ error: "Route data unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return Response.json(rutasGrouped, {
    headers: {
      // max-age=3600: browsers re-validate after 1 hour
      // s-maxage=86400: Vercel edge CDN serves stale for up to 24 h
      // stale-while-revalidate=3600: edge may serve stale while fetching fresh
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600"
    }
  });
}
