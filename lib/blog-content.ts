export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt: string;
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "como-usar-el-teleferico-uruapan",
    title: "Cómo usar el Teleférico de Uruapan paso a paso",
    description: "Aprende cómo usar el Teleférico de Uruapan, cuánto cuesta, cómo validar el acceso y cuáles son sus seis estaciones.",
    date: "2025",
    updatedAt: "2025-01-01"
  },
  {
    slug: "rutas-camion-mas-usadas-uruapan",
    title: "Las rutas de camión más usadas en Uruapan y para qué sirven",
    description: "Resumen inicial de las rutas de camión más consultadas en Uruapan y sus usos principales.",
    date: "2025",
    updatedAt: "2025-01-01"
  },
  {
    slug: "guia-transporte-publico-estudiantes-uruapan",
    title: "Guía de transporte público para estudiantes en Uruapan",
    description: "Guía inicial para estudiantes que se mueven en camión urbano, Teleférico y rutas cercanas a escuelas en Uruapan.",
    date: "2025",
    updatedAt: "2025-01-01"
  }
];
