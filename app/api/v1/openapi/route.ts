import { createOpenApiDocument } from "@/lib/openapi";

export const revalidate = 86_400;

const publicHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept",
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...publicHeaders, "Access-Control-Max-Age": "86400" },
  });
}

export function GET() {
  return Response.json(createOpenApiDocument(), {
    headers: {
      ...publicHeaders,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Disposition": 'inline; filename="urugo-openapi.json"',
    },
  });
}
