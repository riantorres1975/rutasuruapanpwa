"use client";

import { useCallback, useEffect, useState } from "react";
import {
  haversineMeters,
  isAccurateEnoughForAutomaticOrigin,
  isWithinUruapanServiceArea,
} from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

export type GeoStatus = "idle" | "locating" | "ok" | "outside" | "inaccurate" | "error";

export function useUruapanGeolocation(disabled = false) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [liveLocation, setLiveLocation] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<GeoStatus>(disabled ? "idle" : "locating");
  const [accuracyWarning, setAccuracyWarning] = useState(false);

  const markOutside = useCallback(() => {
    setUserLocation(null);
    setLiveLocation(null);
    setAccuracyWarning(false);
    setStatus("outside");
  }, []);

  const clearAccuracyWarning = useCallback(() => setAccuracyWarning(false), []);

  useEffect(() => {
    if (disabled) return;
    if (!navigator.geolocation) {
      const timer = window.setTimeout(() => setStatus("error"), 0);
      return () => window.clearTimeout(timer);
    }

    const driftThresholdM = 50;
    let firstFix: Coordinates | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: Coordinates = [position.coords.longitude, position.coords.latitude];

        if (!isAccurateEnoughForAutomaticOrigin(position.coords.accuracy)) {
          setUserLocation(null);
          setLiveLocation(null);
          setAccuracyWarning(true);
          setStatus("inaccurate");
          return;
        }

        if (!isWithinUruapanServiceArea(coords)) {
          markOutside();
          return;
        }

        setLiveLocation(coords);
        if (!firstFix) {
          firstFix = coords;
          setUserLocation(coords);
          setStatus("ok");
          return;
        }

        if (haversineMeters(firstFix, coords) > driftThresholdM) {
          setAccuracyWarning(true);
          return;
        }

        firstFix = coords;
        setUserLocation(coords);
        setAccuracyWarning(false);
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [disabled, markOutside]);

  return {
    userLocation,
    liveLocation,
    status,
    accuracyWarning,
    markOutside,
    clearAccuracyWarning,
  };
}
