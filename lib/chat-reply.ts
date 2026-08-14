import {
  findRelevantLandmarks,
  findRelevantPlaces,
  findRelevantRouteNames,
} from "@/lib/chat-grounding";
import { FARES_2026 } from "@/lib/mobility-config";
import { getSchedule } from "@/lib/schedules";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function joinNatural(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

function formatRouteOptions(routeNames: string[]): string {
  const shown = routeNames.slice(0, 5);
  if (routeNames.length > shown.length) {
    return `${shown.join(", ")} y ${routeNames.length - shown.length} más`;
  }
  return joinNatural(shown);
}

function uniqueRouteNames(routeNames: string[]): string[] {
  return [...new Set(routeNames)];
}

function findSingleScheduledRoute(message: string, userHistory: string[]): string | null {
  const normalized = normalize(message);
  const hasExactRoute = /\bruta\s*\d+[a-z]?\b/.test(normalized);
  const asksTeleferico = normalized.includes("teleferico");
  if (!hasExactRoute && !asksTeleferico) return null;

  const matches = findRelevantRouteNames(message, userHistory);
  return matches.length === 1 ? matches[0] : null;
}

export function buildVerifiedChatReply(
  message: string,
  userHistory: string[] = [],
  hasLocation = false,
): string | null {
  const normalized = normalize(message);
  const asksFare = /\b(precio|tarifa|cuesta|costo|vale|cobran)\b/.test(normalized);
  if (asksFare) {
    if (normalized.includes("teleferico")) {
      return `El Teleférico cuesta ${FARES_2026.teleferico.price} por viaje y se paga con tarjeta de movilidad; no acepta efectivo.`;
    }
    if (/\b(camion|combi|urbano|pasaje)\b/.test(normalized)) {
      return `El camión urbano cuesta ${FARES_2026.urbanBus.price} por viaje y normalmente se paga en efectivo al subir.`;
    }
    return `El camión urbano y el Teleférico cuestan ${FARES_2026.urbanBus.price} por viaje. El camión suele pagarse en efectivo y el Teleférico requiere tarjeta de movilidad.`;
  }

  const asksSchedule =
    /\b(horario|empieza|termina|abre|cierra)\b/.test(normalized) ||
    normalized.includes("a que hora") ||
    normalized.includes("hasta que hora") ||
    normalized.includes("cada cuanto");
  if (asksSchedule) {
    const routeName = findSingleScheduledRoute(message, userHistory);
    const schedule = routeName ? getSchedule(routeName) : null;
    if (routeName && schedule?.continuous) {
      return `${routeName} opera de ${schedule.first} a ${schedule.last} en servicio continuo.`;
    }
    if (routeName && schedule) {
      return `${routeName} opera aproximadamente de ${schedule.first} a ${schedule.last}, con frecuencia estimada de ${schedule.freqMin} a ${schedule.freqMax} minutos.`;
    }
  }

  const landmarkMatches = findRelevantLandmarks(message, userHistory);
  const placeMatches = findRelevantPlaces(message, userHistory);
  const asksDirections =
    normalized.includes("como llego") ||
    normalized.includes("como llegar") ||
    /\b(ir|llevarme|lleva)\b/.test(normalized);
  const asksWhichRoute =
    normalized.includes("que ruta") ||
    normalized.includes("cual ruta") ||
    /\b(ruta|camion|combi)s?\b.*\b(pasa|llega|va|deja)\b/.test(normalized);

  const asksForCenter = /\b(centro|centro historico|primer cuadro|zocalo)\b/.test(normalized);
  if ((asksDirections || asksWhichRoute) && asksForCenter) {
    if (asksDirections && !asksWhichRoute && !hasLocation && !normalized.includes(" desde ")) {
      return "Necesito saber desde dónde sales para calcular el viaje al Centro. Como referencia, las Rutas 25, 26 y 76 entran directamente al primer cuadro; otras pasan a algunas cuadras.";
    }
    return "Las Rutas 25, 26 y 76 entran directamente al primer cuadro. Otras rutas pasan a algunas cuadras, así que confirma tu origen y el punto exacto en el mapa.";
  }

  const placeMatch = placeMatches[0];
  const landmarkMatch = landmarkMatches[0];
  const matchedPlaceName = placeMatch?.placeName ?? landmarkMatch?.landmarkName;
  const matchedRouteNames = uniqueRouteNames([
    ...(landmarkMatch?.routeNames ?? []),
    ...(placeMatch?.routes.map((route) => route.name) ?? []),
  ]);

  if (asksDirections) {
    if (!matchedPlaceName || matchedRouteNames.length === 0) {
      return "No encontré ese destino con suficiente certeza. Márcalo directamente en el mapa para calcular una ruta sin adivinar el recorrido.";
    }
    const nearbyRoutes = formatRouteOptions(matchedRouteNames);
    if (!hasLocation && !normalized.includes(" desde ")) {
      return `Encontré ${matchedPlaceName}, pero necesito saber desde dónde sales para calcular el viaje. Como referencia, ${nearbyRoutes} ${matchedRouteNames.length === 1 ? "pasa" : "pasan"} cerca.`;
    }
    return `Para calcular el trayecto exacto hasta ${matchedPlaceName}, marca origen y destino en el mapa. Como referencia verificada, ${nearbyRoutes} ${matchedRouteNames.length === 1 ? "pasa" : "pasan"} cerca del lugar.`;
  }

  if (asksWhichRoute && matchedPlaceName && matchedRouteNames.length > 0) {
    const routeOptions = formatRouteOptions(matchedRouteNames);
    return `${routeOptions} ${matchedRouteNames.length === 1 ? "pasa" : "pasan"} cerca de ${matchedPlaceName}. Confirma el sentido y tu punto de abordaje en el mapa.`;
  }

  return null;
}
