import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

type RutaEntry = { id: number; nombre: string; color: string; coordenadas: number[][] };
type GroupedEntry = { ruta: string; color: string; ida?: number[][]; vuelta?: number[][] };

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/\s+/g, " ")
    .trim();
}

function getBaseName(nombre: string) {
  return nombre.replace(/\s*\((ida|vuelta)\)\s*$/i, "").trim();
}

function getDirection(nombre: string): "ida" | "vuelta" | null {
  const m = nombre.match(/\((ida|vuelta)\)\s*$/i);
  return m ? (m[1].toLowerCase() as "ida" | "vuelta") : null;
}

export async function POST(request: Request) {
  if (process.env.DEBUG_ROUTE_SAVE_ENABLED !== "true") {
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

  if (coordenadas.length > 5000) {
    return Response.json({ error: "Demasiadas coordenadas (máximo 5000)" }, { status: 400 });
  }

  const isValidCoord = (c: unknown): c is [number, number] =>
    Array.isArray(c) && c.length === 2 &&
    typeof c[0] === "number" && isFinite(c[0]) &&
    typeof c[1] === "number" && isFinite(c[1]) &&
    c[0] >= -180 && c[0] <= 180 &&
    c[1] >= -90 && c[1] <= 90;

  if (!coordenadas.every(isValidCoord)) {
    return Response.json({ error: "Coordenadas inválidas: cada elemento debe ser [lng, lat] con valores finitos dentro del rango" }, { status: 400 });
  }

  console.log(`[save-route] ruta="${ruta}" direccion="${direccion}" pts=${coordenadas.length}`);

  const rutasPath = join(process.cwd(), "data/rutas.json");
  const groupedPath = join(process.cwd(), "data/rutas-grouped.json");

  // Buscar en rutas.json por nombre base + dirección
  let rutas: RutaEntry[];
  try {
    rutas = JSON.parse(readFileSync(rutasPath, "utf8"));
  } catch (err) {
    console.error("[save-route] failed to read/parse rutas.json:", err);
    return Response.json({ error: "Error leyendo datos de rutas" }, { status: 500 });
  }

  const idx = rutas.findIndex(
    (r) => normalize(getBaseName(r.nombre)) === normalize(ruta) && getDirection(r.nombre) === direccion
  );

  if (idx === -1) {
    const available = rutas.slice(0, 8).map((r) => `"${r.nombre}"`).join(", ");
    console.error(`[save-route] NOT FOUND: ruta="${ruta}" dir="${direccion}". norm="${normalize(ruta)}". Available: ${available}`);
    return Response.json(
      { error: `Ruta no encontrada: "${ruta}" (${direccion}). Primeros nombres: ${available}` },
      { status: 404 }
    );
  }

  try {
    rutas[idx].coordenadas = coordenadas as number[][];
    writeFileSync(rutasPath, JSON.stringify(rutas, null, 2), { encoding: "utf8" });
  } catch (err) {
    console.error("[save-route] writeFileSync rutas.json failed:", err);
    return Response.json({ error: "Error guardando datos de ruta" }, { status: 500 });
  }

  // Actualizar rutas-grouped.json
  try {
    const grouped: GroupedEntry[] = JSON.parse(readFileSync(groupedPath, "utf8"));
    const gIdx = grouped.findIndex((g) => normalize(g.ruta) === normalize(ruta));
    if (gIdx !== -1) {
      grouped[gIdx][direccion as "ida" | "vuelta"] = coordenadas as number[][];
      writeFileSync(groupedPath, JSON.stringify(grouped, null, 2), { encoding: "utf8" });
      console.log(`[save-route] OK ruta="${ruta}" dir="${direccion}" gIdx=${gIdx} pts=${coordenadas.length}`);
    } else {
      console.warn(`[save-route] grouped entry not found for "${ruta}" — rutas.json updated but grouped.json not`);
    }
  } catch (err) {
    console.error("[save-route] grouped.json update failed:", err);
    return Response.json({ error: "Error actualizando datos agrupados de ruta" }, { status: 500 });
  }

  return Response.json({ ok: true, ruta, direccion, puntos: coordenadas.length });
}
