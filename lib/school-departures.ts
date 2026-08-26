export type SchoolDepartureStatus = "community-report";

export type SchoolDeparture = {
  id: string;
  origin: string;
  destination: string;
  departures: readonly string[];
  direction: "outbound-only";
  status: SchoolDepartureStatus;
  note?: string;
  regularRoute?: {
    name: string;
    slug: string;
  };
};

export type SchoolDepartureGroup = {
  id: "cetis-tec" | "politecnico";
  title: string;
  description: string;
  departures: readonly SchoolDeparture[];
};

const CETIS_TEC_DEPARTURES: readonly SchoolDeparture[] = [
  {
    id: "patria-cetis",
    origin: "Infonavit Patria",
    destination: "CETIS 27",
    departures: ["06:00", "12:00"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "quirindavara-cetis",
    origin: "Quirindavara",
    destination: "CETIS 27",
    departures: ["05:50", "12:00"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "mora-cetis",
    origin: "La Mora",
    destination: "CETIS 27",
    departures: ["06:00"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "clinica-81-cetis",
    origin: "Clínica 81",
    destination: "CETIS 27",
    departures: ["06:05", "12:00"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "rio-volga-cetis",
    origin: "Río Volga",
    destination: "CETIS 27",
    departures: ["06:00"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "taximacuaro-cetis-politecnico",
    origin: "Taximácuaro",
    destination: "CETIS 27 · continúa a Politécnico",
    departures: ["06:30", "12:30"],
    direction: "outbound-only",
    status: "community-report",
    note: "Referencia reportada: parada en Teleférico Parque Nacional.",
  },
  {
    id: "zapata-tiamba",
    origin: "Zapata",
    destination: "Tiamba · pasa por CETIS y Tec",
    departures: ["06:10", "07:00"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "rincon-manantial-cetis",
    origin: "Rincón del Manantial",
    destination: "CETIS 27",
    departures: ["06:15", "12:00"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "laguna-ahogado-cetis",
    origin: "Laguna del Ahogado",
    destination: "CETIS 27",
    departures: ["06:00"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "ruta-26-cetis-tec",
    origin: "Recorrido habitual de Ruta 26",
    destination: "CETIS 27 · Tec Uruapan",
    departures: ["06:00"],
    direction: "outbound-only",
    status: "community-report",
    note: "Referencia histórica compartida por un usuario; confirma si la extensión sigue vigente.",
    regularRoute: {
      name: "Ruta 26",
      slug: "ruta-26-constituyentes-unidad",
    },
  },
];

const POLITECNICO_DEPARTURES: readonly SchoolDeparture[] = [
  {
    id: "zumpimito-politecnico",
    origin: "Zumpimito",
    destination: "Universidad Politécnica (UPU)",
    departures: ["05:50"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "quirindavara-politecnico",
    origin: "Quirindavara",
    destination: "Universidad Politécnica (UPU)",
    departures: ["05:50"],
    direction: "outbound-only",
    status: "community-report",
  },
  {
    id: "vinedos-politecnico",
    origin: "Viñedos",
    destination: "CETIS 27 · continúa a Politécnico",
    departures: ["06:00", "12:00"],
    direction: "outbound-only",
    status: "community-report",
    note: "Referencia reportada: parada en Monumento.",
  },
];

export const SCHOOL_DEPARTURE_GROUPS: readonly SchoolDepartureGroup[] = [
  {
    id: "cetis-tec",
    title: "CETIS 27 y Tec Uruapan",
    description: "Extensiones reportadas desde colonias y recorridos urbanos hacia el corredor escolar de La Basilia.",
    departures: CETIS_TEC_DEPARTURES,
  },
  {
    id: "politecnico",
    title: "Universidad Politécnica",
    description: "Salidas reportadas que continúan hacia la UPU; el recorrido y el punto de ascenso pueden cambiar.",
    departures: POLITECNICO_DEPARTURES,
  },
];

export const SCHOOL_DEPARTURE_COUNT = SCHOOL_DEPARTURE_GROUPS.reduce(
  (total, group) => total + group.departures.length,
  0,
);

export function formatSchoolDepartureTime(time: string): string {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}
