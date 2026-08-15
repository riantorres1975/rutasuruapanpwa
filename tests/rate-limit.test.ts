import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetMemoryRateLimitsForTests } from "@/lib/rate-limit";

describe("fallback de rate limiting en memoria", () => {
  beforeEach(() => {
    resetMemoryRateLimitsForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.useRealTimers();
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
});
