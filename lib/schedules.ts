export type RouteSchedule = {
  /** "HH:MM" 24h */
  first: string;
  /** "HH:MM" 24h */
  last: string;
  /** Frecuencia mínima en minutos */
  freqMin: number;
  /** Frecuencia máxima en minutos */
  freqMax: number;
  /** true = circuito continuo sin tiempo fijo (Teleférico) */
  continuous?: boolean;
};

// Datos reales confirmados + estimaciones típicas para el resto
const SCHEDULES: Record<string, RouteSchedule> = {
  // ── Datos reales ─────────────────────────────────────────────────────────
  "Ruta 1":   { first: "05:30", last: "22:30", freqMin: 8,  freqMax: 12 },
  "Ruta 1A":  { first: "05:30", last: "22:30", freqMin: 8,  freqMax: 12 },
  "Ruta 2":   { first: "05:15", last: "20:45", freqMin: 10, freqMax: 15 },
  "Ruta 5":   { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 11":  { first: "06:00", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 20":  { first: "05:30", last: "22:30", freqMin: 12, freqMax: 15 },
  "Ruta 176": { first: "05:30", last: "23:30", freqMin: 10, freqMax: 12 },
  "Teleférico Uruapan": { first: "05:00", last: "23:00", freqMin: 0, freqMax: 0, continuous: true },

  // ── Estimaciones basadas en patrones típicos de Uruapan ──────────────────
  "Ruta 2A":  { first: "05:30", last: "21:00", freqMin: 12, freqMax: 18 },
  "Ruta 3":   { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 4":   { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 6":   { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 7":   { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 8":   { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 9":   { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 10":  { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 12":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 13":  { first: "06:00", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 14":  { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 15":  { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 15A": { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 17":  { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 18":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 19":  { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 21":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 22":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 24":  { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 25":  { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 26":  { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 27":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 28":  { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 31":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 33":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 35":  { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 40":  { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 45":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 50":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 66":  { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
  "Ruta 76":  { first: "05:30", last: "22:00", freqMin: 10, freqMax: 15 },
  "Ruta 85":  { first: "06:00", last: "21:30", freqMin: 12, freqMax: 18 },
  "Ruta 102": { first: "06:00", last: "21:00", freqMin: 15, freqMax: 20 },
};

function parseHHMM(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}

function toMinutes(hhmm: string): number {
  const { h, m } = parseHHMM(hhmm);
  return h * 60 + m;
}

export function getSchedule(routeName: string): RouteSchedule | null {
  // Strip direction suffix e.g. "Ruta 1 - San José (Ida)" → "Ruta 1"
  const base = routeName.replace(/\s*-\s*.+$/, "").trim();
  return SCHEDULES[base] ?? null;
}

export type ScheduleStatus =
  | { kind: "continuous"; first: string; last: string }
  | { kind: "operating"; nextMin: number; freqLabel: string; last: string }
  | { kind: "last-service"; minutesLeft: number; last: string }
  | { kind: "off"; first: string; last: string };

export function getScheduleStatus(schedule: RouteSchedule, now?: Date): ScheduleStatus {
  const date = now ?? new Date();
  const currentMin = date.getHours() * 60 + date.getMinutes();
  const firstMin = toMinutes(schedule.first);
  const lastMin = toMinutes(schedule.last);
  const avgFreq = Math.round((schedule.freqMin + schedule.freqMax) / 2);

  if (schedule.continuous) {
    return { kind: "continuous", first: schedule.first, last: schedule.last };
  }

  if (currentMin < firstMin || currentMin > lastMin) {
    return { kind: "off", first: schedule.first, last: schedule.last };
  }

  // Within last 20 min of service
  if (currentMin > lastMin - 20) {
    return { kind: "last-service", minutesLeft: lastMin - currentMin, last: schedule.last };
  }

  // Estimate next bus: minutes elapsed since first departure mod average frequency
  const elapsed = currentMin - firstMin;
  const nextMin = avgFreq - (elapsed % avgFreq);

  const freqLabel =
    schedule.freqMin === schedule.freqMax
      ? `cada ${schedule.freqMin} min`
      : `cada ${schedule.freqMin}–${schedule.freqMax} min`;

  return { kind: "operating", nextMin, freqLabel, last: schedule.last };
}
