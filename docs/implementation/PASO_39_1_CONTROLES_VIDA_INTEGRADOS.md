# Ajuste 39.1: controles integrados de PG y PG temporales

**Fecha de preparación:** 12 de noviembre de 2026. **Estado:** implementación preparada y revisada parcialmente; pendiente de aceptación local y commit del autor. **Ámbito:** corrección de interfaz de la actualización 39, sin comenzar la fase 40.

## Solicitud y justificación

El control de PG de la fase 39 requería seleccionar una cantidad y después pulsar botones separados «Registrar daño», «Curar» y «Recibir PG temporales». El jugador solicitó una interacción más directa: ajustes numéricos con signo, controles arriba/abajo y PG temporales visibles inmediatamente al lado de los actuales.

## Decisiones

**ADR-035. Ajustes firmados directamente en la tarjeta.** Las dos cantidades aparecen juntas dentro de la tarjeta superior «PUNTOS DE GOLPE». Cada una tiene lectura del valor actual, campo de variación firmada y flechas ▲/▼. Teclear `+5` o `5` y pulsar Intro o salir del campo suma 5; teclear `-5` resta 5. Las flechas y las teclas ↑/↓ aplican un punto por pulsación inmediatamente. Escape cancela el texto pendiente. No hay botones independientes «Curar» y «Registrar daño». La tarjeta incluye los dados de golpe que ya mostraba antes.

**ADR-036. Respetar el motor de daño.** En los PG actuales, la cantidad positiva llama a `heal` y la negativa a `damage`. Esto preserva límites máximos, absorción por PG temporales, concentración, inconsciencia, salvaciones de muerte y muerte por daño masivo. El texto aclaratorio informa al jugador de que el daño consume primero los PG temporales.

**ADR-037. Distinguir asignar PG temporales de corregir el contador.** La acción **existente** `temporary_hp` se mantiene y continúa impidiendo que se acumulen PG temporales procedentes de efectos: conserva el valor mayor. La acción nueva `adjust_temporary_hp` se destina **exclusivamente a correcciones manuales firmadas** del contador. No representa la concesión de un nuevo efecto mágico. Por ejemplo, pasar de 5 temporales a 8 mediante `+3` es una corrección manual del estado, no una regla que autorice acumular PG temporales procedentes de dos efectos distintos. Los ajustes negativos de PG temporales no quitan PG normales. La validación exige valores enteros no nulos entre -100000 y +100000, y el contador resultante se limita a 0–100000.

**ADR-038. Un único estado persistente.** El estado de PG leído por la tarjeta procede de `AdventureState`. Los inputs guardan solamente un *borrador de la variación*, no una copia del estado del personaje. El controlador padre llama a `applyAdventureAction` y actualiza la misma sesión existente. Se conserva el mecanismo de guardado manual; no cambia el esquema de base de datos ni `schemaVersion`.

**ADR-039. Mantener acciones especiales explícitas.** Las opciones «Daño crítico mientras estás a 0 PG» y «Aplicar Fortaleza épica al curar» permanecen como casillas contextuales. Segundo aliento, Acción súbita, Indomable e Inspiración heroica siguen en sus módulos anteriores sin cambios.

## Archivos afectados

- `apps/web/src/components/PrincipalSessionControls.tsx`: formulario de PG sustituido por dos ajustadores firmados integrados, con entrada, teclado y flechas.
- `apps/web/src/components/PrincipalOverview.tsx`: inserta los controles dentro de la tarjeta superior y hace que el controlador notifique si una operación fue aceptada o rechazada.
- `apps/web/src/app/globals.css`: distribución contigua, flechas, foco visible y adaptación móvil.
- `packages/rules-engine/src/adventure.ts`: acción pura validada `adjust_temporary_hp`.
- `packages/rules-engine/tests/session-controls.test.ts`: escenarios de variaciones, límites, validación, conservación y reglas existentes.
- `docs/implementation/PASO_39_1_CONTROLES_VIDA_INTEGRADOS.md`: este registro.

No cambian `package.json`, `pnpm-lock.yaml`, Prisma, APIs, las reglas existentes de daño/curación, la hoja calculada ni los demás controles de la fase 39.

## Comprobaciones realizadas en el entorno de preparación

- TypeScript del web (tsconfig de chequeo parcial), sin errores.
- TypeScript estricto del motor y transpilación de sus módulos, sin errores.
- Renderizado React aislado: aparecen los dos ajustadores, las demás secciones de la hoja, 6 características y 18 habilidades; estado inválido/desincronizado protegido.
- 14 pruebas directas del motor original, sin regresiones observadas.
- Pruebas directas suplementarias de cambio manual, límite, absorción de daño y persistencia v2, superadas.
- **Pendiente:** `pnpm lint`, `pnpm test`, `pnpm build` completos en el entorno local; pruebas de interacción en navegador con ratón, teclado y móvil. Vitest no se ejecutó aquí porque faltaba una dependencia transitiva en el entorno aislado.

## Pruebas manuales de aceptación

1. En Principal, comprobar los dos valores de vida contiguos con sus flechas.
2. Pulsar ▲ en PG actuales estando por debajo del máximo: debe curar 1. Pulsar ▼: registra 1 de daño sin botón extra.
3. Escribir `-7` y pulsar Intro: debe aplicar 7 de daño, absorbiendo primero los temporales. Escribir `+4` y pulsar Intro: debe curar 4 sin superar el máximo.
4. Escribir `+5` en temporales: aumenta el contador en 5; escribir `-2`: lo reduce en 2. Las flechas modifican 1 cada vez, sin alterar directamente los PG normales.
5. Con 4 temporales, registrar `-6` en actuales: debe dejar 0 temporales y perder 2 PG normales.
6. A 0 PG, verificar que aparece la casilla de daño crítico y que el motor conserva las consecuencias de nuevas fuentes de daño.
7. Comprobar que no se aceptan decimales ni valores fuera del rango y que los errores son visibles.
8. Repetir con tabulador, Intro, Escape y ↑/↓; comprobar que los controles están bloqueados si la sesión está desincronizada.
9. Abrir y revisar las herramientas anteriores. Guardar personaje, recargar y comprobar ambos contadores.
10. Ejecutar `pnpm lint`, `pnpm test`, `pnpm build` y revisar vista móvil.

## Subida selectiva a GitHub

Añadir solo los seis archivos de este ajuste con `git add -- <rutas>`, revisar `git diff --cached --name-only` y `git diff --cached --check`, confirmar con un commit independiente y ejecutar `git push -u origin HEAD`.

## Límites

El ajuste de PG temporales es un mecanismo **manual de registro** y no crea ni aplica automáticamente efectos, hechizos, duración o fuentes de PG temporales. Las decisiones de combate siguen correspondiendo a los jugadores. La persistencia en PostgreSQL requiere actualizar el guardado, como antes.
