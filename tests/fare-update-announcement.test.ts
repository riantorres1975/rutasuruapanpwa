import { describe, expect, it } from "vitest";
import {
  FARE_UPDATE_ANNOUNCEMENT,
  getAnnouncementDismissalKey,
  isAnnouncementActive,
} from "@/lib/fare-update-announcement";

describe("fare update announcement", () => {
  it("is active during the configured month", () => {
    expect(
      isAnnouncementActive(
        FARE_UPDATE_ANNOUNCEMENT,
        new Date("2026-08-13T00:00:00-06:00"),
      ),
    ).toBe(true);
    expect(
      isAnnouncementActive(
        FARE_UPDATE_ANNOUNCEMENT,
        new Date("2026-09-13T23:59:59-06:00"),
      ),
    ).toBe(true);
  });

  it("is disabled before and after the campaign", () => {
    expect(
      isAnnouncementActive(
        FARE_UPDATE_ANNOUNCEMENT,
        new Date("2026-08-12T23:59:59-06:00"),
      ),
    ).toBe(false);
    expect(
      isAnnouncementActive(
        FARE_UPDATE_ANNOUNCEMENT,
        new Date("2026-09-14T00:00:00-06:00"),
      ),
    ).toBe(false);
  });

  it("uses a campaign-specific dismissal key", () => {
    expect(getAnnouncementDismissalKey(FARE_UPDATE_ANNOUNCEMENT.id)).toBe(
      "urugo:announcement:dismissed:fare-update-2026-08",
    );
  });
});
