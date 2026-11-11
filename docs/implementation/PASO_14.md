# Paso 14 · Estado persistente de partida (fase 4.2)

## Objetivo

Convertir la hoja calculada de Guerrero 1–3 en una hoja utilizable durante una partida. Los valores **derivados** (PG máximos, CA, modificadores, bonificación de competencia) siguen calculándose desde las elecciones. Los valores **variables** (PG actuales, PG temporales, dados de golpe gastados y usos consumidos) se conservan en el guardado.

**Fuentes de reglas:** Manual del Jugador 2024, capítulos 1 y 3, y apéndice C (entradas *Short Rest* y *Long Rest*); SRD 5.2.1 como complemento. Este paso no incorpora textos ni imágenes del manual en la aplicación.

## Novedades

- Aplicar daño: primero se reducen los PG temporales; el resto se descuenta de los PG actuales, como mínimo hasta 0.
- Curar PG: nunca se superan los PG máximos; la curación no recupera PG temporales.
- Recibir PG temporales: los nuevos **no se suman** con los anteriores; el prototipo conserva el importe mayor.
- Segundo aliento: introduce el resultado real de `1d10`; consume un uso y cura `1d10 + nivel de Guerrero` hasta el máximo.
- Acción súbita: descuenta un uso; no gestiona acciones o turnos y no autoriza una acción Magia adicional.
- Mente táctica: registra resultado de una prueba fallida, CD y d10; solo gasta Segundo aliento cuando la prueba finalmente se supera.
- Descanso corto: recupera **un** uso de Segundo aliento (máximo dos), restaura Acción súbita y puede gastar dados de golpe disponibles. Cada d10 gastado cura `máx(1, resultado + modificador de Constitución)`.
- Descanso largo: recupera los PG y todos los dados de golpe gastados, recarga los dos recursos y elimina los PG temporales.
- No se pueden iniciar descansos a **0 PG**. La muerte y las salvaciones contra muerte no están automatizadas, y el sistema impide aplicar nuevo daño a 0 PG sin intervención del director.
- Los formularios no tiran dados: se introduce el resultado que se haya obtenido en mesa.

## Compatibilidad con guardados anteriores

El documento guardado (`selection` en la tabla `Character`) evoluciona de `schemaVersion: 1` a `schemaVersion: 2`, incorporando una propiedad `adventure` con el estado variable de partida. `validateCharacterSnapshot` admite guardados v1 **sin modificar su contenido original**: al recuperarlos devuelve un documento v2 con recursos y PG iniciales completos. El siguiente guardado actualizado persistirá la versión 2.

**No necesitas una nueva migración de PostgreSQL ni modificar `schema.prisma`.** Ya utilizamos una columna JSON, y el endpoint PUT ahora sincroniza el campo `schemaVersion` de la fila con el contenido.

Si un usuario cambia nivel, Constitución u otra elección que altere los PG máximos, el estado se considera desincronizado: el guardado se bloquea hasta que deshaga el cambio o pulse **Reiniciar estado para esta hoja**. El reinicio pide confirmación y descarta el estado de partida anterior; no hay remapeos silenciosos.

## Instalación en Windows

1. Asegúrate de que la actualización anterior (13) ya está subida a GitHub. Puedes comprobar `git status`.
2. Descarga `actualizacion-web-08.zip`, descomprímelo y **combina** las carpetas `apps`, `packages` y `docs` con las del repositorio. Acepta reemplazar los archivos incluidos en el ZIP, no toda la carpeta.
3. No elimines `.env`, `apps/web/.env.local`, `node_modules`, Docker ni la base de datos.
4. Abre Docker Desktop y verifica que PostgreSQL sigue en ejecución con `docker compose ps`.
5. Ejecuta desde la raíz del proyecto:

```powershell
pnpm test
pnpm build
pnpm dev
```

6. Abre `http://localhost:3000`. Junto al panel «Mis personajes» aparecerá «Jugar con tu personaje».
7. Tras usar los controles, pulsa **Actualizar guardado** si tenías un personaje cargado, o **Guardar como nuevo** si quieres crear otra copia. No se guarda automáticamente.

**No ejecutes** `prisma migrate reset` ni borres los volúmenes de Docker. No es necesaria ninguna migración nueva para esta actualización.

## Pruebas manuales recomendadas

1. Carga un Guerrero de nivel 2 guardado en la actualización 13. Debe mostrar PG completos y 2/2 Segundo aliento, 1/1 Acción súbita.
2. Recibe 5 PG temporales y después 8 puntos de daño. Debe perder 5 PG temporales y 3 PG normales.
3. Cura 100 PG: nunca debe superar el máximo.
4. Gasta Segundo aliento dos veces. El tercer uso debe quedar bloqueado.
5. Gasta Acción súbita y termina un descanso corto: debe recuperar Acción súbita y un uso de Segundo aliento.
6. Recibe daño y termina un descanso corto gastando un dado de golpe con resultado 6. Debe recuperar `6 + mod. Con` PG (mínimo 1), gastar un dado y recuperar los recursos de descanso corto.
7. Termina un descanso largo: recupera PG completos, dados y recursos, pero no conserva PG temporales.
8. Guarda, recarga el navegador y recupera el personaje. PG actuales, recursos, PG temporales y dados gastados deben coincidir con el último guardado.
9. Cambia el nivel tras gastar recursos: debe aparecer el aviso de desincronización, impedir guardar y ofrecer reinicio explícito.
10. Comprueba que un personaje anterior v1 puede cargarse y actualizarse sin perder las elecciones y las compras del inventario.
11. Comprueba que un personaje a 0 PG no puede hacer descanso corto/largo ni gastar rasgos de acción. Para curarlo, utiliza una curación válida tras resolver manualmente la situación.

## Archivos de esta actualización

```text
apps/web/src/app/page.tsx
apps/web/src/app/globals.css
apps/web/src/app/api/characters/[id]/route.ts
apps/web/src/components/PlayPanel.tsx                 NUEVO
apps/web/src/components/SaveLoadPanel.tsx
packages/rules-engine/src/adventure.ts                 NUEVO
packages/rules-engine/src/persistence.ts
packages/rules-engine/src/index.ts
packages/rules-engine/tests/adventure.test.ts          NUEVO
packages/rules-engine/tests/persistence.test.ts

docs/implementation/PASO_14.md                        NUEVO
```

## Verificación realizada antes de empaquetar

Se ha reconstruido la estructura del repositorio aplicando en orden las actualizaciones anteriores y se han comprobado las exportaciones del motor con TypeScript en modo estricto. Las 215 pruebas existentes y nuevas han pasado con un ejecutor local de aserciones sobre el JavaScript compilado. **Esto no sustituye a ejecutar `pnpm test` y `pnpm build` dentro de tu instalación**, especialmente porque Next.js y PostgreSQL dependen de tu entorno.

## Limitaciones previstas

- La API sigue desactivada fuera de localhost y sin autenticación. No publiques este prototipo.
- Los datos de partida solo se guardan cuando el usuario pulsa Guardar o Actualizar, no con cada acción.
- No hay seguimiento de tiradas de salvación contra muerte, muerte instantánea, estabilización, condiciones, puntos de suerte, conjuros, concentración, uso de acciones del turno ni duración real de descansos. El director de juego valida estos eventos.
- Las acciones de aventura no guardan un diario histórico; se conserva su estado final. El inventario sigue utilizando su propio diario de operaciones.

## Subir a GitHub

```powershell
git status
git add apps/web/src/app/page.tsx apps/web/src/app/globals.css "apps/web/src/app/api/characters/[id]/route.ts" apps/web/src/components/PlayPanel.tsx apps/web/src/components/SaveLoadPanel.tsx packages/rules-engine/src/adventure.ts packages/rules-engine/src/persistence.ts packages/rules-engine/src/index.ts packages/rules-engine/tests/adventure.test.ts packages/rules-engine/tests/persistence.test.ts docs/implementation/PASO_14.md
git commit -m "feat: guardar estado de partida del Guerrero"
git push
```

No subas `.env` ni `apps/web/.env.local`.
