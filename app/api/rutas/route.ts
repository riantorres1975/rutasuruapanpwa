import rutasGrouped from "@/data/rutas-grouped.json";

export const revalidate = 86400;

export async function GET() {
  return Response.json(rutasGrouped, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"
    }
  });
}
