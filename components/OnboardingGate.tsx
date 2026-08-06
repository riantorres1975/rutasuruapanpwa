"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

const OnboardingOverlay = dynamic(() => import("@/components/OnboardingOverlay"), {
  ssr: false,
});

const subscribeStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const shouldShowOnboarding = () => {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "1";
  } catch {
    return false;
  }
};

export default function OnboardingGate() {
  const shouldShow = useSyncExternalStore(subscribeStorage, shouldShowOnboarding, () => false);
  return shouldShow ? <OnboardingOverlay /> : null;
}
