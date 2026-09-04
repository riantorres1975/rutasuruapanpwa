export type RouteVerificationInput = {
  routeId: number;
  expectedVersion: number;
  note: string;
};

export type RouteVerificationActionState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_ROUTE_VERIFICATION_STATE: RouteVerificationActionState = {
  status: "idle",
  message: "",
};

function normalizedNote(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length >= 10 && normalized.length <= 1_000 ? normalized : null;
}

export function parseRouteVerificationForm(formData: FormData): RouteVerificationInput | null {
  const routeId = Number(formData.get("routeId"));
  const expectedVersion = Number(formData.get("expectedVersion"));
  const note = normalizedNote(formData.get("note"));

  if (
    !Number.isSafeInteger(routeId)
    || routeId <= 0
    || !Number.isSafeInteger(expectedVersion)
    || expectedVersion <= 0
    || !note
  ) return null;

  return { routeId, expectedVersion, note };
}
