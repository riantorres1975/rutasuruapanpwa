import { FARES_2026, TELEFERICO_URUAPAN } from "./mobility-config";

const TELEFERICO_ROUTE_NAME = "Teleférico Uruapan";
const BUS_FARE_MXN = parseFare(FARES_2026.urbanBus.price, 11);
const TELEFERICO_FARE_MXN = parseFare(FARES_2026.teleferico.price, 11);

export type JourneyFareSummary = {
  totalMxn: number;
  badge: string;
  detail: string;
};

function parseFare(value: string, fallback: number) {
  return Math.round(Number(value.replace(/[^0-9.]/g, "")) || fallback);
}

export function isTelefericoRouteName(routeName: string) {
  return routeName === TELEFERICO_ROUTE_NAME;
}

export function getTelefericoStationName(index: number) {
  if (!Number.isInteger(index) || index < 0) return null;
  return TELEFERICO_URUAPAN.stations[index] ?? null;
}

export function getJourneyFareSummary(routeNames: string[]): JourneyFareSummary {
  const telefericoCount = routeNames.filter(isTelefericoRouteName).length;
  const busCount = routeNames.length - telefericoCount;
  const totalMxn = busCount * BUS_FARE_MXN + telefericoCount * TELEFERICO_FARE_MXN;

  if (telefericoCount === 1 && busCount === 0) {
    return {
      totalMxn,
      badge: `$${totalMxn} tarjeta`,
      detail: `Tarifa: $${totalMxn} con tarjeta electrónica de movilidad; no acepta efectivo.`,
    };
  }

  if (telefericoCount > 0 && busCount > 0) {
    return {
      totalMxn,
      badge: `$${totalMxn} total (camión + Teleférico)`,
      detail: `Tarifa total: $${totalMxn}. Paga $${BUS_FARE_MXN} en efectivo en el camión y $${TELEFERICO_FARE_MXN} con tarjeta de movilidad en el Teleférico.`,
    };
  }

  return {
    totalMxn,
    badge: routeNames.length > 1
      ? `$${totalMxn} total (${routeNames.length} camiones)`
      : `$${totalMxn} efectivo`,
    detail: routeNames.length > 1
      ? `Tarifa total: $${totalMxn} (pagas $${BUS_FARE_MXN} en efectivo en cada camión).`
      : `Tarifa: $${totalMxn} en efectivo al abordar.`,
  };
}
