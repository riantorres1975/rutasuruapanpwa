export type MapNetworkInformation = {
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
};

type MapLoadContext = {
  connection?: MapNetworkInformation;
  hasSharedState: boolean;
  isMobile: boolean;
  isOnline: boolean;
};

const MOBILE_AUTO_LOAD_DELAY_MS = 3200;
const DESKTOP_AUTO_LOAD_DELAY_MS = 250;
const CONSTRAINED_EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g"]);

export function isMapConnectionConstrained(connection?: MapNetworkInformation) {
  if (!connection) return false;
  if (connection.saveData) return true;
  if (connection.effectiveType && CONSTRAINED_EFFECTIVE_TYPES.has(connection.effectiveType)) {
    return true;
  }
  return typeof connection.downlink === "number" && connection.downlink > 0 && connection.downlink < 1.5;
}

export function shouldPreloadMap({ connection, isOnline }: MapLoadContext) {
  return isOnline && !isMapConnectionConstrained(connection);
}

export function getMapAutoLoadDelay({
  connection,
  hasSharedState,
  isMobile,
  isOnline,
}: MapLoadContext): number | null {
  if (hasSharedState) return 0;
  if (!isOnline || isMapConnectionConstrained(connection)) return null;
  return isMobile ? MOBILE_AUTO_LOAD_DELAY_MS : DESKTOP_AUTO_LOAD_DELAY_MS;
}
