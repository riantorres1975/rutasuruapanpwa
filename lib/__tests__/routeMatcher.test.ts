/**
 * Tests for lib/routeMatcher.ts
 * Run with:  npx tsx lib/__tests__/routeMatcher.test.ts
 *
 * Uses a synthetic L-shaped path so tests have no external dependencies.
 *
 * Path layout (simplified — not real Uruapan coords):
 *
 *   segment 0: [-102.080, 19.400] → [-102.070, 19.400]   (goes East)
 *   segment 1: [-102.070, 19.400] → [-102.070, 19.410]   (goes North)
 *   segment 2: [-102.070, 19.410] → [-102.060, 19.410]   (goes East)
 */

import {
  getDistancePointToSegmentM,
  getClosestPointOnPath,
  isRouteValid,
  findBestRoutes,
  getRouteLength,
  getRankedRoutes,
  type PolylineRoute,
} from "../routeMatcher";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function assertClose(actual: number, expected: number, tolerance: number, label: string) {
  assert(Math.abs(actual - expected) <= tolerance, `${label} (got ${actual.toFixed(1)}, expected ≈ ${expected})`);
}

// ─── Test data ────────────────────────────────────────────────────────────────

const L_PATH = [
  [-102.080, 19.400] as [number, number],
  [-102.070, 19.400] as [number, number],
  [-102.070, 19.410] as [number, number],
  [-102.060, 19.410] as [number, number],
];

const ROUTE_A: PolylineRoute = {
  id: 1,
  name: "Ruta Test A",
  color: "#64D2FF",
  corridor_width_m: 150,
  path: L_PATH,
  direccion: "ida",
};

// A second route going South — opposite direction (invalid for our test trip)
const ROUTE_B: PolylineRoute = {
  id: 2,
  name: "Ruta Test B",
  color: "#FF6464",
  corridor_width_m: 150,
  path: [...L_PATH].reverse(),
  direccion: "vuelta",
};

// A far-away route (downtown area, nowhere near our test points)
const ROUTE_C: PolylineRoute = {
  id: 3,
  name: "Ruta Test C",
  color: "#64FF64",
  corridor_width_m: 150,
  path: [
    [-102.055, 19.420],
    [-102.050, 19.425],
  ],
  direccion: "ida",
};

// ─── getDistancePointToSegmentM ───────────────────────────────────────────────

console.log("\ngetDistancePointToSegmentM:");

{
  // Point exactly on segment midpoint → distance should be ~0
  const mid: [number, number] = [-102.075, 19.400];
  const d = getDistancePointToSegmentM(mid, L_PATH[0], L_PATH[1]);
  assertClose(d, 0, 1, "midpoint of segment → ~0 m");
}

{
  // Point 100 m south of the first horizontal segment
  // 1° lat ≈ 111 000 m → 0.0009° ≈ 100 m
  const south: [number, number] = [-102.075, 19.399];
  const d = getDistancePointToSegmentM(south, L_PATH[0], L_PATH[1]);
  assertClose(d, 111, 15, "point ~100 m south of segment");
}

{
  // Point at the segment start (vertex) → distance should be ~0
  const d = getDistancePointToSegmentM(L_PATH[0], L_PATH[0], L_PATH[1]);
  assertClose(d, 0, 1, "point at segment vertex → ~0 m");
}

// ─── getClosestPointOnPath ────────────────────────────────────────────────────

console.log("\ngetClosestPointOnPath:");

{
  // Point near segment 0 (first horizontal leg)
  const near0: [number, number] = [-102.075, 19.400];
  const r = getClosestPointOnPath(near0, L_PATH);
  assert(r.segmentIndex === 0, "point near segment 0 → segmentIndex 0");
  assertClose(r.distM, 0, 1, "distance to segment 0 ≈ 0 m");
}

{
  // Point near segment 2 (second horizontal leg)
  const near2: [number, number] = [-102.065, 19.410];
  const r = getClosestPointOnPath(near2, L_PATH);
  assert(r.segmentIndex === 2, "point near segment 2 → segmentIndex 2");
  assertClose(r.distM, 0, 1, "distance to segment 2 ≈ 0 m");
}

// ─── isRouteValid ─────────────────────────────────────────────────────────────

console.log("\nisRouteValid:");

{
  // Valid: origin near seg 0, destination near seg 2 — forward direction
  const origin: [number, number]  = [-102.075, 19.4001];
  const dest:   [number, number]  = [-102.065, 19.4099];
  const result = isRouteValid(origin, dest, ROUTE_A);
  assert(result !== false, "valid trip (forward direction) → not false");
  if (result !== false) {
    assert(result.destSeg.segmentIndex > result.originSeg.segmentIndex, "destSeg > originSeg");
  }
}

{
  // Invalid: destination is BEFORE origin in path (backward direction)
  const origin: [number, number] = [-102.065, 19.4099];
  const dest:   [number, number] = [-102.075, 19.4001];
  const result = isRouteValid(origin, dest, ROUTE_A);
  assert(result === false, "backward trip → false");
}

{
  // Invalid: origin too far from any segment
  const farPoint: [number, number] = [-102.020, 19.450];
  const dest:     [number, number] = [-102.065, 19.4099];
  const result = isRouteValid(farPoint, dest, ROUTE_A);
  assert(result === false, "origin too far → false");
}

{
  // Invalid: destination too far from any segment
  const origin: [number, number]  = [-102.075, 19.4001];
  const farDest: [number, number] = [-102.020, 19.450];
  const result = isRouteValid(origin, farDest, ROUTE_A);
  assert(result === false, "destination too far → false");
}

// ─── findBestRoutes ───────────────────────────────────────────────────────────

console.log("\nfindBestRoutes:");

{
  // Only ROUTE_A is valid for this forward trip; ROUTE_B goes backward, ROUTE_C is far
  const origin: [number, number] = [-102.075, 19.4001];
  const dest:   [number, number] = [-102.065, 19.4099];
  const results = findBestRoutes(origin, dest, [ROUTE_A, ROUTE_B, ROUTE_C]);

  assert(results.length === 1, "only 1 valid route returned");
  assert(results[0].routeId === 1, "ROUTE_A (id=1) is the result");
  assert(results[0].direccion === "ida", "direccion = ida");
  assert(results[0].segment.length >= 2, "segment has ≥ 2 points");
}

{
  // Deduplication: same id in both directions — only best score survives
  const idA_ida: PolylineRoute   = { ...ROUTE_A, id: 99, direccion: "ida" };
  const idA_vuelta: PolylineRoute = { ...ROUTE_B, id: 99, path: L_PATH, direccion: "vuelta" };

  const origin: [number, number] = [-102.075, 19.4001];
  const dest:   [number, number] = [-102.065, 19.4099];
  const results = findBestRoutes(origin, dest, [idA_ida, idA_vuelta]);

  assert(results.length === 1, "deduplication: 2 same-id routes → 1 result");
}

{
  // No valid routes at all
  const far1: [number, number] = [-102.020, 19.450];
  const far2: [number, number] = [-102.010, 19.460];
  const results = findBestRoutes(far1, far2, [ROUTE_A, ROUTE_B, ROUTE_C]);
  assert(results.length === 0, "no valid routes → empty array");
}

// ─── getRouteLength ───────────────────────────────────────────────────────────

console.log("\ngetRouteLength:");

{
  // Single segment of the L_PATH first horizontal leg ≈ 1° lng at ~19.4°N ≈ 975 m
  const seg = [L_PATH[0], L_PATH[1]] as [number, number][];
  const len = getRouteLength(seg);
  assert(len > 900 && len < 1100, `first horizontal segment ≈ 975 m (got ${len.toFixed(0)} m)`);
}

{
  // Single point → length = 0
  const len = getRouteLength([L_PATH[0]]);
  assertClose(len, 0, 0.1, "single point → 0 m");
}

{
  // Full L path should be longer than any single segment
  const fullLen = getRouteLength(L_PATH);
  const seg0Len = getRouteLength([L_PATH[0], L_PATH[1]]);
  assert(fullLen > seg0Len, "full L path longer than segment 0");
}

// ─── score includes routeLengthM ──────────────────────────────────────────────

console.log("\nscore includes routeLengthM:");

{
  const origin: [number, number] = [-102.075, 19.4001];
  const dest:   [number, number] = [-102.065, 19.4099];
  const results = findBestRoutes(origin, dest, [ROUTE_A]);

  assert(results.length === 1, "one result for score check");
  if (results.length === 1) {
    const m = results[0];
    const expectedScore = m.originDistM + m.destDistM + m.routeLengthM * 0.01;
    assertClose(m.score, expectedScore, 0.01, "score = originDist + destDist + routeLength*0.01");
    assert(m.routeLengthM > 0, "routeLengthM > 0");
  }
}

// ─── getRankedRoutes ──────────────────────────────────────────────────────────

console.log("\ngetRankedRoutes:");

{
  // Empty input → null
  const result = getRankedRoutes([]);
  assert(result === null, "empty matches → null");
}

{
  // Single match → best set, alternatives empty
  const origin: [number, number] = [-102.075, 19.4001];
  const dest:   [number, number] = [-102.065, 19.4099];
  const matches = findBestRoutes(origin, dest, [ROUTE_A]);
  const ranked = getRankedRoutes(matches);

  assert(ranked !== null, "single match → not null");
  if (ranked) {
    assert(ranked.best.routeId === ROUTE_A.id, "best.routeId = ROUTE_A");
    assert(ranked.alternatives.length === 0, "no alternatives for single match");
  }
}

{
  // Two routes with different ids — both valid forward trips
  const ROUTE_D: PolylineRoute = {
    id: 4,
    name: "Ruta Test D",
    color: "#FFAA00",
    corridor_width_m: 200,
    path: L_PATH,
    direccion: "ida",
  };
  const origin: [number, number] = [-102.075, 19.4001];
  const dest:   [number, number] = [-102.065, 19.4099];
  const matches = findBestRoutes(origin, dest, [ROUTE_A, ROUTE_D]);
  const ranked = getRankedRoutes(matches);

  assert(ranked !== null, "two routes → ranked not null");
  if (ranked) {
    assert(ranked.alternatives.length === 1, "one alternative");
    assert(ranked.best.score <= ranked.alternatives[0].score, "best.score ≤ alternative.score");
  }
}

// ─── UI label correctness ─────────────────────────────────────────────────────

console.log("\nUI label logic (rankLabels):");

{
  const ROUTE_D: PolylineRoute = {
    id: 4,
    name: "Ruta Test D",
    color: "#FFAA00",
    corridor_width_m: 200,
    path: L_PATH,
    direccion: "ida",
  };
  const origin: [number, number] = [-102.075, 19.4001];
  const dest:   [number, number] = [-102.065, 19.4099];
  const matches = findBestRoutes(origin, dest, [ROUTE_A, ROUTE_D]);
  const ranked = getRankedRoutes(matches);

  if (ranked) {
    const bestId = ranked.best.routeId;
    const alternativeIds = new Set(ranked.alternatives.map((m) => m.routeId));

    assert(!alternativeIds.has(bestId), "best id not in alternatives set");
    assert(ranked.alternatives.every((m) => m.routeId !== bestId), "no alternative has bestId");

    const allSuggested = [ranked.best, ...ranked.alternatives];
    const firstIsBest = allSuggested[0].routeId === bestId;
    assert(firstIsBest, "first in combined list = best route");
  }
}

// ─── corridor dinámico (isRouteValid usa route.corridor_width_m) ───────────────

console.log("\ncorridor dinámico:");

{
  // Route with very narrow corridor (10 m) — point 111 m away should be rejected
  const narrowRoute: PolylineRoute = { ...ROUTE_A, corridor_width_m: 10 };
  const origin: [number, number] = [-102.075, 19.399]; // ~111 m south
  const dest:   [number, number] = [-102.065, 19.4099];
  const result = isRouteValid(origin, dest, narrowRoute);
  assert(result === false, "narrow corridor (10 m) rejects origin 111 m away");
}

{
  // Route with wide corridor (300 m) — same point should be accepted
  const wideRoute: PolylineRoute = { ...ROUTE_A, corridor_width_m: 300 };
  const origin: [number, number] = [-102.075, 19.399]; // ~111 m south
  const dest:   [number, number] = [-102.065, 19.4099];
  const result = isRouteValid(origin, dest, wideRoute);
  assert(result !== false, "wide corridor (300 m) accepts origin 111 m away");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\nsame-segment forward progress:");

{
  const origin: [number, number] = [-102.078, 19.4001];
  const dest:   [number, number] = [-102.072, 19.3999];
  const result = isRouteValid(origin, dest, ROUTE_A);
  assert(result !== false, "same-segment forward trip accepted");
  if (result !== false) {
    assert(result.originSeg.segmentIndex === result.destSeg.segmentIndex, "same segment accepted");
    assert(result.destSeg.progressM > result.originSeg.progressM, "destination progress is ahead");
  }
}

{
  const origin: [number, number] = [-102.072, 19.3999];
  const dest:   [number, number] = [-102.078, 19.4001];
  const result = isRouteValid(origin, dest, ROUTE_A);
  assert(result === false, "same-segment backward trip rejected");
}

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
