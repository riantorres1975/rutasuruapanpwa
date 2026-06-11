// Knowledge base curada a mano para el asistente de UruGo (prompt de DeepSeek).
//
// IMPORTANTE: aquí solo viven los ALIAS (nombres de colonias y referencias
// locales por ruta), que no se pueden derivar de los datos GPS. Todo lo
// geográfico (qué ruta pasa por dónde, distancias) y los horarios se calculan
// del trazo real en lib/chat-grounding.ts y lib/schedules.ts — NO agregar
// recorridos ni coordenadas a mano aquí: así nació el bug de "la Ruta 2 pasa
// por el centro" (paradas inventadas con coordenadas equivocadas).

export const CHAT_ALIASES: Record<string, string[]> = {
  "Ruta 1":   ["hospital", "hospital regional", "IMSS bienestar", "mercado municipal", "palito verde"],
  "Ruta 1A":  ["hospital", "hospital regional", "IMSS bienestar", "palito verde", "san jose"],
  "Ruta 2":   ["constituyentes", "jicalán", "san joaquín", "zorrillos", "sol naciente"],
  "Ruta 2A":  ["constituyentes", "zumpimito", "soriana", "soriana la piñera", "la piñera"],
  "Ruta 5":   ["caltzontzin", "central camionera", "boulevard industrial", "empacadoras", "plaza ágora", "ágora"],
  "Ruta 7":   ["pemex", "colonia pemex", "taximácuaro"],
  "Ruta 11":  ["central", "camionera", "central camionera", "presidencia", "presidencia municipal", "héroes", "estudiantes"],
  "Ruta 20":  ["cuba", "mexico", "méxico", "circunvalación", "morelos", "topilejo"],
  "Ruta 25":  ["centro", "centro histórico", "antorcha", "primer cuadro", "zócalo", "sol naciente", "parque nacional", "parque"],
  "Ruta 26":  ["centro", "centro histórico", "constituyentes", "unidad", "primer cuadro", "sol naciente", "central", "central camionera", "camionera", "don vasco", "universidad don vasco"],
  "Ruta 27":  ["balcones", "tec", "tecnológico", "Tec Uruapan"],
  "Ruta 31":  ["jaramillo", "cecati", "capacitación"],
  "Ruta 45":  ["interclínicas", "clínicas", "clinicas", "hospitales", "zona médica", "IMSS"],
  "Ruta 66":  ["plan de ayala", "eti", "ETI 30", "secundaria técnica", "estudiantes"],
  "Ruta 76":  ["centro", "centro histórico", "constituyentes", "primer cuadro", "zócalo", "sol naciente"],
  "Ruta 102": ["EST 102", "escuela secundaria", "secundaria técnica"],
  "Ruta 176": ["clínica 76", "IMSS", "brisas", "Las Brisas", "quinta"],
};
