const SAFE_FALLBACK =
  "No pude verificar esa respuesta. Consulta el mapa de UruGo marcando tu origen y destino.";

const TRANSPORT_TERMS = [
  "ruta",
  "camion",
  "teleferico",
  "transporte",
  "uruapan",
  "mapa",
  "parada",
  "origen",
  "destino",
  "transbordo",
  "horario",
  "tarifa",
  "costo",
  "estacion",
  "colonia",
  "calle",
  "centro",
  "hospital",
  "mercado",
  "no puedo ayudar",
] as const;

const INTERNAL_CONTENT_PATTERNS = [
  /system prompt/i,
  /instrucciones internas/i,
  /api[_ -]?key/i,
  /deepseek_api_key/i,
  /##\s*reglas estrictas/i,
  /eres el asistente de urugo/i,
] as const;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getKnownRouteCodes(routeNames: string[]): Set<string> {
  const result = new Set<string>();
  for (const name of routeNames) {
    for (const match of name.matchAll(/\bruta\s+(\d{1,3}[a-z]?)/giu)) {
      result.add(match[1].toLowerCase());
    }
  }
  return result;
}

export function guardModelReply(rawReply: unknown, routeNames: string[]): string {
  if (typeof rawReply !== "string") return SAFE_FALLBACK;

  const reply = rawReply
    .slice(0, 2_000)
    .replace(/\s*⚠️ Beta[^🚩]*🚩\.?/g, "")
    .trim();
  if (!reply) return SAFE_FALLBACK;
  if (/https?:\/\/|www\.|(?:javascript|data):/i.test(reply)) return SAFE_FALLBACK;
  if (INTERNAL_CONTENT_PATTERNS.some((pattern) => pattern.test(reply))) return SAFE_FALLBACK;

  const normalizedReply = normalize(reply);
  if (!TRANSPORT_TERMS.some((term) => normalizedReply.includes(term))) return SAFE_FALLBACK;

  const knownRouteCodes = getKnownRouteCodes(routeNames);
  for (const match of reply.matchAll(/\bruta\s+(\d{1,3}[a-z]?)/giu)) {
    if (!knownRouteCodes.has(match[1].toLowerCase())) return SAFE_FALLBACK;
  }

  return reply;
}

export { SAFE_FALLBACK as SAFE_CHAT_FALLBACK };
