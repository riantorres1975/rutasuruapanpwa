import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type RutaEntry = { id: number; nombre: string; color: string; coordenadas: number[][] };
type GroupedEntry = { ruta: string; color: string; ida?: number[][]; vuelta?: number[][] };

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
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

  const { nombre, coordenadas } = body;

  if (typeof nombre !== "string" || !Array.isArray(coordenadas)) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const rutasPath = join(process.cwd(), "data/rutas.json");
  const groupedPath = join(process.cwd(), "data/rutas-grouped.json");

  const rutas: RutaEntry[] = JSON.parse(readFileSync(rutasPath, "utf8"));
  const idx = rutas.findIndex((r) => r.nombre === nombre);
  if (idx === -1) {
    return Response.json({ error: `Ruta no encontrada: ${nombre}` }, { status: 404 });
  }
  rutas[idx].coordenadas = coordenadas as number[][];
  writeFileSync(rutasPath, JSON.stringify(rutas, null, 2));

  const grouped: GroupedEntry[] = JSON.parse(readFileSync(groupedPath, "utf8"));
  const baseName = getBaseName(nombre);
  const direction = getDirection(nombre);
  const gIdx = grouped.findIndex((g) => normalize(g.ruta) === normalize(baseName));

  if (gIdx !== -1 && direction) {
    grouped[gIdx][direction] = coordenadas as number[][];
    writeFileSync(groupedPath, JSON.stringify(grouped, null, 2));
  }

  return Response.json({ ok: true, ruta: nombre, puntos: coordenadas.length });
}
