# Actualización 49.1: corrección de carga inicial de la galería de personajes

## 1. Incidencia

Tras la actualización 49, `pnpm lint` detectó un error de `react-hooks/set-state-in-effect` en `apps/web/src/app/load/page.tsx`, línea 22. El efecto de montaje llamaba a `load()`, y esta función ejecutaba `setLoading(true)` y `setError("")` antes de la primera operación asíncrona.

## 2. Corrección y justificación

Se extrae la consulta HTTP a `fetchCharacters()`, función que obtiene y valida la respuesta de `/api/characters` **sin modificar el estado de React**.

- El estado `loading` comienza directamente en `true` para la primera carga.
- El efecto de montaje inicia la consulta y solo actualiza React en sus callbacks de promesa, cuando llega la respuesta o se produce un error.
- Se incorpora `AbortController` para cancelar la petición al desmontar la galería y descartar resultados obsoletos, incluidos los producidos durante la doble ejecución de efectos en desarrollo.
- El botón «Actualizar lista» llama a `reload()`, donde `setLoading(true)` y `setError("")` son legítimos porque se producen como respuesta al evento del usuario.
- Se conserva el tratamiento de errores, el estado de carga, las tarjetas, las rutas y el filtrado de respuesta existente.

No se deshabilita la regla ESLint. No se modifican las APIs ni los modelos de datos.

## 3. Alcance

**Modificado:** `apps/web/src/app/load/page.tsx`.

**Añadido:** `docs/implementation/PASO_49_1_CORRECCION_LINT_GALERIA.md`.

Sin cambios en PostgreSQL, motor de reglas, dependencias ni esquema de guardado de Guerrero/Mago.

## 4. Verificación

Comprobaciones en el entorno de preparación:

- Comparación contra el archivo original de la actualización 49.
- Compilación sintáctica TSX con TypeScript 5.8.3: correcta.
- Verificación de que no queda `useEffect(()=>{void load();},[load])` ni estado inicial sincrónico dentro del efecto.
- ZIP verificado con dos archivos y sus rutas originales.

Pendientes de verificar en el equipo de desarrollo:

1. `pnpm lint` sin el error reportado.
2. `pnpm test` y `pnpm build`.
3. En navegador, `/load` lista los personajes y sus retratos.
4. «Actualizar lista» vuelve a consultar la base de datos.
5. Al iniciar la web antes que PostgreSQL, aparece el error; al arrancar PostgreSQL y pulsar «Actualizar lista», aparecen los personajes.
6. Al abrir tarjetas de Guerrero y Mago se cargan los guardados preexistentes, sin duplicarlos.

## 5. Criterio de aceptación

La incidencia se cierra cuando ESLint finaliza sin errores y se comprueba manualmente el flujo de la galería con datos reales. La corrección no supone una nueva función del juego.

## 6. Referencia de implementación

React, regla `set-state-in-effect`: https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect

## 7. Commit propuesto

`fix: actualizacion 49.1 - corregir carga inicial de galeria`
