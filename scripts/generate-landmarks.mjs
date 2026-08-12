import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ROUTES_PATH = join(ROOT, "data", "rutas_produccion_final.json");
const CACHE_PATH = join(ROOT, ".cache", "landmarks-osm.json");
const REVIEW_PATH = join(ROOT, ".cache", "landmarks-review.json");
const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const SEARCH_RADIUS_M = 190;
const FALLBACK_RADIUS_M = 300;
const MAX_LANDMARKS = 10;
const TARGET_LANDMARKS = 8;
const MIN_LANDMARKS = 5;
const CURATED_LANDMARKS = new Map([
  ["Ruta 27", [{
    name: "Instituto Tecnológico Superior de Uruapan (Tec Uruapan)",
    point: [-102.0747, 19.47727],
  }]],
]);
const argv = new Set(process.argv.slice(2));
const shouldApply = argv.has("--apply");
const shouldRefresh = argv.has("--refresh");

if (argv.has("--help")) {
  console.log(`Usage: node scripts/generate-landmarks.mjs [--apply] [--refresh]

  --apply    Write selected landmarks into empty route records.
  --refresh  Refresh the cached OpenStreetMap extract before generating.

Without --apply, the script only writes ${REVIEW_PATH}.`);
  process.exit(0);
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function haversineMeters(a, b) {
  const radius = 6_371_000;
  const toRadians = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRadians;
  const dLng = (b[0] - a[0]) * toRadians;
  const lat1 = a[1] * toRadians;
  const lat2 = b[1] * toRadians;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function routeMetrics(path) {
  const cumulative = [0];
  for (let index = 1; index < path.length; index += 1) {
    cumulative.push(cumulative[index - 1] + haversineMeters(path[index - 1], path[index]));
  }
  return { cumulative, lengthM: cumulative.at(-1) ?? 0 };
}

function distanceToSegment(point, start, end) {
  const radius = 6_371_000;
  const toRadians = Math.PI / 180;
  const referenceLat = ((point[1] + start[1] + end[1]) / 3) * toRadians;
  const project = ([lng, lat]) => [
    lng * toRadians * radius * Math.cos(referenceLat),
    lat * toRadians * radius,
  ];
  const [px, py] = project(point);
  const [ax, ay] = project(start);
  const [bx, by] = project(end);
  const dx = bx - ax;
  const dy = by - ay;
  const denominator = dx * dx + dy * dy;
  const t = denominator === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator));
  return { distanceM: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t };
}

function locateOnRoute(point, path, metrics) {
  let best = { distanceM: Number.POSITIVE_INFINITY, progressM: 0 };
  let nearestVertexM = Number.POSITIVE_INFINITY;

  for (let index = 0; index < path.length; index += 1) {
    nearestVertexM = Math.min(nearestVertexM, haversineMeters(point, path[index]));
    if (index === 0) continue;
    const segment = distanceToSegment(point, path[index - 1], path[index]);
    if (segment.distanceM >= best.distanceM) continue;
    const segmentLength = metrics.cumulative[index] - metrics.cumulative[index - 1];
    best = {
      distanceM: segment.distanceM,
      progressM: metrics.cumulative[index - 1] + segmentLength * segment.t,
    };
  }

  return { ...best, nearestVertexM };
}

function routeBbox(routes) {
  const points = routes.flatMap((route) => route.path);
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  const margin = 0.008;
  return {
    south: Math.min(...lats) - margin,
    west: Math.min(...lngs) - margin,
    north: Math.max(...lats) + margin,
    east: Math.max(...lngs) + margin,
  };
}

function buildOverpassQuery(bbox) {
  const area = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:90];
(
  nwr["name"]["amenity"](${area});
  nwr["name"]["shop"](${area});
  nwr["name"]["tourism"](${area});
  nwr["name"]["leisure"](${area});
  nwr["name"]["historic"](${area});
  nwr["name"]["office"="government"](${area});
  nwr["name"]["place"~"neighbourhood|suburb|quarter|village"](${area});
  nwr["name"]["public_transport"](${area});
);
out center tags;`;
}

async function downloadOsmElements(bbox) {
  const query = buildOverpassQuery(bbox);
  let lastError;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: { "user-agent": "UruGo-landmark-generator/1.0 (https://www.urugo.app)" },
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      if (!Array.isArray(payload.elements)) throw new Error("Invalid Overpass response");

      const cache = {
        generatedAt: new Date().toISOString(),
        source: "OpenStreetMap contributors",
        license: "ODbL 1.0",
        copyright: OSM_COPYRIGHT_URL,
        bbox,
        elements: payload.elements,
      };
      await mkdir(dirname(CACHE_PATH), { recursive: true });
      await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
      return cache;
    } catch (error) {
      lastError = error;
      console.warn(`[landmarks] ${endpoint} failed: ${error.message}`);
    }
  }

  throw lastError ?? new Error("No Overpass endpoint was available");
}

async function loadOsmElements(bbox) {
  if (!shouldRefresh && existsSync(CACHE_PATH)) {
    return JSON.parse(await readFile(CACHE_PATH, "utf8"));
  }
  return downloadOsmElements(bbox);
}

const AMENITY_RULES = {
  hospital: [120, "hospital"],
  bus_station: [115, "terminal"],
  university: [112, "university"],
  college: [108, "college"],
  marketplace: [106, "market"],
  townhall: [105, "government"],
  clinic: [100, "clinic"],
  school: [90, "school"],
  courthouse: [90, "government"],
  police: [88, "public-service"],
  fire_station: [88, "public-service"],
  community_centre: [86, "community"],
  library: [86, "culture"],
  theatre: [84, "culture"],
  cinema: [82, "culture"],
  arts_centre: [82, "culture"],
  place_of_worship: [68, "place-of-worship"],
  kindergarten: [66, "school"],
};

const SHOP_RULES = {
  mall: [108, "shopping-centre"],
  department_store: [98, "department-store"],
  supermarket: [92, "supermarket"],
};

const LEISURE_RULES = {
  nature_reserve: [105, "nature-reserve"],
  stadium: [100, "stadium"],
  sports_centre: [92, "sports-centre"],
  park: [86, "park"],
};

const TOURISM_RULES = {
  museum: [105, "museum"],
  attraction: [95, "attraction"],
  viewpoint: [90, "viewpoint"],
  hotel: [62, "hotel"],
  artwork: [58, "artwork"],
};

const HISTORIC_RULES = {
  monument: [92, "monument"],
  archaeological_site: [90, "historic-site"],
  memorial: [72, "memorial"],
};

const IMPORTANT_NAME_PATTERN = /\b(hospital|imss|issste|universidad|instituto|colegio|mercado|plaza|coppel|aurrera|walmart|soriana|presidencia|catedral|estadio|unidad deportiva|parque nacional|central de autobuses)\b/i;
const LOW_VALUE_NAME_PATTERN = /^(oxxo|farmacias? similares|farmacias? guadalajara|abarrotes|pemex|gasolinera|cancha|area verde|jardin vecinal)(\s|$)/i;
const GENERIC_NAME_PATTERN = /^(parque|area del templo)$/i;
const NAME_CORRECTIONS = new Map([
  ["capilla del nino jesus", "Capilla del Niño Jesús"],
  ["casa mas chiquita del mundo", "Casa Más Chiquita del Mundo"],
  ["cendi", "CENDI"],
  ["escuela secundaria federeal urbana no 4", "Escuela Secundaria Federal Urbana No. 4"],
  ["gral lazaro cardenas", "Monumento a Lázaro Cárdenas"],
  ["h cuerpo de rescate y salvamento michoacan", "H. Cuerpo de Rescate y Salvamento Michoacán"],
  ["hospital el angel", "Hospital El Ángel"],
  ["infonavit", "INFONAVIT"],
  ["inifap capo experimental uruapan", "INIFAP Campo Experimental Uruapan"],
  ["josefa ortiz de domiguez", "Josefa Ortiz de Domínguez"],
  ["paraiso villa", "Paraíso Villa"],
  ["parque skate", "Skatepark"],
  ["prim francisco villa", "Primaria Francisco Villa"],
  ["profesor genaro vazquez rojas", "Profesor Genaro Vázquez Rojas"],
  ["templo de san miguel arcangel", "Templo de San Miguel Arcángel"],
]);

function cleanName(name) {
  return NAME_CORRECTIONS.get(normalize(name)) ?? name;
}

function classify(tags, name) {
  const normalizedName = normalize(name);
  if (LOW_VALUE_NAME_PATTERN.test(normalizedName) || GENERIC_NAME_PATTERN.test(normalizedName)) return null;

  let rule;
  if (tags.amenity) rule = AMENITY_RULES[tags.amenity];
  if (!rule && tags.shop) rule = SHOP_RULES[tags.shop];
  if (!rule && tags.leisure) rule = LEISURE_RULES[tags.leisure];
  if (!rule && tags.tourism) rule = TOURISM_RULES[tags.tourism];
  if (!rule && tags.historic) rule = HISTORIC_RULES[tags.historic];
  if (!rule && tags.office === "government") rule = [94, "government"];
  if (!rule && tags.place) rule = [96, "neighbourhood"];
  if (!rule && tags.public_transport === "station") rule = [92, "station"];
  if (!rule && tags.public_transport) rule = [58, "public-transport"];
  if (!rule) return null;

  let [priority, category] = rule;
  if (IMPORTANT_NAME_PATTERN.test(name)) priority += 12;
  return priority >= 55 ? { priority, category } : null;
}

function elementPoint(element) {
  const lng = element.lon ?? element.center?.lon;
  const lat = element.lat ?? element.center?.lat;
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

function buildPois(elements) {
  const pois = [];
  for (const element of elements) {
    const rawName = element.tags?.name?.trim();
    const point = elementPoint(element);
    if (!rawName || rawName.length < 3 || rawName.length > 100 || !point) continue;
    const name = cleanName(rawName);
    const classification = classify(element.tags, name);
    if (!classification) continue;
    pois.push({
      name,
      normalizedName: normalize(name),
      point,
      ...classification,
      osm: { type: element.type, id: element.id },
    });
  }
  return pois;
}

function candidatesForRoute(route, pois, radiusM) {
  const metrics = routeMetrics(route.path);
  const byName = new Map();

  for (const poi of pois) {
    const location = locateOnRoute(poi.point, route.path, metrics);
    if (location.distanceM > radiusM || location.nearestVertexM > route.corridor_width_m) continue;
    const progressRatio = metrics.lengthM > 0 ? location.progressM / metrics.lengthM : 0;
    const endpointBonus = progressRatio <= 0.08 || progressRatio >= 0.92 ? 8 : 0;
    const score = poi.priority + endpointBonus + Math.max(0, 18 - location.distanceM / 10);
    const candidate = { ...poi, ...location, progressRatio, score };
    const previous = byName.get(poi.normalizedName);
    if (!previous || candidate.score > previous.score) byName.set(poi.normalizedName, candidate);
  }

  return { candidates: [...byName.values()], metrics };
}

function canAddCandidate(candidate, selected, routeLengthM) {
  return selected.every((current) => {
    if (current.normalizedName === candidate.normalizedName) return false;
    const spatialGap = haversineMeters(current.point, candidate.point);
    if (spatialGap < 140) return false;
    const alongRouteGap = Math.abs(current.progressM - candidate.progressM);
    const minimumGap = Math.min(420, Math.max(220, routeLengthM / 24));
    return alongRouteGap >= minimumGap;
  });
}

function selectLandmarks(candidates, metrics) {
  const available = [...candidates];
  const selected = [];

  while (selected.length < TARGET_LANDMARKS && available.length > 0) {
    let bestIndex = -1;
    let bestUtility = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < available.length; index += 1) {
      const candidate = available[index];
      if (!canAddCandidate(candidate, selected, metrics.lengthM)) continue;
      const nearestProgress = selected.length === 0
        ? metrics.lengthM
        : Math.min(...selected.map((current) => Math.abs(current.progressM - candidate.progressM)));
      const spreadBonus = Math.min(24, nearestProgress / 55);
      const utility = candidate.score + spreadBonus;
      if (utility > bestUtility) {
        bestUtility = utility;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) break;
    selected.push(available.splice(bestIndex, 1)[0]);
  }

  for (const candidate of available.sort((a, b) => b.score - a.score)) {
    if (selected.length >= MAX_LANDMARKS) break;
    if (candidate.priority < 100 || !canAddCandidate(candidate, selected, metrics.lengthM)) continue;
    selected.push(candidate);
  }

  return selected.sort((a, b) => a.progressM - b.progressM);
}

function cleanReviewCandidate(candidate) {
  return {
    name: candidate.name,
    point: candidate.point.map((value) => Number(value.toFixed(7))),
    category: candidate.category,
    distanceM: Math.round(candidate.distanceM),
    progressPercent: Math.round(candidate.progressRatio * 100),
    osm: candidate.osm,
  };
}

const routes = JSON.parse(await readFile(ROUTES_PATH, "utf8"));
const bbox = routeBbox(routes);
const osmCache = await loadOsmElements(bbox);
const pois = buildPois(osmCache.elements);
const reviewRoutes = [];
let generatedCount = 0;

for (const route of routes) {
  const curatedLandmarks = CURATED_LANDMARKS.get(route.name) ?? [];
  if (route.landmarks.length > 0) {
    const existingNames = new Set(route.landmarks.map((landmark) => normalize(landmark.name)));
    route.landmarks.push(
      ...curatedLandmarks.filter((landmark) => !existingNames.has(normalize(landmark.name))),
    );
    reviewRoutes.push({
      id: route.id,
      originalName: route.original_name,
      status: "preserved",
      landmarks: route.landmarks,
    });
    continue;
  }

  let { candidates, metrics } = candidatesForRoute(route, pois, SEARCH_RADIUS_M);
  let radiusM = SEARCH_RADIUS_M;
  let selected = selectLandmarks(candidates, metrics);
  if (selected.length < MIN_LANDMARKS) {
    ({ candidates, metrics } = candidatesForRoute(route, pois, FALLBACK_RADIUS_M));
    radiusM = FALLBACK_RADIUS_M;
    selected = selectLandmarks(candidates, metrics);
  }

  route.landmarks = selected.map((candidate) => ({
    name: candidate.name,
    point: candidate.point.map((value) => Number(value.toFixed(7))),
  }));
  const generatedNames = new Set(route.landmarks.map((landmark) => normalize(landmark.name)));
  route.landmarks.push(
    ...curatedLandmarks.filter((landmark) => !generatedNames.has(normalize(landmark.name))),
  );
  generatedCount += route.landmarks.length;
  reviewRoutes.push({
    id: route.id,
    originalName: route.original_name,
    status: selected.length >= MIN_LANDMARKS ? "generated" : "needs-review",
    radiusM,
    routeLengthM: Math.round(metrics.lengthM),
    landmarks: selected.map(cleanReviewCandidate),
  });
}

const review = {
  generatedAt: new Date().toISOString(),
  source: "OpenStreetMap contributors",
  license: "ODbL 1.0",
  copyright: OSM_COPYRIGHT_URL,
  osmExtractedAt: osmCache.generatedAt,
  osmElementCount: osmCache.elements.length,
  eligiblePoiCount: pois.length,
  generatedLandmarkCount: generatedCount,
  routes: reviewRoutes,
};

await mkdir(dirname(REVIEW_PATH), { recursive: true });
await writeFile(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`, "utf8");

if (shouldApply) {
  await writeFile(ROUTES_PATH, `${JSON.stringify(routes, null, 2)}\n`, "utf8");
}

const generatedRoutes = reviewRoutes.filter((route) => route.status === "generated");
const needsReview = reviewRoutes.filter((route) => route.status === "needs-review");
console.log(`[landmarks] OSM elements: ${osmCache.elements.length}; eligible POIs: ${pois.length}`);
console.log(`[landmarks] Generated: ${generatedCount} landmarks for ${generatedRoutes.length + needsReview.length} directions`);
console.log(`[landmarks] Review: ${REVIEW_PATH}`);
if (needsReview.length > 0) {
  console.warn(`[landmarks] Needs manual review (${needsReview.length}): ${needsReview.map((route) => route.originalName).join(", ")}`);
}
console.log(shouldApply ? `[landmarks] Updated: ${ROUTES_PATH}` : "[landmarks] Dry run only; use --apply to update route data");
