# Rutas Uruapan

Aplicacion web mobile-first para visualizar rutas de transporte publico en Uruapan, Michoacan.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Mapbox GL JS

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

## Estructura base

```
app/
components/
  Map.tsx
  RouteList.tsx
  BottomSheet.tsx
data/
  rutas.json
lib/
  map.ts
```

## Datos de rutas

El archivo `data/rutas.json` usa este formato:

```json
[
  {
    "id": 1,
    "nombre": "Ruta 1",
    "color": "#FF5733",
    "coordenadas": [[-102.05, 19.42], [-102.04, 19.43]]
  }
]
```

## Funcionalidades

- Mapa centrado en Uruapan con multiples rutas
- Colores unicos por ruta
- Seleccion de ruta con resaltado y atenuacion del resto
- Bottom sheet con buscador y lista de rutas
- Boton flotante para abrir panel
- Boton de mi ubicacion
- UI en modo claro/oscuro segun preferencias del sistema
