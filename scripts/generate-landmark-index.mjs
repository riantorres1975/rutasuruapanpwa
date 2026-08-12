import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ROUTES_PATH = join(ROOT, "data", "rutas_produccion_final.json");
const OUTPUT_PATH = join(ROOT, "data", "landmark-places.json");

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const aliasesByName = new Map([
  ["instituto tecnologico superior de uruapan tec uruapan", [
    "tec uruapan",
    "tecnologico de uruapan",
    "instituto tecnologico de uruapan",
    "itsu",
    "tecnm uruapan",
  ]],
]);

const routes = JSON.parse(await readFile(ROUTES_PATH, "utf8"));
const places = new Map();

for (const route of routes) {
  for (const landmark of route.landmarks ?? []) {
    const key = normalize(landmark.name);
    if (!places.has(key)) {
      places.set(key, {
        label: landmark.name,
        center: landmark.point,
        aliases: aliasesByName.get(key) ?? [],
      });
    }
  }
}

const sortedPlaces = [...places.values()].sort((a, b) =>
  a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
);
await writeFile(OUTPUT_PATH, `${JSON.stringify(sortedPlaces, null, 2)}\n`, "utf8");
console.log(`[landmarks] Indexed ${sortedPlaces.length} unique places in ${OUTPUT_PATH}`);
