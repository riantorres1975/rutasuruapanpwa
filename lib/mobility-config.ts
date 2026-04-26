export const APP_BRAND = {
  name: "VoyUruapan",
  tagline: "Encuentra tu ruta en Uruapan",
  description: "Rutas de camiones, combis suburbanas y Teleférico en un solo mapa."
} as const;

export const FARES_2026 = {
  urbanBus: {
    label: "Camión urbano",
    price: "$11.00",
    payment: "La mayoría de las rutas urbanas se pagan en efectivo."
  },
  teleferico: {
    label: "Teleférico Uruapan",
    price: "$11.00",
    payment: "Solo acepta tarjeta electrónica de movilidad. No acepta efectivo."
  },
  mobilityCard: {
    label: "Tarjeta de movilidad",
    price: "$19.00",
    payment: "Tarjeta requerida para validar el acceso al Teleférico."
  }
} as const;

export const TELEFERICO_URUAPAN = {
  name: "Teleférico Uruapan",
  schemaName: "Teleférico Uruapan",
  color: "#00D4AA",
  hours: "05:00 a 23:00",
  fare: "$11.00 MXN",  // mantener MXN aquí — se usa en texto narrativo
  payment: "Solo tarjeta electrónica de movilidad",
  frequency: "Cada 5 minutos",
  tripDuration: "~8 minutos de extremo a extremo",
  stations: [
    "Hospital Regional",
    "Libramiento Aeropuerto",
    "Boulevard Industrial / Plaza Agora",
    "Presidencia",
    "Centro Historico",
    "Mercado Poniente"
  ],
  coordinates: [
    [-102.02093, 19.396299],
    [-102.025606, 19.4146744],
    [-102.0375379, 19.4216787],
    [-102.0477917, 19.4211717],
    [-102.0585911, 19.419822],
    [-102.0769769, 19.4306165]
  ]
} as const;

export const LANDING_SEARCH_SUGGESTIONS = [
  "Centro Historico",
  "Mercado Poniente",
  "Hospital Regional",
  "Presidencia",
  "Parque Nacional",
  "Plaza Agora",
  "IMSS",
  "Ruta 11 Uruapan"
] as const;

export const SUBURBAN_CONNECTIONS = [
  "Nuevo San Juan Parangaricutiro",
  "Capacuaro",
  "Paracho",
  "Angahuan"
] as const;

export const SEO_KEYWORDS = [
  "rutas de camiones Uruapan",
  "Teleférico Uruapan horario",
  "precio teleférico Uruapan 2026",
  "cómo llegar al Parque Nacional en camión",
  "ruta 11 Uruapan"
] as const;

export const LANDING_FAQS = [
  {
    question: "¿Cuál es el horario del teleférico en Uruapan?",
    answer: "El Teleférico de Uruapan opera todos los días de 05:00 a.m. a 11:00 p.m."
  },
  {
    question: "¿Cuánto cuesta el teleférico en Uruapan?",
    answer: "El viaje en el Teleférico de Uruapan cuesta $11.00 MXN y se paga con tarjeta electrónica de movilidad."
  },
  {
    question: "¿Cuánto cuesta el camión urbano en Uruapan?",
    answer: "El pasaje de camión urbano en Uruapan cuesta $11.00 MXN. La mayoría de las rutas urbanas se pagan en efectivo."
  },
  {
    question: "¿Se puede pagar en efectivo en el teleférico?",
    answer: "No. El Teleférico de Uruapan solo acepta tarjeta electrónica de movilidad para validar el acceso."
  },
  {
    question: "¿Cómo llegar al Parque Nacional en camión?",
    answer: "VoyUruapan permite marcar origen y destino en el mapa para encontrar rutas urbanas cercanas hacia zonas como el Parque Nacional."
  },
  {
    question: "¿La app funciona sin internet?",
    answer: "VoyUruapan es una PWA ligera con soporte offline para cargar la aplicación y datos guardados; el mapa puede requerir conexión para mostrar tiles actualizados."
  },
  {
    question: "¿Dónde están las estaciones del Teleférico de Uruapan?",
    answer: "Las estaciones configuradas son Hospital Regional, Libramiento Aeropuerto, Boulevard Industrial / Plaza Ágora, Presidencia, Centro Histórico y Mercado Poniente."
  },
  {
    question: "¿Puedo combinar camión y Teleférico en Uruapan?",
    answer: "Sí. VoyUruapan muestra rutas urbanas y el Teleférico en el mismo mapa para comparar trayectos, revisar transbordos posibles y calcular caminatas cortas entre puntos cercanos."
  },
  {
    question: "¿Cómo encuentro rutas cercanas a mi ubicación?",
    answer: "Abre el mapa y usa el botón de ubicación. El navegador pedirá permiso y VoyUruapan usará tu posición en el dispositivo para detectar rutas cercanas sin guardarla en servidores propios."
  },
  {
    question: "¿Qué hago si no aparece mi destino?",
    answer: "Prueba con nombres comunes de colonias, hospitales, mercados, escuelas o puntos conocidos. También puedes marcar manualmente el destino en el mapa para calcular rutas cercanas."
  }
] as const;
