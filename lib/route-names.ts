const ALIASES: Record<string, string[]> = {
  "Ruta 6":  ["pemex", "taximacuaro"],
  "Ruta 7":  ["pemex", "centro"],
  "Ruta 9":  ["arroyo", "colorado"],
  "Ruta 11": ["central", "camionera", "central camionera"],
  "Ruta 15": ["patria", "deportiva", "unidad deportiva"],
  "Ruta 19": ["quirindavara", "taximacuaro"],
  "Ruta 20": ["cuba", "mexico"],
  "Ruta 26": ["constituyentes", "unidad"],
  "Ruta 31": ["jaramillo", "cecati"],
  "Ruta 45": ["interClinicas", "clinicas", "IMSS"],
  "Ruta 66": ["plan de ayala", "eti"],
  "Ruta 176": ["quinta", "clinica 76"],
};

const DESTINATIONS: Record<string, string> = {
  "Ruta 1": "PALITO VERDE ↔ Unidad",
  "Ruta 1A": "San José de la Mina ↔ Palito Verde",
  "Ruta 2": "Constituyentes ↔ Jicalán",
  "Ruta 2A": "Constituyentes ↔ Zumpimito",
  "Ruta 3": "Zapata",
  "Ruta 4": "Zapata",
  "Ruta 5": "Caltzontzin",
  "Ruta 6": "Pemex ↔ Taximacuaro",
  "Ruta 7": "Pemex ↔ Centro",
  "Ruta 8": "Río Volga",
  "Ruta 9": "Arroyo Colorado",
  "Ruta 10": "Charanda",
  "Ruta 11": "Central Camionera",
  "Ruta 12": "12 de Diciembre",
  "Ruta 13": "Fovissste",
  "Ruta 14": "Llanitos",
  "Ruta 15": "Inf. Patria ↔ Unidad Deportiva",
  "Ruta 15A": "Inf. Patria ↔ Cuauhtémoc",
  "Ruta 17": "Purhépechas",
  "Ruta 18": "18 de Marzo",
  "Ruta 19": "Quirindavara ↔ Taximacuaro",
  "Ruta 20": "Cuba ↔ México",
  "Ruta 21": "Lindavista",
  "Ruta 22": "Cuauhtémoc",
  "Ruta 24": "Jucutacato",
  "Ruta 25": "Antorcha",
  "Ruta 26": "Constituyentes ↔ Unidad",
  "Ruta 27": "Balcones",
  "Ruta 28": "Mapeco",
  "Ruta 31": "Jaramillo ↔ Cecati",
  "Ruta 33": "Toreo",
  "Ruta 35": "La Mora",
  "Ruta 40": "Jucutacato",
  "Ruta 45": "Interclínicas",
  "Ruta 50": "Balcones",
  "Ruta 66": "Plan de Ayala ↔ Eti 30",
  "Ruta 76": "Constituyentes",
  "Ruta 85": "Toreo",
  "Ruta 102": "EST 102",
  "Ruta 176": "Quinta ↔ Clínica 76"
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const LOOKUP = new Map<string, string>(
  Object.entries(DESTINATIONS).map(([key, value]) => [normalize(key), value])
);

export function getRouteDestination(routeName: string): string | null {
  return LOOKUP.get(normalize(routeName)) ?? null;
}

export function getRouteSearchTerms(routeName: string): string[] {
  const destino = getRouteDestination(routeName);
  const terms: string[] = [];

  if (destino) {
    // Split "A ↔ B" into individual searchable terms
    terms.push(...destino.split(/\s*↔\s*/).map((t) => t.trim()).filter(Boolean));
  }

  const aliases = ALIASES[routeName] ?? [];
  terms.push(...aliases);

  return terms;
}

export function formatRouteLabel(routeName: string, baseName?: string): string {
  const base = (baseName ?? routeName).trim();
  const destino = getRouteDestination(base);
  if (!destino) return routeName;
  const directionMatch = routeName.match(/\((ida|vuelta)\)\s*$/i);
  const directionSuffix = directionMatch ? ` (${directionMatch[1].toLowerCase()})` : "";
  return `${destino} · ${base}${directionSuffix}`;
}
