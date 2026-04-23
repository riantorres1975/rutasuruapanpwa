const fs = require("fs");
const path = require("path");

const inputDir = path.resolve(process.argv[2] || "Rutas");
const outputFile = path.resolve(process.argv[3] || "data/rutas.json");

if (!fs.existsSync(inputDir)) {
  throw new Error(`No existe el directorio: ${inputDir}`);
}

const palette = [
  "#FF3B30",
  "#FF9500",
  "#34C759",
  "#007AFF",
  "#5856D6",
  "#AF52DE",
  "#FF2D55",
  "#00C7BE",
  "#30B0C7",
  "#64D2FF",
  "#FFD60A",
  "#FF6B6B"
];

const ignoredDirs = new Set(["node_modules", ".next", ".git", "dist", "build", "out"]);
const simplifyTolerance = 0.00002;

function hashString(text) {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getColor(baseName) {
  return palette[hashString(normalizeKey(baseName)) % palette.length];
}

function cleanBaseName(fileName) {
  let base = fileName.replace(/\.json$/i, "");
  base = base.replace(/(?:\s|-|_)?([12])$/, "");
  base = base.replace(/[()\[\]{}]+/g, " ");
  return base.trim().replace(/\s+/g, " ");
}

function cleanName(value) {
  return String(value || "")
    .replace(/[()\[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDirectionLabel(name) {
  const value = normalizeKey(name);
  if (/\bvuelta\b/.test(value)) {
    return "Vuelta";
  }
  if (/\bida\b/.test(value)) {
    return "Ida";
  }
  return null;
}

function inferDirectionFromFileName(fileName) {
  const base = fileName.replace(/\.json$/i, "").trim();
  if (/(?:\s|-|_)2$/.test(base) || /(\p{L})2$/u.test(base)) {
    return "Vuelta";
  }
  if (/(?:\s|-|_)1$/.test(base) || /(\p{L})1$/u.test(base)) {
    return "Ida";
  }
  return null;
}

function stripDirection(name) {
  return cleanName(name).replace(/\b(ida|vuelta)\b/gi, "").replace(/\s+/g, " ").trim();
}

function normalizePoint(rawPoint) {
  if (!Array.isArray(rawPoint) || rawPoint.length < 2) {
    return null;
  }

  let lng = Number(rawPoint[0]);
  let lat = Number(rawPoint[1]);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  if (Math.abs(lng) <= 90 && Math.abs(lat) > 90) {
    const tmp = lng;
    lng = lat;
    lat = tmp;
  }

  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    return null;
  }

  return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

function perpendicularDistanceSquared(point, start, end) {
  const x = point[0];
  const y = point[1];
  const x1 = start[0];
  const y1 = start[1];
  const x2 = end[0];
  const y2 = end[1];

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    const ddx = x - x1;
    const ddy = y - y1;
    return ddx * ddx + ddy * ddy;
  }

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const projectedX = x1 + clamped * dx;
  const projectedY = y1 + clamped * dy;
  const ddx = x - projectedX;
  const ddy = y - projectedY;

  return ddx * ddx + ddy * ddy;
}

function simplifyCoordinates(points, tolerance) {
  if (points.length <= 2) {
    return points;
  }

  const squaredTolerance = tolerance * tolerance;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop();
    let maxDistance = 0;
    let maxIndex = -1;

    for (let i = start + 1; i < end; i += 1) {
      const distance = perpendicularDistanceSquared(points[i], points[start], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxIndex !== -1 && maxDistance > squaredTolerance) {
      keep[maxIndex] = true;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function normalizeCoordinates(rawCoordinates) {
  const normalized = [];

  for (const point of rawCoordinates || []) {
    const normalizedPoint = normalizePoint(point);
    if (!normalizedPoint) {
      continue;
    }

    const previous = normalized[normalized.length - 1];
    if (!previous || previous[0] !== normalizedPoint[0] || previous[1] !== normalizedPoint[1]) {
      normalized.push(normalizedPoint);
    }
  }

  if (normalized.length > 2) {
    return simplifyCoordinates(normalized, simplifyTolerance);
  }

  return normalized;
}

function collectGeojsonFiles(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (extension !== ".geojson" && extension !== ".json") {
        continue;
      }

      if (path.resolve(fullPath) === outputFile) {
        continue;
      }

      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
}

function getShapeKey(coordinates) {
  return coordinates.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join("|");
}

const files = collectGeojsonFiles(inputDir);

const metrics = {
  filesScanned: files.length,
  sourceFilesUsed: 0,
  featuresRead: 0,
  invalidOrEmptyGeometry: 0,
  duplicatesByName: 0,
  duplicatesByCoordinates: 0,
  parseErrors: 0,
  pointsBeforeSimplify: 0,
  pointsAfterSimplify: 0
};

const routes = [];

for (const filePath of files) {
  let geojson;

  try {
    geojson = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    metrics.parseErrors += 1;
    continue;
  }

  if (!geojson || geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    continue;
  }

  const lineFeatures = geojson.features.filter((feature) => feature?.geometry?.type === "LineString");
  if (lineFeatures.length === 0) {
    continue;
  }

  metrics.sourceFilesUsed += 1;

  const fileName = path.basename(filePath);
  const fileBaseName = cleanBaseName(fileName);
  const fallbackDirection = inferDirectionFromFileName(fileName);

  for (let index = 0; index < lineFeatures.length; index += 1) {
    const feature = lineFeatures[index];
    metrics.featuresRead += 1;

    const rawCoordinates = Array.isArray(feature.geometry.coordinates) ? feature.geometry.coordinates : [];
    metrics.pointsBeforeSimplify += rawCoordinates.length;

    const coordinates = normalizeCoordinates(rawCoordinates);
    metrics.pointsAfterSimplify += coordinates.length;

    if (coordinates.length < 2) {
      metrics.invalidOrEmptyGeometry += 1;
      continue;
    }

    const propName = cleanName(feature?.properties?.name);

    let direction = getDirectionLabel(propName);
    if (!direction && lineFeatures.length === 2) {
      direction = index === 0 ? "Ida" : "Vuelta";
    }
    if (!direction) {
      direction = fallbackDirection;
    }

    const baseName = fileBaseName;

    const nombre = direction
      ? `${baseName} (${direction})`
      : lineFeatures.length > 1
        ? `${baseName} (${index + 1})`
        : baseName;

    routes.push({
      nombre,
      color: getColor(baseName),
      coordenadas: coordinates,
      _nameKey: normalizeKey(nombre),
      _shapeKey: getShapeKey(coordinates),
      _baseName: baseName,
      _direction: direction
    });
  }
}

routes.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }));

const seenNames = new Set();
const seenShapes = new Set();
const cleanedRoutes = [];

for (const route of routes) {
  if (seenShapes.has(route._shapeKey)) {
    metrics.duplicatesByCoordinates += 1;
    continue;
  }

  if (seenNames.has(route._nameKey)) {
    metrics.duplicatesByName += 1;
    continue;
  }

  seenShapes.add(route._shapeKey);
  seenNames.add(route._nameKey);

  cleanedRoutes.push({
    id: cleanedRoutes.length + 1,
    nombre: route.nombre,
    color: route.color,
    coordenadas: route.coordenadas
  });
}

const groupedDirections = new Map();

for (const route of routes) {
  const key = normalizeKey(route._baseName);
  if (!groupedDirections.has(key)) {
    groupedDirections.set(key, { ruta: route._baseName, ida: 0, vuelta: 0 });
  }

  const group = groupedDirections.get(key);
  if (route._direction === "Ida") {
    group.ida += 1;
  }
  if (route._direction === "Vuelta") {
    group.vuelta += 1;
  }
}

const groupedPairs = Array.from(groupedDirections.values()).filter(
  (item) => item.ida > 0 && item.vuelta > 0
).length;

const totalDuplicatesRemoved = metrics.duplicatesByCoordinates + metrics.duplicatesByName;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(cleanedRoutes, null, 2));

console.log(`Archivos escaneados: ${metrics.filesScanned}`);
console.log(`Archivos GeoJSON usados: ${metrics.sourceFilesUsed}`);
console.log(`LineStrings procesados: ${metrics.featuresRead}`);
console.log(`Geometrias invalidas/vacias: ${metrics.invalidOrEmptyGeometry}`);
console.log(`Duplicados eliminados (nombre): ${metrics.duplicatesByName}`);
console.log(`Duplicados eliminados (coordenadas): ${metrics.duplicatesByCoordinates}`);
console.log(`Duplicados eliminados (total): ${totalDuplicatesRemoved}`);
console.log(`Rutas con par ida/vuelta detectado: ${groupedPairs}`);
console.log(`Puntos antes de simplificar: ${metrics.pointsBeforeSimplify}`);
console.log(`Puntos despues de simplificar: ${metrics.pointsAfterSimplify}`);
console.log(`Errores de parseo: ${metrics.parseErrors}`);
console.log(`Rutas finales: ${cleanedRoutes.length}`);
console.log(`Salida: ${outputFile}`);
