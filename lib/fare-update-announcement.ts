export type TimedAnnouncement = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export const FARE_UPDATE_ANNOUNCEMENT = {
  id: "fare-update-2026-08",
  startsAt: "2026-08-13T00:00:00-06:00",
  endsAt: "2026-09-14T00:00:00-06:00",
} as const satisfies TimedAnnouncement;

export function isAnnouncementActive(
  announcement: TimedAnnouncement,
  now: Date = new Date(),
): boolean {
  const currentTime = now.getTime();
  return (
    currentTime >= Date.parse(announcement.startsAt) &&
    currentTime < Date.parse(announcement.endsAt)
  );
}

export function getAnnouncementDismissalKey(id: string): string {
  return `urugo:announcement:dismissed:${id}`;
}
