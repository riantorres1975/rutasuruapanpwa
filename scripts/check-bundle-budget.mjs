import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const MAP_PAGE_BUDGET_BYTES = 130_000;
const HOME_PAGE_BUDGET_BYTES = 23_000;
const mapChunkDirectory = path.join(process.cwd(), ".next", "static", "chunks", "app", "mapa");
const appChunkDirectory = path.join(process.cwd(), ".next", "static", "chunks", "app");
const chunkNames = await readdir(mapChunkDirectory);
const pageChunkName = chunkNames.find((name) => /^page-[a-f0-9]+\.js$/.test(name));

if (!pageChunkName) {
  throw new Error("No se encontró el chunk de /mapa. Ejecuta pnpm build antes de revisar el presupuesto.");
}

const pageChunkPath = path.join(mapChunkDirectory, pageChunkName);
const { size } = await stat(pageChunkPath);

if (size > MAP_PAGE_BUDGET_BYTES) {
  throw new Error(
    `El chunk inicial de /mapa mide ${size.toLocaleString("en-US")} bytes y supera el límite de ${MAP_PAGE_BUDGET_BYTES.toLocaleString("en-US")} bytes.`,
  );
}

console.log(
  `Bundle /mapa: ${size.toLocaleString("en-US")} / ${MAP_PAGE_BUDGET_BYTES.toLocaleString("en-US")} bytes.`,
);

const appChunkNames = await readdir(appChunkDirectory);
const homeChunkName = appChunkNames.find((name) => /^page-[a-f0-9]+\.js$/.test(name));
if (!homeChunkName) {
  throw new Error("No se encontró el chunk de la portada.");
}

const homeChunkPath = path.join(appChunkDirectory, homeChunkName);
const { size: homeSize } = await stat(homeChunkPath);
if (homeSize > HOME_PAGE_BUDGET_BYTES) {
  throw new Error(
    `El chunk inicial de la portada mide ${homeSize.toLocaleString("en-US")} bytes y supera el límite de ${HOME_PAGE_BUDGET_BYTES.toLocaleString("en-US")} bytes.`,
  );
}

console.log(
  `Bundle portada: ${homeSize.toLocaleString("en-US")} / ${HOME_PAGE_BUDGET_BYTES.toLocaleString("en-US")} bytes.`,
);
