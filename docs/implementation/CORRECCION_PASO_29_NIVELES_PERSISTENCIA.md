# Corrección del paso 29: progresión y persistencia de niveles 7–9

## Problema observado

Al pulsar la flecha derecha desde el nivel 6, en ciertas sesiones el nivel no cambiaba y el personaje seguía guardándose en nivel 6. La función de cambio de nivel cancelaba la operación antes de llamar a `setLevel` cuando el estado de partida ya no coincidía con los PG máximos calculados en la hoja (por ejemplo, tras modificar una mejora de Constitución). La pantalla no distinguía con suficiente claridad entre una subida confirmada y una operación bloqueada. También se exigía elegir un segundo estilo de Campeón para nivel 7, algo que podía pasar inadvertido.

La estructura de guardado ya admitía niveles 7, 8 y 9, pero el guardado no debía considerarse válido hasta consolidar la transición en la hoja **y** la partida. No se ha modificado el esquema de PostgreSQL.

## Cambios implementados

- `packages/rules-engine/src/adventure.ts`: `synchronizeAdventureSheet` reconcilia explícitamente los PG máximos de una **misma** hoja/nivel con el estado de partida. Mantiene el daño sufrido y no reinicia combate, recursos, condiciones, inventario ni historial. Se rechaza un estado perteneciente a un nivel distinto.
- `packages/rules-engine/src/level-up.ts`: `prepareFighterLevelUp` valida las elecciones del nivel de salida, las del nivel de destino, la transición y la instantánea persistible. Solo entonces entrega la hoja y aventura del nivel siguiente.
- `apps/web/src/app/page.tsx`: la flecha derecha utiliza la nueva transacción. Si detecta un estado desincronizado, **pide confirmación** antes de reconciliar y subir. El indicador solo cambia tras superar la validación. Los fallos y elecciones pendientes aparecen junto al selector. La flecha izquierda y su confirmación de reinicio permanecen sin cambios.
- `apps/web/src/components/SaveLoadPanel.tsx`: presenta por separado el nivel actual de la hoja y el nivel de la última versión guardada en PostgreSQL. Tanto el guardado nuevo como la actualización comprueban el nivel devuelto por la API. Los mensajes confirman el nivel efectivamente guardado. La carga rechaza instantáneas con niveles incoherentes.
- `packages/rules-engine/tests/level-save-sync.test.ts`: regresión de subida/guardado/carga 6→7→8→9, sincronización explícita de PG, recursos e historial, cambios de características y rechazo de datos incongruentes.

## Instalación

Combina las carpetas `apps`, `packages` y `docs` del ZIP con las de tu proyecto, reemplazando los archivos indicados. No se necesitan migraciones de Prisma ni un reinicio de los volúmenes de Docker.

Desde la raíz del repositorio:

```powershell
pnpm test
pnpm build
pnpm dev
```

## Verificación manual específica

1. Carga el personaje guardado en nivel 6. En **Mis personajes** comprueba que indica `Nivel en PostgreSQL: 6` y `Nivel en la hoja: 6`.
2. En el paso **Equipo** selecciona un **segundo estilo de combate del Campeón** distinto del primero.
3. En **Identidad** pulsa la flecha derecha. Si los PG máximos cambiaron después de guardar, aparecerá una confirmación de sincronización. Acéptala si las modificaciones de la hoja eran intencionadas.
4. El indicador debe pasar a **NIVEL ACTUAL 7**; la sección **Mis personajes** debe señalar que hay un cambio de nivel sin guardar.
5. Pulsa **Actualizar guardado**. Comprueba el mensaje `Cambios guardados: NIVEL 7` y que `Nivel en PostgreSQL: 7`.
6. Vuelve a cargar el mismo personaje. Debe seguir en nivel 7.
7. Elige la mejora de nivel 8 (si corresponde), sube a 8, guarda y comprueba la carga. Repite en nivel 9.
8. Revisa que el contador de ataques, recursos, daño sufrido, objetos y condiciones no se hayan reiniciado.

**No pulses «Guardar como nuevo» si quieres actualizar el personaje existente**: utiliza «Actualizar guardado». Los guardados son manuales.

## Validación

La revisión local usa TypeScript estricto y un ejecutor compatible con las aserciones del motor; no equivale a una compilación completa de Next.js ni a la ejecución oficial de Vitest. Esas comprobaciones se ejecutan en el ordenador del usuario. El comando de pruebas de Vitest sigue configurado como `vitest run --maxWorkers=2`.
