import type { NextRequest } from "next/server";

/**
 * Rate limiting compartido.
 *
 * En producción, si están configuradas las variables de Upstash Redis
 * (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN), el contador es
 * **durable y global** entre todas las instancias serverless.
 *
 * Si no hay Upstash configurado (p. ej. en local), cae a un contador
 * en memoria por proceso — el mismo comportamiento que antes.
 *
 * No requiere dependencias npm: usa el REST API de Upstash vía fetch.
 */

const memory = new Map<string, { count: number; resetAt: number }>();
const MAX_MEMORY_ENTRIES = 5_000;

function makeRoomInMemory(now: number): void {
  for (const [key, value] of memory.entries()) {
    if (now > value.resetAt) memory.delete(key);
  }

  while (memory.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memory.keys().next().value;
    if (typeof oldestKey !== "string") break;
    memory.delete(oldestKey);
  }
}

function memoryLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    if (!entry) makeRoomInMemory(now);
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    memory.delete(key);
    memory.set(key, entry);
    return false;
  }
  entry.count++;
  memory.delete(key);
  memory.set(key, entry);
  return true;
}

async function upstashLimit(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  // Pipeline atómico: INCR + (PEXPIRE solo si la clave es nueva, opción NX).
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, windowMs, "NX"],
    ]),
    // No cachear nunca una respuesta de rate limit.
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Upstash ${res.status}`);

  const data = (await res.json()) as Array<{ result?: number; error?: string }>;
  const count = data?.[0]?.result;
  if (typeof count !== "number") throw new Error("Upstash: respuesta inesperada");
  return count <= limit;
}

/**
 * Devuelve `true` si la petición está permitida, `false` si excede el límite.
 * Ante cualquier fallo de la red/Upstash, cae al limitador en memoria
 * (fail-open hacia el comportamiento local, no hacia "permitir todo").
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return await upstashLimit(url, token, key, limit, windowMs);
    } catch (err) {
      console.error("[rate-limit] Upstash falló, usando memoria:", err);
    }
  }

  return memoryLimit(key, limit, windowMs);
}

/**
 * Extrae la IP del cliente de cabeceras de proxy de confianza, con validación
 * de formato para evitar que un valor arbitrario contamine la clave de rate limit.
 */
export function getClientIp(req: NextRequest | Request): string {
  const get = (name: string) => req.headers.get(name);
  const candidates = [
    get("x-forwarded-for")?.split(",")[0],
    get("x-real-ip"),
    get("cf-connecting-ip"),
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (value && value.length <= 64 && /^[a-zA-Z0-9:.%-]+$/.test(value)) {
      return value;
    }
  }

  return "unknown";
}
