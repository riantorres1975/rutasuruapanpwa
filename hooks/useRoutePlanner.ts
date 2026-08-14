"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { geocodePlace } from "@/lib/geocode";
import type { InitialMapUrlState } from "@/lib/shared-map-state";
import type { Coordinates } from "@/lib/types";
import { useUruapanGeolocation } from "@/hooks/useUruapanGeolocation";

export type ActivePoint = "origin" | "destination" | null;
export type FlowStep = 1 | 2 | 3;

function getFlowStep(origin: Coordinates | null, destination: Coordinates | null): FlowStep {
  if (!origin) return 1;
  if (!destination) return 2;
  return 3;
}

export function useRoutePlanner({
  initialUrlState,
  tripSessionActive,
}: {
  initialUrlState: InitialMapUrlState;
  tripSessionActive: boolean;
}) {
  const [manualOrigin, setManualOrigin] = useState<Coordinates | null>(
    initialUrlState.sharedState?.origin ?? null,
  );
  const [destinationPoint, setDestinationPoint] = useState<Coordinates | null>(
    initialUrlState.sharedState?.destination ?? null,
  );
  const [requestedActivePoint, setActivePoint] = useState<ActivePoint>(
    initialUrlState.sharedState?.origin && initialUrlState.sharedState.destination
      ? null
      : initialUrlState.sharedState?.origin
        ? "destination"
        : null,
  );
  const [hintVisibility, setHintVisibility] = useState<{ step: FlowStep; visible: boolean }>({
    step: initialUrlState.sharedState?.origin && initialUrlState.sharedState.destination
      ? 3
      : initialUrlState.sharedState?.origin
        ? 2
        : 1,
    visible: !(initialUrlState.sharedState?.origin && initialUrlState.sharedState.destination),
  });
  const [sharedRouteSegment, setSharedRouteSegment] = useState<Coordinates[] | null>(null);
  const [sharedSegmentColor, setSharedSegmentColor] = useState<string | null>(null);
  const [requestedDestination, setRequestedDestination] = useState<string | null>(
    initialUrlState.destinationParam,
  );
  const geolocation = useUruapanGeolocation(manualOrigin !== null && !tripSessionActive);
  const originPoint = manualOrigin ?? geolocation.userLocation;
  const flowStep = getFlowStep(originPoint, destinationPoint);
  const activePoint: ActivePoint = requestedActivePoint === "origin"
    ? "origin"
    : flowStep === 1
      ? "origin"
      : flowStep === 2
        ? "destination"
        : requestedActivePoint;
  const showHint = hintVisibility.step === flowStep ? hintVisibility.visible : true;
  const activePointRef = useRef(activePoint);
  const originPointRef = useRef(originPoint);
  const destinationPointRef = useRef(destinationPoint);

  const setShowHint = useCallback((visible: boolean) => {
    setHintVisibility({ step: flowStep, visible });
  }, [flowStep]);

  useEffect(() => {
    activePointRef.current = activePoint;
  }, [activePoint]);

  useEffect(() => {
    originPointRef.current = originPoint;
  }, [originPoint]);

  useEffect(() => {
    destinationPointRef.current = destinationPoint;
  }, [destinationPoint]);

  useEffect(() => {
    const destinationParam = initialUrlState.destinationParam;
    if (!destinationParam || initialUrlState.sharedState?.destination) return;

    const controller = new AbortController();
    geocodePlace(destinationParam, { signal: controller.signal })
      .then((result) => {
        if (!result) return;
        setDestinationPoint((current) => current ?? result.center);
        setRequestedDestination(result.label);
      })
      .catch(() => {
        // The user can still choose the destination manually.
      });
    return () => controller.abort();
  }, [initialUrlState.destinationParam, initialUrlState.sharedState?.destination]);

  return {
    ...geolocation,
    activePoint,
    activePointRef,
    destinationPoint,
    destinationPointRef,
    flowStep,
    manualOrigin,
    originPoint,
    originPointRef,
    requestedDestination,
    setActivePoint,
    setDestinationPoint,
    setManualOrigin,
    setRequestedDestination,
    setSharedRouteSegment,
    setSharedSegmentColor,
    setShowHint,
    sharedRouteSegment,
    sharedSegmentColor,
    showHint,
  };
}
