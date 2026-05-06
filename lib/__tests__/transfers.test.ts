import { computeTransferOptionsFromPolylines } from "../transfers";
import type { PolylineRoute } from "../routeMatcher";

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

const routeA: PolylineRoute = {
  id: 1,
  name: "Ruta A",
  color: "#64D2FF",
  corridor_width_m: 550,
  direccion: "ida",
  path: [
    [0, 0],
    [0.035, 0],
    [0.035, 0.025],
  ],
};

const routeB: PolylineRoute = {
  id: 2,
  name: "Ruta B",
  color: "#FF6464",
  corridor_width_m: 550,
  direccion: "ida",
  path: [
    [0.035, 0.025],
    [0.045, 0.025],
    [0.03, 0.01],
  ],
};

console.log("\ncomputeTransferOptionsFromPolylines:");

{
  const origin: [number, number] = [0, 0];
  const destination: [number, number] = [0.03, 0.01];
  const options = computeTransferOptionsFromPolylines([routeA, routeB], origin, destination);

  assert(options.length === 1, "urban detour under 3.5x direct distance is accepted");
  if (options.length === 1) {
    assert(options[0].routeAName === "Ruta A", "route A is first leg");
    assert(options[0].routeBName === "Ruta B", "route B is second leg");
    assert(options[0].walkMeters < 1, "transfer happens at shared point");
  }
}

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
