# Actualización 48.1: corrección de navegación interna de Next.js

## Incidencia y contexto

Tras instalar la actualización 48 y ejecutar `pnpm lint` en Windows, ESLint detectó **un error** (`@next/next/no-html-link-for-pages`) y **tres advertencias** (`@next/next/no-location-assign-relative-destination`). La prueba de compilación completa todavía no se había confirmado. La subida previa a GitHub fue correcta, pero no constituye una prueba de calidad del código.

## Diagnóstico

El proyecto utiliza App Router de Next.js. Cuatro interacciones navegaban mediante una etiqueta `<a href="/">` o `window.location.assign(...)` hacia rutas internas. Estas operaciones recargan el documento y contravienen las recomendaciones de Next.js para navegación interna.

## Decisiones e implementación

1. En la página de Guerrero (`apps/web/src/app/page.tsx`), se utiliza `useRouter().push('/wizard')` tras mantener la confirmación explícita del cambio de clase.
2. En la página de Mago (`apps/web/src/app/wizard/page.tsx`), el vínculo «Volver a Guerrero» pasa a usar `Link` de `next/link`. Se añade confirmación de descarte cuando existe una ficha de Mago modificada y no guardada. El selector de clase utiliza `useRouter().push('/')` después de su confirmación existente.
3. En «Mis personajes» (`apps/web/src/components/SaveLoadPanel.tsx`), cargar un Mago desde la hoja del Guerrero utiliza `useRouter().push(...)` conservando el identificador del personaje mediante `encodeURIComponent`.
4. Se mantienen el estado y las validaciones de Mago y Guerrero, así como la persistencia existente. No hay migraciones de datos, cambios de dependencias ni modificaciones del motor de reglas.

Se ha tenido en cuenta que las transiciones de App Router **no activan necesariamente `beforeunload`**, por lo que se conserva la confirmación al cambiar mediante selectores o carga de personajes, y se añade una confirmación explícita al enlace superior del Mago cuando hay cambios pendientes.

## Archivos de código modificados

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/wizard/page.tsx`
- `apps/web/src/components/SaveLoadPanel.tsx`

## Comprobaciones realizadas en la preparación

- Se parte de archivos idénticos a los entregados en el ZIP de la actualización 48.
- Se comprueba que desaparecen todas las apariciones de `window.location.assign(...)` y el enlace HTML interno que originaban las incidencias.
- Se verifica la sintaxis TSX mediante el compilador de TypeScript (análisis estático local, sin dependencias instaladas).
- Se comprueba que los tres componentes mantienen el nivel superior de hooks de React.

## Pruebas de aceptación pendientes en el ordenador del desarrollador

1. Ejecutar `pnpm lint`: **0 errores, 0 advertencias** respecto de estas incidencias.
2. Ejecutar `pnpm test` y `pnpm build` para verificar integración completa.
3. Cambiar de Guerrero a Mago con el selector; aceptar y cancelar la confirmación.
4. Volver de Mago a Guerrero mediante selector y enlace superior, con y sin cambios pendientes.
5. Recuperar un Mago desde «Mis personajes» y comprobar la ruta `/wizard?character=...`.
6. Cargar, modificar y guardar un Guerrero previamente existente; repetir con un Mago, comprobando PostgreSQL.

## Referencias técnicas

- Next.js: `useRouter` (`next/navigation`): https://nextjs.org/docs/app/api-reference/functions/use-router
- Next.js: componente `Link`: https://nextjs.org/docs/app/api-reference/components/link
- Next.js: regla `no-html-link-for-pages`: https://nextjs.org/docs/messages/no-html-link-for-pages

## Estado

**Corrección preparada, pendiente de verificación completa con ESLint, Vitest y build local.** No cerrar la incidencia hasta disponer de resultados de dichas ejecuciones.
