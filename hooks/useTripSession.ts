"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import {
  createTripTrackingState,
  getTripJourneyKey,
  getTripMilestone,
  updateTripTrackingState,
  type TripJourney,
  type TripTrackingState,
} from "@/lib/trip-mode";
import type { Coordinates } from "@/lib/types";

export type TripSession = {
  key: string;
  cameraKey: string;
  journey: TripJourney;
};

export function useTripSession() {
  const [session, setSession] = useState<TripSession | null>(null);
  const [tracking, setTracking] = useState<TripTrackingState>(() => createTripTrackingState());
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [dropOffAlert, setDropOffAlert] = useState<string | null>(null);
  const milestonesRef = useRef(new Set<string>());

  const reset = useCallback(() => {
    setSession(null);
    setTracking(createTripTrackingState());
    setIsStopDialogOpen(false);
    setDropOffAlert(null);
    milestonesRef.current.clear();
  }, []);

  const start = useCallback((journey: TripJourney) => {
    const key = getTripJourneyKey(journey);
    milestonesRef.current.clear();
    setSession({ key, cameraKey: `${key}:${Date.now()}`, journey });
    setTracking(createTripTrackingState());
    setIsStopDialogOpen(false);
    setDropOffAlert(null);
    try {
      track("viaje_iniciado", { tipo: journey.kind });
    } catch {
      // Analytics is optional during a trip.
    }
  }, []);

  const completeStop = useCallback(() => {
    const journeyKind = session?.journey.kind;
    reset();
    try {
      track("viaje_finalizado", { tipo: journeyKind ?? "desconocido" });
    } catch {
      // Analytics is optional during a trip.
    }
  }, [reset, session]);

  const requestStop = useCallback(() => {
    if (tracking.progress?.phase === "arrived") {
      completeStop();
      return;
    }
    setIsStopDialogOpen(true);
  }, [completeStop, tracking.progress?.phase]);

  const cancelStop = useCallback(() => setIsStopDialogOpen(false), []);
  const dismissDropOffAlert = useCallback(() => setDropOffAlert(null), []);

  const updateLocation = useCallback((location: Coordinates) => {
    setTracking((current) => {
      if (!session) return current;
      return updateTripTrackingState(session.journey, location, current);
    });
  }, [session]);

  useEffect(() => {
    const progress = tracking.progress;
    if (!progress || !session) return;
    const milestone = getTripMilestone(progress);
    if (!milestone || milestonesRef.current.has(milestone)) return;

    milestonesRef.current.add(milestone);
    const distance = Math.round(progress.distanceToMilestoneM ?? 0);
    const transferStopLabel = session.journey.kind === "transfer"
      ? session.journey.transferArrivalStopLabel
      : null;
    const destinationStopLabel = session.journey.destinationStopLabel;
    const message = milestone === "transfer-near"
      ? transferStopLabel
        ? `Prepárate para bajar en la estación ${transferStopLabel} y transbordar: faltan aproximadamente ${distance} m.`
        : `Prepárate para transbordar: faltan aproximadamente ${distance} m.`
      : milestone === "destination-near"
        ? destinationStopLabel
          ? `Prepárate para bajar en la estación ${destinationStopLabel}: faltan aproximadamente ${distance} m.`
          : `Prepárate para bajar: faltan aproximadamente ${distance} m para tu parada.`
        : "Llegaste a tu destino.";
    try {
      navigator.vibrate?.(milestone === "arrived" ? [250, 120, 250] : [200, 100, 200]);
    } catch {
      // Vibration is not available on every device.
    }
    setDropOffAlert(message);
  }, [session, tracking.progress]);

  return {
    cancelStop,
    completeStop,
    dismissDropOffAlert,
    dropOffAlert,
    isStopDialogOpen,
    progress: tracking.progress,
    requestStop,
    reset,
    session,
    start,
    updateLocation,
  };
}
