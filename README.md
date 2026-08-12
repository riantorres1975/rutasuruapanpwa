# UruGo

<p align="right">
  <a href="./README.en.md">English version</a>
</p>

UruGo es una aplicación web para consultar las rutas de transporte público de Uruapan, Michoacán. Reúne en un solo lugar los recorridos de camiones, el Teleférico, horarios aproximados y una herramienta para calcular opciones entre un origen y un destino.

[Abrir UruGo](https://www.urugo.app) · [Ver el mapa](https://www.urugo.app/mapa)

## Vista previa

<p align="center">
  <img src="./public/readme/inicio-wide.webp" alt="Página de inicio de UruGo con buscador de destinos y vista del mapa" width="920">
</p>

<p align="center"><sub>Busca un destino, compara alternativas y abre el recorrido directamente en el mapa.</sub></p>

<table>
  <tr>
    <th>Mapa interactivo</th>
    <th>Selector de rutas</th>
    <th>Resultado del viaje</th>
  </tr>
  <tr>
    <td align="center"><img src="./public/readme/mapa-narrow.webp" alt="Mapa móvil de UruGo" width="260"></td>
    <td align="center"><img src="./public/readme/rutas-narrow.webp" alt="Selector móvil de rutas de UruGo" width="260"></td>
    <td align="center"><img src="./public/readme/resultado.webp" alt="Resultado de una búsqueda de viaje en UruGo" width="260"></td>
  </tr>
  <tr>
    <th>Modo viaje</th>
    <th>Horarios</th>
    <th>Guía de uso</th>
  </tr>
  <tr>
    <td align="center"><img src="./public/readme/modo-viaje.webp" alt="Seguimiento móvil de un viaje en UruGo" width="260"></td>
    <td align="center"><img src="./public/readme/horarios.webp" alt="Horarios de las rutas de Uruapan" width="260"></td>
    <td align="center"><img src="./public/readme/guia-narrow.webp" alt="Guía móvil de funciones de UruGo" width="260"></td>
  </tr>
</table>

## Qué ofrece

- Mapa interactivo con las 40 rutas urbanas y el recorrido del Teleférico de Uruapan.
- Búsqueda por número de ruta, destino, colonia y puntos de referencia conocidos.
- Cálculo local de opciones entre dos puntos, sin depender de una API externa de direcciones.
- Sugerencias de rutas directas y viajes con un transbordo.
- Comparación por distancia a pie, tiempo estimado y costo del viaje.
- Consulta de horarios, frecuencia y estado de servicio por ruta.
- Rutas favoritas, lugares guardados y viajes recientes almacenados en el dispositivo.
- Enlaces compartibles que conservan la ruta, dirección, origen y destino.
- Instalación como PWA y una vista básica del recorrido cuando no hay conexión.
- Asistente opcional para preguntas sobre transporte, limitado a los datos disponibles en el proyecto.

La ubicación del dispositivo solo se usa como origen automático cuando se encuentra dentro del área de servicio de Uruapan. Si el usuario está en otra ciudad, la aplicación conserva el destino y solicita que marque manualmente un origen dentro de Uruapan.

## Cómo funciona el cálculo de rutas

Los recorridos se almacenan como polilíneas GPS en `data/rutas_produccion_final.json`. Para cada consulta, el motor:

1. Busca los puntos de cada recorrido más cercanos al origen y al destino.
2. Descarta rutas demasiado alejadas o que circulan en el sentido contrario.
3. Ordena las opciones por caminata y longitud útil del trayecto.
4. Si no encuentra una ruta directa, busca una combinación con un transbordo razonable.

El cálculo se realiza en el cliente con los datos del proyecto. Mapbox se utiliza para dibujar el mapa y para la búsqueda geográfica, pero no para decidir qué camión tomar.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| Next.js 16 y React 19 | Aplicación, páginas públicas y endpoints internos |
| TypeScript | Tipos compartidos y lógica del motor de rutas |
| Tailwind CSS | Estilos y diseño adaptable |
| Mapbox GL JS | Mapa vectorial, capas y marcadores |
| Vitest | Pruebas de geometría, horarios, búsqueda y almacenamiento |
| Service Worker | Instalación y caché de la PWA |
| Vercel Analytics | Métricas de uso y rendimiento |

## Puesta en marcha

### Requisitos

- Node.js 20 o posterior.
- Una cuenta de Mapbox y un token público.
- Una clave de DeepSeek únicamente si se quiere habilitar el asistente.

### Instalación

```bash
git clone https://github.com/riantorres1975/rutasuruapanpwa.git
cd rutasuruapanpwa
npm install
```

Copia `.env.example` como `.env.local` y completa, como mínimo, el token de Mapbox:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.tu_token_publico
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Después inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Sí | Token público para el mapa y la búsqueda de lugares |
| `NEXT_PUBLIC_SITE_URL` | No | URL base usada en metadatos y enlaces compartidos |
| `DEEPSEEK_API_KEY` | No | Habilita el asistente de transporte |
| `UPSTASH_REDIS_REST_URL` | No | Almacenamiento compartido para el límite de solicitudes |
| `UPSTASH_REDIS_REST_TOKEN` | No | Token de acceso a Upstash Redis |
| `ERROR_ALERT_WEBHOOK_URL` | No | Webhook HTTPS para alertas de errores críticos del cliente |
| `ERROR_ALERT_WEBHOOK_TOKEN` | No | Token Bearer opcional para autenticar el webhook |
| `DEBUG_ROUTE_SAVE_ENABLED` | No | Activa el guardado del editor de recorridos en desarrollo |
| `DEBUG_ROUTE_SAVE_TOKEN` | No | Protege el endpoint del editor cuando está habilitado |

El token público de Mapbox debe restringirse por dominio desde el panel de Mapbox. Las claves privadas no deben usar el prefijo `NEXT_PUBLIC_` ni incluirse en el repositorio.

En producción conviene configurar Upstash para que los límites de solicitudes se compartan entre todas las instancias. El webhook operativo es opcional: recibe únicamente errores críticos de React, deduplicados por huella durante 15 minutos, sin mensajes, trazas ni ubicación del usuario.

## Comandos disponibles

```bash
npm run dev      # servidor local con recarga automática
npm run build    # compilación de producción
npm run start    # inicia la compilación de producción
npm run lint     # revisión estática con ESLint
npm test         # ejecuta la suite de Vitest
npm run guide:screenshots # actualiza las capturas de la aplicación
```

## Estructura del proyecto

```text
app/                  páginas, layouts y endpoints de Next.js
components/           mapa, buscadores, paneles y controles reutilizables
data/                  recorridos GPS y datos auxiliares de transporte
hooks/                 favoritos y enlaces compartidos
lib/                   geometría, horarios, búsqueda y motor de rutas
public/                manifest, Service Worker, iconos y recursos públicos
tests/                 pruebas automatizadas
```

Los módulos principales son:

- `app/mapa/page.tsx`: coordina el flujo de origen, destino y resultados.
- `components/Map.tsx`: administra Mapbox, capas, marcadores y encuadre.
- `lib/routeMatcher.ts`: evalúa y ordena las rutas directas.
- `lib/transfers.ts`: busca combinaciones con un transbordo.
- `lib/geo.ts`: distancias y validación del área de servicio.
- `lib/schedules.ts`: horarios y estado estimado de operación.

## Datos y correcciones

La fuente principal de recorridos es `data/rutas_produccion_final.json`. El proyecto incluye un editor visual para corregir segmentos durante el desarrollo. Su endpoint de guardado está deshabilitado por defecto y no debe exponerse públicamente sin autenticación.

Los reportes sobre rutas, horarios o puntos incorrectos pueden enviarse desde la página [`/reportar-error`](https://www.urugo.app/reportar-error).

### Generar puntos de referencia

Los puntos de referencia de las rutas pueden regenerarse desde OpenStreetMap sin sobrescribir los que ya fueron verificados manualmente:

```bash
npm run landmarks:review  # genera .cache/landmarks-review.json
npm run landmarks:apply   # aplica las propuestas a rutas sin referencias
```

Los lugares generados incluyen datos de [OpenStreetMap](https://www.openstreetmap.org/copyright), disponibles bajo ODbL 1.0, y deben revisarse antes de publicarse.

## Alcance y limitaciones

- UruGo es un proyecto independiente; no pertenece al Ayuntamiento de Uruapan ni a los operadores de transporte.
- Los horarios de camiones son aproximados y pueden cambiar por tráfico, demanda o decisiones operativas.
- No todas las paradas están formalmente señalizadas o mapeadas.
- Los mapas base de Mapbox requieren conexión, aunque algunos datos y recorridos pueden quedar en caché.
- Las sugerencias sirven como orientación y deben contrastarse con las condiciones reales del servicio.

## Calidad

Antes de enviar cambios se recomienda ejecutar:

```bash
npm run lint
npm test
npm run build
```

El repositorio también ejecuta estas verificaciones mediante GitHub Actions.
