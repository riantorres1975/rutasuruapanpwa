import { getPublishedRouteData } from "@/lib/route-repository";

export const revalidate = 3600;

export async function GET(request: Request) {
  const bundle = await getPublishedRouteData();
  const etag = `W/\"${bundle.version}\"`;

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return Response.json(
    {
      meta: {
        version: bundle.version,
        source: bundle.source,
        count: bundle.routes.length,
      },
      routes: bundle.routes,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        ETag: etag,
      },
    },
  );
}
