# Rutas Uruapan

Aplicacion web mobile-first para visualizar rutas de transporte publico en Uruapan, Michoacan.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Mapbox GL JS

## Funcionalidades principales

- Visualizacion de rutas ida/vuelta con seleccion y resaltado
- Atenuacion del resto de rutas para mantener foco visual
- Animacion de dibujo progresivo al seleccionar ruta
- Seleccion de origen (A) y destino (B) tocando el mapa
- Sugerencias A -> B sin APIs externas (matching local sobre coordenadas)
- Al seleccionar una sugerencia, se renderiza solo el segmento relevante entre A y B
- Marcadores A/B sobre inicio y fin del segmento seleccionado
- UX fluida sin recrear layers: solo se actualiza el source GeoJSON

## Configuracion rapida

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env.local` y agrega tu token publico de Mapbox:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.tu_token_publico_mapbox
```

3. Inicia el proyecto:

```bash
npm run dev
```

## Estructura

```
app/
components/
  BottomSheet.tsx
  Map.tsx
  RouteList.tsx
data/
  rutas.json
  rutas-grouped.json
lib/
  map.ts
  types.ts
scripts/
  convert-rutas.js
  group-rutas.js
```

## Datos de rutas

Se usan dos archivos principales:

- `data/rutas.json`: rutas normalizadas en formato plano
- `data/rutas-grouped.json`: rutas agrupadas por nombre con `ida` y `vuelta`

Formato esperado en `data/rutas-grouped.json`:

```json
[
  {
    "ruta": "Ruta 1",
    "color": "#ff5733",
    "ida": [[-102.05, 19.42], [-102.04, 19.43]],
    "vuelta": [[-102.04, 19.43], [-102.05, 19.42]]
  }
]
```

## Scripts utiles

- `npm run convert:rutas`: convierte y normaliza insumos desde `Rutas/` hacia `data/rutas.json`
- `node scripts/group-rutas.js`: genera `data/rutas-grouped.json` a partir de rutas normalizadas
- `npm run lint`: validacion de lint
- `npm run build`: build de produccion
