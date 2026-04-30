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

export async function GET() {
  return Response.json({ status: "ok", env: process.env.NODE_ENV });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Solo disponible en desarrollo" }, { status: 403 });
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

  const rutasPath = join(process.cwd(), "data/rutas.json");
  const groupedPath = join(process.cwd(), "data/rutas-grouped.json");

  // Buscar en rutas.json por nombre base + dirección
  const rutas: RutaEntry[] = JSON.parse(readFileSync(rutasPath, "utf8"));
  const idx = rutas.findIndex(
    (r) => normalize(getBaseName(r.nombre)) === normalize(ruta) && getDirection(r.nombre) === direccion
  );

  if (idx === -1) {
    // Log disponibles para debug
    const available = rutas.slice(0, 5).map((r) => r.nombre).join(", ");
    return Response.json(
      { error: `Ruta no encontrada: "${ruta}" (${direccion}). Primeros nombres: ${available}` },
      { status: 404 }
    );
  }

  rutas[idx].coordenadas = coordenadas as number[][];
  writeFileSync(rutasPath, JSON.stringify(rutas, null, 2));

  // Actualizar rutas-grouped.json
  const grouped: GroupedEntry[] = JSON.parse(readFileSync(groupedPath, "utf8"));
  const gIdx = grouped.findIndex((g) => normalize(g.ruta) === normalize(ruta));

  if (gIdx !== -1) {
    grouped[gIdx][direccion as "ida" | "vuelta"] = coordenadas as number[][];
    writeFileSync(groupedPath, JSON.stringify(grouped, null, 2));
  }

  return Response.json({ ok: true, ruta, direccion, puntos: coordenadas.length });
}
