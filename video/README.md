# Video de producto de UruGo

El video muestra grabaciones reales de la aplicación, sin textos editoriales sobre la interfaz. La explicación se agrega mediante una voz en off basada en `VOICEOVER.md`. Tiene una versión horizontal para web o YouTube y otra vertical para Reels, TikTok y Shorts.

## Flujo de trabajo

1. Inicia la aplicación:

   ```bash
   pnpm dev
   ```

2. Graba las escenas con Playwright:

   ```bash
   pnpm video:record
   ```

3. Revisa y ajusta la composición:

   ```bash
   pnpm video:studio
   ```

4. Renderiza las dos versiones:

   ```bash
   pnpm video:render
   ```

Los archivos terminados se guardan en `video/out/`. Para grabar otro entorno, define `VIDEO_BASE_URL` antes de ejecutar `video:record`.

## Escenas

- Portada y búsqueda de destino.
- Exploración de rutas mediante referencias locales.
- Resultado recomendado y alternativas.
- Viaje con transbordo.
- Modo viaje con movimiento del camión.
- Acceso al Teleférico y último tramo a pie.
- Horarios y guía de uso.

Las grabaciones y los videos exportados no se versionan. Al cambiar una pantalla, vuelve a ejecutar la grabación y el render para mantener la demostración actualizada.
