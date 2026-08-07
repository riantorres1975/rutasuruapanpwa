import { describe, expect, it } from "vitest";
import {
  getTransferSelectionKey,
  resolveTransferSelection,
  type TransferSelection,
} from "@/lib/transfer-selection";
import type { TransferOption } from "@/lib/transfers";

function transfer(routeAId: number, routeBId: number, offset = 0): TransferOption {
  return {
    routeAId,
    routeBId,
    routeAName: `Ruta ${routeAId}`,
    routeBName: `Ruta ${routeBId}`,
    routeAStartIndex: offset,
    routeATransferIndex: offset + 1,
    routeBTransferIndex: offset + 2,
    routeBEndIndex: offset + 3,
    transferPoint: [0, 0],
    segmentA: [[0, 0], [1, 1]],
    segmentB: [[1, 1], [2, 2]],
    walkMeters: 20,
    score: 100,
  };
}

describe("transfer selection", () => {
  const selected = transfer(25, 14);
  const selection: TransferSelection = { calculationKey: "old", transfer: selected };

  it("conserva el trazo visible mientras se recalcula", () => {
    expect(resolveTransferSelection(selection, "new", false, [])).toBe(selected);
  });

  it("actualiza el trazo si el mismo par sigue disponible", () => {
    const refreshed = transfer(25, 14, 5);
    expect(resolveTransferSelection(selection, "new", true, [refreshed])).toBe(refreshed);
  });

  it("lo descarta cuando el nuevo cálculo ya no ofrece ese par", () => {
    expect(resolveTransferSelection(selection, "new", true, [transfer(10, 20)])).toBeNull();
  });

  it("genera una clave estable para controlar el encuadre de cámara", () => {
    expect(getTransferSelectionKey(selected)).toBe("25:14:0:1:2:3");
  });
});
