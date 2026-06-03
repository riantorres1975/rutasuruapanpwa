import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

type ProductionRoute = {
  id: number;
  name: string;
  original_name: string;
  color: string;
  corridor_width_m: number;
  verified: boolean;
  path: number[][];
  landmarks: unknown[];
};

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual exige buffers del mismo largo; si difieren, no es válido.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAuthorized(request: Request) {
  const expectedToken = process.env.DEBUG_ROUTE_SAVE_TOKEN;
  if (process.env.DEBUG_ROUTE_SAVE_ENABLED !== "true" || !expectedToken) {
    return false;
  }

  const auth = request.headers.get("authorization");
  return auth != null && safeEqual(auth, `Bearer ${expectedToken}`);
}

function isValidCoord(c: unknown): c is [number, number] {
  return (
    Array.isArray(c) && c.length === 2 &&
    typeof c[0] === "number" && Number.isFinite(c[0]) &&
    typeof c[1] === "number" && Number.isFinite(c[1]) &&
    c[0] >= -180 && c[0] <= 180 &&
    c[1] >= -90 && c[1] <= 90
  );
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Recurso no disponible" }, { status: 404 });
  }

  if (!isAuthorized(request)) {
    return Response.json({ error: "Recurso no disponible" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { ruta, direccion, coordenadas } = body;

  if (typeof ruta !== "string" || typeof direccion !== "string" || !Array.isArray(coordenadas)) {
    return Response.json({ error: "Datos inválidos: se requiere ruta, direccion y coordenadas" }, { status: 400 });
  }

  if (direccion !== "ida" && direccion !== "vuelta") {
    return Response.json({ error: "Dirección inválida: usa ida o vuelta" }, { status: 400 });
  }

  if (coordenadas.length > 5000) {
    return Response.json({ error: "Demasiadas coordenadas (máximo 5000)" }, { status: 400 });
  }

  if (!coordenadas.every(isValidCoord)) {
    return Response.json({ error: "Coordenadas inválidas: cada elemento debe ser [lng, lat] con valores finitos dentro del rango" }, { status: 400 });
  }

  const produccionPath = join(process.cwd(), "data/rutas_produccion_final.json");

  let routes: ProductionRoute[];
  try {
    routes = JSON.parse(readFileSync(produccionPath, "utf8"));
  } catch (err) {
    console.error("[save-route] failed to read rutas_produccion_final.json:", err);
    return Response.json({ error: "Error leyendo datos de rutas" }, { status: 500 });
  }

  // Match by name and direction (original_name contains "Vuelta" for reverse direction)
  const isVuelta = direccion === "vuelta";
  const idx = routes.findIndex((r) => {
    const nameMatch = r.name.toLowerCase() === ruta.toLowerCase();
    const dirMatch = isVuelta ? r.original_name.includes("Vuelta") : !r.original_name.includes("Vuelta");
    return nameMatch && dirMatch;
  });

  if (idx === -1) {
    const available = routes.slice(0, 8).map((r) => `"${r.name}"`).join(", ");
    console.error(`[save-route] NOT FOUND: ruta="${ruta}" dir="${direccion}". Available: ${available}`);
    return Response.json(
      { error: `Ruta no encontrada: "${ruta}" (${direccion}). Primeros nombres: ${available}` },
      { status: 404 }
    );
  }

  try {
    routes[idx].path = coordenadas as number[][];
    writeFileSync(produccionPath, JSON.stringify(routes, null, 2), { encoding: "utf8" });
    console.log(`[save-route] OK ruta="${ruta}" dir="${direccion}" idx=${idx} pts=${coordenadas.length}`);
  } catch (err) {
    console.error("[save-route] writeFileSync failed:", err);
    return Response.json({ error: "Error guardando datos de ruta" }, { status: 500 });
  }

  return Response.json({ ok: true, ruta, direccion, puntos: coordenadas.length });
}
