const fs = require("fs");
const path = require("path");

const inputFile = path.resolve(process.argv[2] || "data/rutas.json");
const outputFile = path.resolve(process.argv[3] || "data/rutas-grouped.json");

if (!fs.existsSync(inputFile)) {
  throw new Error(`No existe el archivo de entrada: ${inputFile}`);
}

const routes = JSON.parse(fs.readFileSync(inputFile, "utf8"));

if (!Array.isArray(routes)) {
  throw new Error("El archivo de entrada no contiene un arreglo de rutas");
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDirection(name) {
  const match = String(name || "").match(/\((ida|vuelta)\)\s*$/i);
  if (!match) {
    return null;
  }

  return normalizeKey(match[1]) === "ida" ? "ida" : "vuelta";
}

function getBaseName(name) {
  return String(name || "")
    .replace(/\s*\((ida|vuelta)\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidCoordinates(value) {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }

  return value.every(
    (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(Number(point[0])) &&
      Number.isFinite(Number(point[1]))
  );
}

function toCoordKey(coordinates) {
  return JSON.stringify(coordinates);
}

const grouped = new Map();

let invalidRoutes = 0;
let duplicateSegments = 0;
let missingDirectionAssigned = 0;

for (const route of routes) {
  const name = String(route?.nombre || "").trim();
  const coordinates = route?.coordenadas;

  if (!name || !isValidCoordinates(coordinates)) {
    invalidRoutes += 1;
    continue;
  }

  const baseName = getBaseName(name);
  const key = normalizeKey(baseName);
  const direction = getDirection(name);

  if (!grouped.has(key)) {
    grouped.set(key, {
      ruta: baseName,
      color: route?.color || "#007AFF",
      ida: undefined,
      vuelta: undefined,
      seen: new Set()
    });
  }

  const group = grouped.get(key);
  const coordKey = toCoordKey(coordinates);

  if (group.seen.has(coordKey)) {
    duplicateSegments += 1;
    continue;
  }

  group.seen.add(coordKey);

  if (direction === "ida") {
    if (!group.ida) {
      group.ida = coordinates;
    } else {
      duplicateSegments += 1;
    }
    continue;
  }

  if (direction === "vuelta") {
    if (!group.vuelta) {
      group.vuelta = coordinates;
    } else {
      duplicateSegments += 1;
    }
    continue;
  }

  if (!group.ida) {
    group.ida = coordinates;
    missingDirectionAssigned += 1;
  } else if (!group.vuelta) {
    group.vuelta = coordinates;
    missingDirectionAssigned += 1;
  } else {
    duplicateSegments += 1;
  }
}

const groupedRoutes = Array.from(grouped.values())
  .map((group) => {
    const output = {
      ruta: group.ruta,
      color: group.color
    };

    if (group.ida) {
      output.ida = group.ida;
    }

    if (group.vuelta) {
      output.vuelta = group.vuelta;
    }

    return output;
  })
  .sort((a, b) => a.ruta.localeCompare(b.ruta, "es", { sensitivity: "base", numeric: true }));

const telefericoRoute = {
  ruta: "Teleférico Uruapan",
  color: "#00D4AA",
  ida: [
    [-102.02093, 19.396299],
    [-102.025606, 19.4146744],
    [-102.0375379, 19.4216787],
    [-102.0477917, 19.4211717],
    [-102.0585911, 19.419822],
    [-102.0769769, 19.4306165]
  ],
  vuelta: [
    [-102.0769769, 19.4306165],
    [-102.0585911, 19.419822],
    [-102.0477917, 19.4211717],
    [-102.0375379, 19.4216787],
    [-102.025606, 19.4146744],
    [-102.02093, 19.396299]
  ]
};

if (!groupedRoutes.some((route) => normalizeKey(route.ruta) === normalizeKey(telefericoRoute.ruta))) {
  groupedRoutes.push(telefericoRoute);
}

fs.writeFileSync(outputFile, JSON.stringify(groupedRoutes, null, 2));

console.log(`Rutas originales leidas: ${routes.length}`);
console.log(`Grupos creados: ${groupedRoutes.length}`);
console.log(`Rutas invalidas omitidas: ${invalidRoutes}`);
console.log(`Segmentos duplicados omitidos: ${duplicateSegments}`);
console.log(`Segmentos sin direccion asignados: ${missingDirectionAssigned}`);
console.log(`Salida: ${outputFile}`);
