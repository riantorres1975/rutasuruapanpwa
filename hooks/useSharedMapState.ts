"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  buildMapShareUrl,
  parseInitialMapUrl,
  type MapShareOptions,
  type SharedMapState,
} from "@/lib/shared-map-state";
import type { RouteDirection } from "@/lib/types";

export function useSharedMapState(initialSearch: string) {
  const initialUrlState = useMemo(() => parseInitialMapUrl(initialSearch), [initialSearch]);
  const [selectedDirection, setSelectedDirection] = useState<RouteDirection>(
    initialUrlState.sharedState?.direction ?? "ida",
  );
  const pendingSharedStateRef = useRef<SharedMapState | null>(initialUrlState.sharedState);
  const buildShareUrl = useCallback(
    (options: MapShareOptions) => buildMapShareUrl(window.location.origin, selectedDirection, options),
    [selectedDirection],
  );

  return {
    buildShareUrl,
    initialUrlState,
    pendingSharedStateRef,
    selectedDirection,
    setSelectedDirection,
  };
}
