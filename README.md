# UruGo - Rutas Uruapan

<p align="right">
  <a href="./README.en.md"><img src="https://img.shields.io/badge/English-README-blue?style=for-the-badge" alt="Read in English"></a>
</p>

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox_GL_JS-000000?style=for-the-badge&logo=mapbox&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![DeepSeek](https://img.shields.io/badge/DeepSeek_AI-4A90D9?style=for-the-badge&logo=openai&logoColor=white)

**Aplicación web progresiva (PWA) mobile-first para visualizar y navegar las 40 rutas de transporte público de Uruapan, Michoacán, junto con información del Teleférico Uruapan, sin depender de APIs externas de enrutamiento.**

## Demos

### Landing page

![Demo de la landing page de UruGo](./public/readme/demoLandipageUruGO.gif)

### Mapa interactivo

![Demo del mapa interactivo de UruGo](./public/readme/demoMapaUruGO.gif)

---

## El problema que resuelve

Los sistemas de transporte público en ciudades intermedias de México carecen de información digital accesible. Los pasajeros dependen del conocimiento informal para saber qué ruta tomar. **Rutas Uruapan** digitaliza las 40 rutas reales con coordenadas GPS y ofrece un motor de sugerencias A→B 100% local, sin consumir APIs de pago.

---

## ✨ Features principales

| Feature | Detalle técnico |
|---|---|
| 🗺️ Mapa interactivo | 40 rutas reales + Teleférico con coordenadas GPS en Mapbox GL JS |
| 🚡 Teleférico Integrado | Capa GeoJSON del nuevo sistema, tarjeta de información y sugerencias A→B |
| 📍 Geolocalización Inteligente | Filtra rutas a <400m del usuario, indicador de precisión y ranking de cercanía |
| 🚀 Onboarding | Overlay de bienvenida explicativo usando `localStorage` |
| 📲 Compartir Ruta | Integración con `navigator.share()` nativo y fallback al portapapeles |
| 🏷️ Nombres descriptivos | Cada ruta se identifica por su destino (ej. "Jucutacato · Ruta 24") en lista, mapa y link compartido |
| 🏛️ Landmarks y búsqueda por referencia | Indicaciones muestran puntos de referencia cercanos ("Sube cerca de Central de Autobuses"); el buscador sugiere rutas que pasan por un landmark conocido |
| 🔎 Contexto desde landing | Los CTAs y chips envían `?destino=...`; el mapa muestra una guía contextual para marcar origen y destino |
| 🔄 Ida / Vuelta | Cambio dinámico de dirección con re-render reactivo; botón de sugerencia rápida al no encontrar ruta directa |
| ➤ Flechas direccionales | Chevrons SDF dibujados en canvas y tintados con el color de cada ruta; tamaño y separación interpolados por zoom (visibles tanto a vista de ciudad como acercado) |
| 🎯 Motor de sugerencias A→B | Algoritmo Haversine para matching local sin APIs externas |
| 🔀 Rutas con trasbordo | Sugerencias A→B con 1 cambio de camión; detección de intersecciones reales entre rutas (misma esquina ≤35 m); línea de caminata punteada entre puntos de bajada y abordaje; rutas secundarias atenuadas visualmente |
| 📐 Simplificación de trayectorias | Algoritmo Ramer-Douglas-Peucker (RDP) para reducir puntos en rutas de fondo |
| 🎬 Animación de trazado | Dibujo progresivo de rutas con `requestAnimationFrame` |
| 📍 Segmento relevante | Al seleccionar una sugerencia, se renderiza solo el segmento A→B |
| 🎯 Auto-encuadre de pines | La cámara ajusta el viewport automáticamente al marcar A o B |
| 🖱️ Cursor crosshair | El canvas del mapa muestra cursor de mira mientras se espera marcar A o B |
| ⚡ Lazy load de datos | El JSON maestro se carga vía `fetch("/api/rutas-polyline")` fuera del bundle JS |
| 📴 PWA completa | Service Worker con caché offline, manifest, instalable en Android/iOS |
| 🎨 UX fluida | Sin recrear layers de Mapbox: solo se actualiza el GeoJSON source |
| ✨ HeroMap animado | Card de sugerencias rotatoria con fade suave y dots indicator; bearing rotatorio del mapa |
| 🛠️ Editor de rutas (debug) | Modo visual para corregir trayectorias GPS: seleccionar segmento → dibujar reemplazo → guardar a JSON |
| 🤖 Asistente IA (UruGo Chat) | Chatbot con DeepSeek AI que responde preguntas sobre rutas, horarios y cómo llegar a destinos en Uruapan |
| 🔒 Rate limiting anti-spam | Máx. 10 mensajes por IP cada 60 s en el endpoint del chat; responde 429 con mensaje legible |
| 🚩 Reporte de errores integrado | Botón en el chat para reportar información incorrecta vía correo o GitHub Issue, con campos prellenados |
| ♿ Accesibilidad base | Estados `:focus-visible` globales para navegación por teclado y controles con labels accesibles |
| 🌗 Tema adaptativo | Respeta `prefers-color-scheme` del OS como señal primaria; fallback basado en hora del día para navegadores sin soporte |
| 🔔 Actualización de PWA | Toast "Nueva versión disponible" al detectar un SW actualizado — el usuario decide cuándo recargar |

---

---

## Flujo landing -> mapa

La landing abre la PWA en `/mapa`. Los CTAs de búsqueda y chips populares pueden enviar un destino como query param:

```txt
/mapa?destino=Parque%20Nacional
```

El mapa no inventa coordenadas ni rutas automáticas a partir de texto libre. En su lugar, muestra el destino recibido y guía al usuario a marcar primero su origen y luego la zona del destino en el mapa. Esto evita falsos positivos y mantiene el motor A→B basado en coordenadas reales.

---

## 🤖 Asistente UruGo (ChatBot IA)

Botón de chat flotante integrado en el mapa que responde preguntas en lenguaje natural sobre las rutas de Uruapan.

### Características

- Responde sobre rutas, horarios, cómo llegar a destinos y paradas conocidas
- Geolocalización opcional: sugiere rutas cercanas al usuario
- Defensa contra prompt injection y preguntas fuera de tema
- Badge **BETA** visible + aviso de que la información puede no ser exacta
- Botón 🚩 para reportar errores directamente desde el chat (abre correo o GitHub Issue prellenado)

### Base de conocimiento

Todos los datos que el chatbot conoce (rutas, horarios, alias de destinos, paradas con coordenadas) se centralizan en `lib/chat-knowledge.ts`. Editar ese archivo es suficiente para actualizar las respuestas del asistente sin tocar la lógica del endpoint.

### Variables de entorno necesarias

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk_... # Obtener en mapbox.com
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
DEEPSEEK_API_KEY=sk-...   # Obtener en platform.deepseek.com
```

El editor interno de rutas permanece desactivado por defecto. Si necesitas usarlo en local o en un entorno privado, configura `DEBUG_ROUTE_SAVE_ENABLED=true` y protege el endpoint con `DEBUG_ROUTE_SAVE_TOKEN`.

### Seguridad

| Medida | Detalle |
|---|---|
| **CSP** | `script-src` sin `unsafe-eval` en producción; en desarrollo se permite para React Fast Refresh |
| **Rate limiting** | Máx. 10 mensajes por IP cada 60 s en `/api/chat` (in-memory) |
| **Validación de entrada** | `message` limitado a 1000 caracteres; historial limitado a 20 entradas de 2000 chars c/u |
| **IP detection** | Solo headers confiables: `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip` |
| **Debug endpoint** | `/api/debug/save-route` retorna 404 automáticamente en `NODE_ENV=production` |
| **Caché CDN** | `/api/rutas-polyline` usa `Cache-Control: public, max-age=3600` para servir desde edge |
| **Secrets** | Las claves API viven solo en variables de entorno (`.env` local + Vercel env vars). Nunca en el código fuente |

> **Nota:** El rate limiter usa memoria del proceso. En Vercel serverless cada instancia tiene su propio contador — para protección robusta ante abuso a escala, migrar a [Upstash Redis](https://upstash.com/) como store compartido.

### Rate limiting

El endpoint `/api/chat` limita a **10 mensajes por IP cada 60 segundos**. Si se supera, responde HTTP 429. Para ajustar el límite:

```ts
// app/api/chat/route.ts
const RATE_LIMIT = 10;       // mensajes permitidos
const RATE_WINDOW_MS = 60_000; // ventana en ms
```

### Pruebas recomendadas

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit --audit-level=moderate
```

> `npm audit` puede reportar vulnerabilidades de Next.js/PostCSS que requieren actualización controlada de dependencias. Evita `npm audit fix --force` sin revisar migración, porque puede proponer un salto mayor de Next.js.

---

## 🛠️ Editor visual de rutas (modo debug)

Herramienta de desarrollo para corregir coordenadas GPS directamente desde el mapa, sin editar JSON a mano.

### Activación

```js
// En la consola del navegador (solo en desarrollo)
localStorage.setItem('debug', 'true')
// Recargar la página
```

### Flujo de edición

1. **Selecciona una ruta** en el panel lateral — aparecen los puntos GPS numerados sobre el mapa.
2. **Haz clic en el punto de inicio** del segmento a corregir → se resalta en rojo.
3. **Haz clic en el punto final** → el segmento completo queda marcado en rojo.
4. Pulsa **"Editar segmento"** y luego haz clic en el mapa para dibujar el nuevo trayecto (verde).
5. Pulsa **"Finalizar"** → **"Aplicar"** para reemplazar el segmento.
6. Pulsa **"Guardar"** para escribir los cambios en `data/rutas_produccion_final.json`.

> El botón Guardar solo está disponible en `NODE_ENV=development`. Los cambios persisten en disco y se reflejan en el siguiente reload de la página.

---

## 🧠 Algoritmos técnicos implementados

### Haversine — Distancia esférica sobre la Tierra

Calcula la distancia en metros entre dos coordenadas GPS considerando la curvatura terrestre. Se usa para encontrar el punto de la ruta más cercano al origen (A) y al destino (B) del usuario.

```
d = 2R · arctan2(√a, √(1−a))
a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)
```

### Ramer-Douglas-Peucker (RDP) — Simplificación de polilíneas

Reduce la cantidad de puntos de las rutas de fondo (aquellas no seleccionadas) sin perder la forma visual. Funciona recursivamente eliminando puntos cuya distancia perpendicular a la línea entre extremos sea menor que una tolerancia configurable (`BACKGROUND_SIMPLIFY_TOLERANCE = 0.00008`).

### Motor de sugerencias A→B

1. Para cada ruta y dirección, busca el índice más cercano a A y a B usando Haversine.
2. Descarta rutas donde A o B estén a más de 550 m de la ruta.
3. Descarta rutas donde el índice de A sea posterior al de B (dirección incorrecta).
4. Calcula un **score** = `distanciaA + distanciaB × 1.8 + longitudSegmento × 0.01`.
5. Devuelve las 3 mejores opciones ordenadas por score.

### Motor de transbordos

Cuando no existe ninguna ruta directa A→B, se activa el motor de transbordos (`lib/transfers.ts`):

1. **Pre-filtro**: identifica rutas que cubren el origen (≤550 m) y rutas que cubren el destino (≤550 m).
2. **Progreso geográfico**: para cada punto de la ruta A (evaluando cada coordenada), descarta puntos cuya distancia al destino supere 1.15× la distancia origen→destino — evita que la ruta A se aleje en sentido contrario.
3. **Detección de intersección**: para cada punto válido de la ruta A, escanea las coordenadas de la ruta B (hasta el destino) usando pre-rechazo lat/lng antes de llamar a Haversine — solo se procesan puntos dentro de la ventana de 200 m.
4. **Umbral de esquina compartida**: si la distancia entre el punto de la ruta A y el punto más cercano de la ruta B es ≤35 m, se considera una intersección real (misma esquina); la penalización de caminata es casi nula.
5. **Penalidad no lineal**: distancias > 35 m se penalizan 3× para privilegiar fuertemente las transferencias en esquina.
6. **Score** = `longitudSegA + penalidad(caminata) + longitudSegB`; devuelve top 5 deduplicados por par de rutas.

### requestAnimationFrame — Animación de trazado

Al seleccionar una ruta, los puntos se añaden uno a uno al GeoJSON source en cada frame de animación, creando el efecto de "dibujo progresivo" sin bloquear el hilo principal.

---

## 🛠 Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16.2.4 (App Router + webpack) | Framework React con SSR/RSC y API Routes |
| [React](https://react.dev/) | 19.2.5 | Biblioteca de UI con Server Components |
| [TypeScript](https://www.typescriptlang.org/) | 5.5.3 | Tipado estático en todo el codebase |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4.6 | Utilidades CSS, tema oscuro, responsivo |
| [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) | 3.12.0 | Renderizado de mapas vectoriales y capas GeoJSON |
| Service Worker | nativo | Caché offline, instalación PWA |
| [DeepSeek API](https://platform.deepseek.com/) | deepseek-chat | Modelo de lenguaje para el asistente IA |

---

## 🚀 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/riantorres1975/rutasuruapanpwa.git
cd rutasuruapanpwa
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiTVVZX1RPS0VOX0FRVUkiLCJhIjoiZXhhbXBsZSJ9.XXXXXXXXXXXXXXXX
DEEPSEEK_API_KEY=sk-...
```

> **¿Cómo obtener el token de Mapbox?**
> 1. Crea una cuenta gratuita en [mapbox.com](https://account.mapbox.com/)
> 2. Ve a **Account → Tokens**
> 3. Copia el **Default public token** (empieza con `pk.`)
> 4. Pégalo en `.env.local` como `NEXT_PUBLIC_MAPBOX_TOKEN`
>
> El plan gratuito incluye 50,000 cargas de mapa al mes, más que suficiente para desarrollo y portafolio.

> **¿Cómo obtener la API key de DeepSeek?**
> 1. Crea una cuenta en [platform.deepseek.com](https://platform.deepseek.com/)
> 2. Ve a **API Keys** y genera una nueva clave
> 3. Pégala en `.env.local` como `DEEPSEEK_API_KEY`
>
> El modelo `deepseek-chat` tiene un costo muy bajo (~$0.014 USD por millón de tokens de entrada). Para una PWA con rate limiting, el costo mensual es mínimo.

### 4. Iniciar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Scripts útiles

```bash
npm run build                    # Build de producción (webpack)
npm run dev                      # Dev server con webpack
npm run lint                     # Validación ESLint 9
npx tsc --noEmit                 # Validación TypeScript estricta
npm audit --audit-level=moderate # Auditoría de dependencias
```

---

## 📁 Estructura del proyecto

```
rutasuruapanpwa/
├── app/
│   ├── api/rutas-polyline/route.ts     # Endpoint GET /api/rutas-polyline (datos de rutas)
│   ├── api/chat/route.ts              # Endpoint POST /api/chat — asistente IA con rate limiting
│   ├── api/debug/save-route/route.ts  # Endpoint POST para guardar ediciones (solo dev)
│   ├── robots.ts                       # Robots.txt generado por App Router
│   ├── sitemap.ts                      # Sitemap XML generado por App Router
│   ├── layout.tsx                      # Root layout, metadatos, fuentes
│   ├── mapa/page.tsx                   # Mapa interactivo con overlays y BottomSheets
│   └── page.tsx                        # Landing page
├── components/
│   ├── BottomSheet.tsx       # Sheet deslizable con lista de rutas
│   ├── ChatBot.tsx           # Asistente IA flotante con vistas chat y reporte
│   ├── Map.tsx               # MapView con Mapbox GL JS
│   ├── ReportBugForm.tsx     # Formulario de reporte de errores (correo / GitHub)
│   └── RouteList.tsx         # Lista filtrable de rutas
├── data/
│   ├── rutas_produccion_final.json # Fuente maestra del motor de rutas
│   └── gtfs/                  # Datos GTFS auxiliares / experimentales
├── lib/
│   ├── geo.ts                # Haversine y utilidades geométricas
│   ├── map.ts                # Utilidades de Mapbox (layers, sources)
│   ├── map-debug.ts          # Utilidades del editor de rutas (replaceSegment)
│   ├── transfers.ts          # Motor de transbordos con detección de intersecciones
│   └── types.ts              # Tipos TypeScript compartidos
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service Worker
│   └── icons/                # Íconos PWA (192, 512, svg)
└── scripts/
    └── test-chatbot.mjs      # Suite de tests del asistente IA
```

---

## 🏗 Decisiones técnicas

### SEO y PWA

El proyecto usa metadata de Next.js App Router, `app/sitemap.ts` y `app/robots.ts` para evitar duplicidad con archivos estáticos. El manifest vive en `public/manifest.json` y el Service Worker en `public/sw.js`, generado desde `public/sw.template.js` durante el build para estampar un identificador de versión.

El Service Worker precarga el shell principal y cachea `/api/rutas-polyline` con estrategia stale-while-revalidate para que el mapa pueda seguir funcionando después de una primera carga exitosa.

### ¿Por qué Next.js 16 con App Router?

El App Router permite colocar el endpoint `/api/rutas-polyline` en el mismo proyecto sin backend separado. Además, los **React Server Components** reducen el JS del cliente y `revalidate = 86400` en el API route garantiza que Vercel sirva el JSON desde su CDN edge — cero latencia para los usuarios. El build con webpack (`next dev --webpack`) proporciona compatibilidad completa con plugins y optimización de bundle.

### ¿Por qué Mapbox GL JS y no Leaflet o Google Maps?

Mapbox GL JS renderiza en WebGL, permitiendo 40 rutas simultáneas con animaciones fluidas a 60 fps en móviles de gama media. El modelo de capas GeoJSON separadas (una por ruta) permite actualizar solo el source de la ruta seleccionada sin re-renderizar el mapa completo.

### ¿Por qué el motor de sugerencias es local?

Las APIs de enrutamiento (Google Directions, HERE, etc.) tienen costos por request que escalan mal en una app de uso real. Dado que las rutas son fijas y conocidas, el algoritmo Haversine sobre las coordenadas locales es determinístico, instantáneo y gratuito — la búsqueda completa sobre 40 rutas tarda < 5 ms en un smartphone de gama baja.

### ¿Por qué RDP para simplificación de rutas de fondo?

Mostrar todas las rutas con su resolución completa (miles de puntos) degrada el FPS al arrastrar el mapa. RDP reduce los puntos manteniendo la forma visual percibida. Las rutas de fondo usan tolerancia `0.00008` (~8 m), la ruta seleccionada usa la resolución completa para la animación.

### ¿Por qué lazy load del JSON?

`rutas_produccion_final.json` es la fuente maestra del motor A→B. Cargarlo con `fetch("/api/rutas-polyline")` en un `useEffect` evita meter los datos de rutas en el bundle JS inicial, permite mostrar el mapa primero y deja que los datos lleguen en background.

---

## 🗺 Roadmap

- [x] **Geolocalización y Rutas Cercanas** — usar la posición GPS del usuario como punto A e indicar rutas próximas
- [x] **Integración del Teleférico** — rutas, estaciones, tiempos y visualización rica
- [x] **Compartir ruta** — integración nativa y portapapeles
- [x] **Onboarding** — guía paso a paso para usuarios nuevos
- [x] **Rutas con trasbordo** — sugerencias A→B con máximo 1 cambio de camión y visualización diferenciada
- [x] **Auto-encuadre inteligente** — la cámara se ajusta al marcar A, B o al mostrar una ruta sugerida
- [x] **Búsqueda de paradas por nombre** — campo de texto con autocomplete fuzzy
- [x] **Horarios estimados** — basados en patrones históricos de la ciudad
- [x] **Modo nocturno adaptativo** — cambio automático según hora del día
- [x] **Asistente IA** — chatbot con DeepSeek para preguntas en lenguaje natural sobre rutas
- [x] **Rate limiting** — protección anti-spam en el endpoint del asistente
- [x] **Reporte de errores en el chat** — botón 🚩 que abre correo o GitHub Issue prellenado
- [ ] **Panel de accesibilidad** — contraste alto, texto grande, screen reader

---

## 👤 Autor

**Wh0am1**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/tu-usuario)
[![Portafolio](https://img.shields.io/badge/Portafolio-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://tu-portafolio.dev)
