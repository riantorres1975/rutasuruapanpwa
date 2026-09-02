import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

if (!url || !secretKey) {
  throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY antes de importar rutas.");
}

const source = JSON.parse(
  await readFile(resolve(process.cwd(), "data/rutas_produccion_final.json"), "utf8"),
);

if (!Array.isArray(source) || source.length === 0) {
  throw new Error("data/rutas_produccion_final.json está vacío o no es válido.");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const now = new Date().toISOString();
const lastManualVerification = "2026-06-30T00:00:00.000Z";
const routes = source.map((route) => ({
  id: route.id,
  name: route.name,
  original_name: route.original_name,
  color: route.color,
  corridor_width_m: route.corridor_width_m,
  verified: Boolean(route.verified),
  path: route.path,
  landmarks: route.landmarks ?? [],
  operational_status: "active",
  publication_status: "published",
  data_version: 1,
  last_verified_at: route.verified ? lastManualVerification : null,
  published_at: now,
}));

const revisions = routes.map((route) => ({
  route_id: route.id,
  version: 1,
  name: route.name,
  original_name: route.original_name,
  color: route.color,
  corridor_width_m: route.corridor_width_m,
  verified: route.verified,
  path: route.path,
  landmarks: route.landmarks,
  change_summary: "Importación inicial desde rutas_produccion_final.json",
  source: "static_import",
}));

for (let offset = 0; offset < routes.length; offset += 25) {
  const { error } = await supabase.from("routes").upsert(routes.slice(offset, offset + 25), { onConflict: "id" });
  if (error) throw new Error(`No se pudieron importar rutas: ${error.message}`);
}

for (let offset = 0; offset < revisions.length; offset += 25) {
  const { error } = await supabase
    .from("route_revisions")
    .upsert(revisions.slice(offset, offset + 25), { onConflict: "route_id,version", ignoreDuplicates: true });
  if (error) throw new Error(`No se pudo crear el historial inicial: ${error.message}`);
}

console.log(`Importación terminada: ${routes.length} recorridos y ${revisions.length} revisiones.`);
