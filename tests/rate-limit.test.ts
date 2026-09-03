import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetMemoryRateLimitsForTests } from "@/lib/rate-limit";

describe("fallback de rate limiting en memoria", () => {
  beforeEach(() => {
    resetMemoryRateLimitsForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RATE_LIMIT_HASH_SECRET;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RATE_LIMIT_HASH_SECRET;
  });

  it("respeta el límite y permite otra ventana al expirar", async () => {
    vi.useFakeTimers();
    expect(await rateLimit("rate-test:window", 2, 1_000)).toBe(true);
    expect(await rateLimit("rate-test:window", 2, 1_000)).toBe(true);
    expect(await rateLimit("rate-test:window", 2, 1_000)).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(await rateLimit("rate-test:window", 2, 1_000)).toBe(true);
  });

  it("expulsa claves antiguas al alcanzar el tope de memoria", async () => {
    expect(await rateLimit("rate-test:oldest", 1, 60_000)).toBe(true);
    for (let index = 0; index < 5_000; index += 1) {
      expect(await rateLimit(`rate-test:${index}`, 1, 60_000)).toBe(true);
    }

    expect(await rateLimit("rate-test:oldest", 1, 60_000)).toBe(true);
  });

  it("anonimiza la clave antes de enviarla al almacenamiento compartido", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.RATE_LIMIT_HASH_SECRET = "test-secret-with-enough-entropy";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { result: 1 },
      { result: 1 },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await rateLimit("chat:203.0.113.42", 5, 60_000)).toBe(true);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = String(options.body);
    expect(body).not.toContain("203.0.113.42");
    expect(body).toMatch(/rate-limit:[0-9a-f]{64}/);
  });
});
