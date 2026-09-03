import { describe, expect, it } from "vitest";
import { formatContributorHistory } from "@/lib/community-reputation";

describe("historial comunitario para moderación", () => {
  it("resume resultados con singular y plural legibles", () => {
    expect(formatContributorHistory({
      accepted: 1,
      rejected: 2,
      pending: 0,
      lastContributionAt: null,
    })).toBe("1 aceptado · 2 descartados · 0 pendientes");
  });
});
