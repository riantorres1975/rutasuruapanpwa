import type { TransferOption } from "@/lib/transfers";

export type TransferSelection = {
  calculationKey: string;
  transfer: TransferOption;
};

export function getTransferSelectionKey(transfer: TransferOption): string {
  return [
    transfer.routeAId,
    transfer.routeBId,
    transfer.routeAStartIndex,
    transfer.routeATransferIndex,
    transfer.routeBTransferIndex,
    transfer.routeBEndIndex,
  ].join(":");
}

export function resolveTransferSelection(
  selection: TransferSelection | null,
  calculationKey: string | null,
  calculationReady: boolean,
  transfers: TransferOption[],
): TransferOption | null {
  if (!selection || !calculationKey) return null;
  if (selection.calculationKey === calculationKey || !calculationReady) {
    return selection.transfer;
  }

  return transfers.find(
    (transfer) =>
      transfer.routeAId === selection.transfer.routeAId &&
      transfer.routeBId === selection.transfer.routeBId,
  ) ?? null;
}
