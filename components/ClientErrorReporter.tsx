"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error-report";

export default function ClientErrorReporter() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportClientError(event.error ?? event.message, "window-error", "window");
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason, "unhandled-rejection", "window");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
