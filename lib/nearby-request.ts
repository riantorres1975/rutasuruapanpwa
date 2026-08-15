const NEARBY_REQUEST_KEY = "urugo-nearby-routes-request";

export function rememberNearbyRoutesRequest() {
  try {
    window.sessionStorage.setItem(NEARBY_REQUEST_KEY, "1");
  } catch {
    // La URL sigue siendo la fuente principal cuando el almacenamiento no esta disponible.
  }
}

export function hasNearbyRoutesRequest() {
  try {
    return window.sessionStorage.getItem(NEARBY_REQUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumeNearbyRoutesRequest() {
  try {
    const requested = window.sessionStorage.getItem(NEARBY_REQUEST_KEY) === "1";
    window.sessionStorage.removeItem(NEARBY_REQUEST_KEY);
    return requested;
  } catch {
    return false;
  }
}
