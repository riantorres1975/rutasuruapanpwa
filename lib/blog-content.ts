export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  keyword: string;
  updatedAt: string;
  snippet: string;
  sections: {
    heading: string;
    body: string;
  }[];
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "como-llegar-parque-nacional-uruapan-transporte-publico",
    title: "Cómo llegar al Parque Nacional de Uruapan en transporte público",
    description: "Guía para llegar al Parque Nacional de Uruapan en camión urbano o combinando rutas con el Teleférico.",
    keyword: "cómo llegar al Parque Nacional de Uruapan en camión",
    updatedAt: "2026-04-24",
    snippet:
      "Para llegar al Parque Nacional de Uruapan en transporte público, busca una ruta hacia Centro Histórico o Mercado Poniente y camina al acceso más cercano. También puedes revisar conexiones con el Teleférico desde el mapa de VoyUruapan.",
    sections: [
      {
        heading: "Ruta recomendada para visitantes",
        body: "Si vienes de una zona céntrica, marca tu origen y el Parque Nacional como destino en el mapa. La app mostrará rutas urbanas cercanas y alternativas si necesitas caminar algunos minutos."
      },
      {
        heading: "Opción con Teleférico",
        body: "El Teleférico conecta zonas como Centro Histórico y Mercado Poniente. Si tu origen queda cerca de una estación, puede ayudarte a acercarte al parque antes de caminar."
      },
      {
        heading: "Costo estimado",
        body: "La tarifa base configurada para camión urbano es de $11.00 MXN. Si combinas con Teleférico, considera otro abordaje y el uso de tarjeta electrónica de movilidad."
      }
    ]
  },
  {
    slug: "tarifa-camion-uruapan-2026",
    title: "Tarifa de camión urbano en Uruapan 2026: cuánto cuesta y cómo se paga",
    description: "Consulta la tarifa base del camión urbano en Uruapan, métodos de pago y recomendaciones para planear traslados.",
    keyword: "tarifa camión Uruapan 2026",
    updatedAt: "2026-04-24",
    snippet:
      "La tarifa base configurada para camión urbano en Uruapan es de $11.00 MXN. La mayoría de rutas urbanas se pagan en efectivo; para el Teleférico se requiere tarjeta electrónica de movilidad.",
    sections: [
      {
        heading: "Precio del camión urbano",
        body: "VoyUruapan usa una tarifa base de $11.00 MXN para rutas urbanas. Algunas condiciones operativas pueden variar, por lo que conviene confirmar cambios oficiales antes de viajar."
      },
      {
        heading: "Pago en efectivo y tarjeta",
        body: "El camión urbano se maneja principalmente en efectivo. El Teleférico se valida con tarjeta electrónica de movilidad, por lo que es importante distinguir el método de pago por modo de transporte."
      },
      {
        heading: "Cómo calcular un viaje combinado",
        body: "Si usas camión y Teleférico en el mismo trayecto, calcula cada abordaje por separado. El mapa ayuda a comparar si una ruta directa o un transbordo te conviene más."
      }
    ]
  },
  {
    slug: "estaciones-teleferico-uruapan",
    title: "Estaciones del Teleférico Uruapan y qué hay cerca",
    description: "Lista de estaciones del Teleférico de Uruapan, referencias cercanas y conexión con transporte urbano.",
    keyword: "estaciones teleférico Uruapan",
    updatedAt: "2026-04-24",
    snippet:
      "Las estaciones del Teleférico de Uruapan configuradas en VoyUruapan son Hospital Regional, Libramiento Aeropuerto, Boulevard Industrial / Plaza Ágora, Presidencia, Centro Histórico y Mercado Poniente.",
    sections: [
      {
        heading: "Lista de estaciones",
        body: "El sistema aparece configurado con seis estaciones principales. Cada estación puede funcionar como referencia para planear conexiones con rutas urbanas o caminatas cortas."
      },
      {
        heading: "Puntos de referencia útiles",
        body: "Usa nombres conocidos como Centro Histórico, Presidencia, Hospital Regional, Plaza Ágora o Mercado Poniente para orientar mejor tu búsqueda en el mapa."
      },
      {
        heading: "Conexión con camiones urbanos",
        body: "Marca origen y destino en VoyUruapan para saber si te conviene llegar a una estación del Teleférico caminando, en camión o mediante transbordo."
      }
    ]
  },
  {
    slug: "app-transporte-uruapan-pwa",
    title: "App de transporte en Uruapan: cómo usar VoyUruapan como PWA",
    description: "Aprende a usar VoyUruapan como app web progresiva para consultar rutas, mapa y datos offline.",
    keyword: "app transporte Uruapan",
    updatedAt: "2026-04-24",
    snippet:
      "VoyUruapan funciona como PWA: puedes abrirla desde el navegador, instalarla en la pantalla de inicio y usar datos cacheados para consultar rutas cuando no tengas conexión estable.",
    sections: [
      {
        heading: "Qué es una PWA de transporte",
        body: "Una PWA se comporta como app sin depender de una tienda. En VoyUruapan, el navegador puede guardar archivos de la app y datos de rutas para cargar más rápido."
      },
      {
        heading: "Qué funciona sin internet",
        body: "La aplicación y datos guardados pueden seguir disponibles si ya se cargaron antes. Los tiles externos del mapa pueden requerir conexión para verse completos."
      },
      {
        heading: "Permisos de ubicación",
        body: "La ubicación solo se solicita cuando usas la función de rutas cercanas. El cálculo se hace en tu dispositivo y no requiere crear una cuenta."
      }
    ]
  }
];

export function getBlogArticle(slug: string) {
  return BLOG_ARTICLES.find((article) => article.slug === slug) ?? null;
}
