import { getPublishedRouteData } from "@/lib/route-repository";

export const revalidate = 3600;

const publicApiHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, If-None-Match",
  "Access-Control-Expose-Headers": "ETag",
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...publicApiHeaders,
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(request: Request) {
  const bundle = await getPublishedRouteData();
  const etag = `W/\"${bundle.version}\"`;

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ...publicApiHeaders, ETag: etag } });
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
        ...publicApiHeaders,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        ETag: etag,
      },
    },
  );
}
