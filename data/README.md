# Datos de transporte

`rutas_produccion_final.json` contiene los recorridos verificados que utiliza UruGo. Los puntos de referencia de la Ruta 1 y las estaciones del Teleferico fueron verificados manualmente. Las propuestas para las demas rutas se generan con `npm run landmarks:review` y se aplican con `npm run landmarks:apply`.

El generador toma puntos de interes con nombre de OpenStreetMap, calcula su distancia al recorrido, prioriza servicios y lugares reconocibles, elimina duplicados y distribuye las referencias a lo largo de cada direccion. El reporte detallado queda en `.cache/landmarks-review.json` para revisarlo antes de aplicar cambios.

Los puntos de interes generados incluyen datos de [OpenStreetMap](https://www.openstreetmap.org/copyright), disponibles bajo la licencia ODbL 1.0. Copyright OpenStreetMap contributors.
