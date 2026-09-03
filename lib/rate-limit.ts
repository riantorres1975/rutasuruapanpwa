import { createHash, createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Rate limiting compartido.
 *
 * En producción usa Upstash cuando está configurado y, en caso contrario,
 * Supabase. Ambos comparten el contador entre instancias serverless.
 *
 * Si no hay Upstash configurado (p. ej. en local), cae a un contador
 * en memoria por proceso — el mismo comportamiento que antes.
 *
 * Las claves persistentes son HMAC; nunca se envía ni almacena la IP en claro.
 */

const memory = new Map<string, { count: number; resetAt: number }>();
const MAX_MEMORY_ENTRIES = 5_000;

function hashRateLimitKey(key: string): string {
  const secret = process.env.RATE_LIMIT_HASH_SECRET?.trim()
    || process.env.REPORTER_HASH_SECRET?.trim()
    || getAdminSupabaseConfig()?.secretKey;
  return secret
    ? createHmac("sha256", secret).update(key).digest("hex")
    : createHash("sha256").update(key).digest("hex");
}

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

async function supabaseLimit(
  keyHash: string,
  limit: number,
  windowMs: number,
): Promise<boolean | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("consume_rate_limit_bucket", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_ms: windowMs,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "boolean") throw new Error("Supabase: respuesta inesperada");
  return data;
}

/**
 * Devuelve `true` si la petición está permitida, `false` si excede el límite.
 * Ante cualquier fallo de la red/Upstash, cae al limitador en memoria
 * (fail-open hacia el comportamiento local, no hacia "permitir todo").
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const keyHash = hashRateLimitKey(key);
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return await upstashLimit(url, token, `rate-limit:${keyHash}`, limit, windowMs);
    } catch (err) {
      console.error("[rate-limit] Upstash falló, probando Supabase:", err);
    }
  }

  if (process.env.NODE_ENV !== "test") {
    try {
      const allowed = await supabaseLimit(keyHash, limit, windowMs);
      if (allowed !== null) return allowed;
    } catch (err) {
      console.error("[rate-limit] Supabase falló, usando memoria:", err);
    }
  }

  return memoryLimit(keyHash, limit, windowMs);
}

export function resetMemoryRateLimitsForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("El reinicio del rate limit solo está disponible en tests");
  }
  memory.clear();
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
