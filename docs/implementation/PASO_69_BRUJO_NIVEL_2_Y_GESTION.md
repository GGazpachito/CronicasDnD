# Paso 69 · Brujo nivel 2 y gestión de personajes/compañeros

Fecha: 19 de noviembre de 2026. Normativa D&D 2024. Entrega incremental para copiar en la raíz del repositorio antes de confirmar en Git.

## Objetivo y decisiones de diseño

1. Progresión real de Brujo del nivel 1 al 2. La subclase Infernal **no** se adelanta: aparece al nivel 3.
2. Respetar la hoja universal de siete pestañas definida en `docs/architecture/ESTRUCTURA_HOJA_COMUN.md`. Cualquier rasgo específico se incorpora a la extensión del Brujo.
3. Hacer las tiradas de Descarga sobrenatural visualmente equivalentes al resto de los dados de la hoja.
4. Permitir eliminar personajes guardados de forma **explícita y confirmada** en el selector y eliminar compañeros manuales, también con confirmación.
5. Reparar el literal «Guerrero» en Personaje para que dependa de la clase real.

## Reglas implementadas (nivel 2)

- **Invocaciones sobrenaturales**: total de 3, con selección de dos adicionales y posibilidad de sustituir la invocación anterior durante la subida; sin duplicados ni invocaciones de nivel superior. Las invocaciones aparecen en **Rasgos**. Subconjunto nuevo de nivel 2: Descarga agonizante, Vista del diablo, Lanza sobrenatural, Vigor infernal, Lecciones de los Primeros, Máscara de muchos rostros, Visiones brumosas, Salto sobrenatural y Descarga repelente. Las invocaciones del nivel 1 continúan disponibles.
- **Conjuros**: se mantienen dos trucos y se pueden sustituir hasta uno; preparados pasan de 2 a 3, pudiendo reemplazarse hasta uno de los dos antiguos. El catálogo y sus filtros siguen siendo globales: 249 fichas compartidas, sin duplicaciones por clase.
- **Magia de Pacto**: dos ranuras de nivel 1, gastables individualmente; ambos rombos se actualizan y reflejan el mismo estado en **Principal** y **Hechizos**. Ambos se recuperan después de descanso corto o largo.
- **Astucia mágica**: rito de un minuto marcado manualmente, recupera una ranura gastada y consume el único uso; el descanso corto *no* regenera este uso y el largo sí. El botón no ejecuta un conjuro ni impone turnos.
- **PG**: dado de golpe adicional d8 con opción promedio 5 o tirar el dado; añade Constitución y los beneficios pasivos de enano/dote Duro. Conservar daño recibido al subir de nivel.
- **Pactos**: si se mantiene Hoja, el arma vinculada permanece; si se sustituye, se retira ese vínculo. El familiar y el Tomo se mantienen solo cuando está presente su invocación. La pestaña universal de Compañeros no desaparece.
- **Lecciones de los Primeros**: el subconjunto automatizado de dotes de origen disponible es **Alerta / Duro** y se evita la elección de duplicados. Este catálogo de dos dotes es una limitación explícita pendiente de ampliar, no una implementación íntegra de todos los orígenes.
- **Descarga sobrenatural**: ataque d20 y daño 1d10 por rayo presentados en tarjetas de dados; si se eligió Descarga agonizante se suma el modificador de Carisma al daño; Lanza sobrenatural actualiza el alcance y Descarga repelente presenta su decisión narrativa.

## Operaciones de borrado y persistencia

- Personajes: el botón **Eliminar personaje** está fuera del vínculo Abrir. Exige doble interacción (solicitar + confirmar). Envía `DELETE /api/characters/{id}?revision={revision}` al backend existente, que está restringido a desarrollo local. El control de `revision` impide borrar sin advertencia una versión que ha cambiado; la eliminación, una vez confirmada y completada, es **definitiva**.
- Compañeros: se elimina exclusivamente una ficha manual del estado local de su propio personaje, con confirmación; el guardado remoto **no cambia hasta pulsar Guardar cambios**. No elimina familiares garantizados por el Pacto de la Cadena ni compañeros de otro personaje.
- Identidad: `CharacterProfilePanel` es único para las tres clases; ahora exige `characterClass` y renderiza correctamente el valor de cada personaje.

## Archivos y responsabilidad

| Archivo | Función |
| --- | --- |
| `packages/rules-engine/src/warlock.ts` | Reglas, elecciones, rasgos, PG, ranuras, Astucia mágica, guardado compatible. |
| `packages/rules-engine/src/warlock-level-up.ts` | Transición validada del nivel 1 al 2. |
| `packages/rules-engine/src/warlock-traits.ts` | Proyección de tres invocaciones y Astucia mágica en Rasgos. |
| `apps/web/src/components/WarlockLevelUpWizard.tsx` | Ventana de selección de la subida. |
| `apps/web/src/app/warlock/page.tsx` | Composición universal con progresión y recursos correctos. |
| `apps/web/src/components/WarlockAttacks.tsx` | Tarjetas estéticas de cada tirada de Descarga sobrenatural. |
| `apps/web/src/app/load/page.tsx` | Eliminación confirmada de personajes. |
| `apps/web/src/components/SharedCompanionsPanel.tsx` | Eliminación confirmada de compañero manual. |
| `apps/web/src/components/CharacterProfilePanel.tsx` | Clase real del personaje. |
| `apps/web/src/app/fighter/page.tsx` y `apps/web/src/app/wizard/page.tsx` | Propiedad común `characterClass`. |
| `apps/web/src/app/globals.css` | Estilos de confirmaciones, tarjetas de tirada y ventana. |
| `packages/rules-engine/tests/warlock-level-2-69.test.ts` | Regresión matemática, sustituciones, descansos y guardado. |
| `docs/architecture/ESTRUCTURA_HOJA_COMUN.md` | Contrato de interfaz actualizada. |

## Verificación manual en Windows

1. Desde la raíz del monorepo ejecutar `pnpm --filter @dnd/rules-engine test`, `pnpm --filter @dnd/web lint` y `pnpm --filter @dnd/web build` en comandos separados.
2. Crear o cargar un Brujo de nivel 1; elegirlo con Descarga sobrenatural, darle nombre y comprobar que la hoja sigue con una sola ranura y una invocación.
3. Pulsar «Subir al nivel 2», elegir tres invocaciones distintas (una de ellas Descarga agonizante), escoger nuevo conjuro y tirada de PG. Confirmar. Comprobar nivel 2, 3 invocaciones, 3 preparados, 2 ranuras y más PG.
4. En Principal, lanzar Descarga sobrenatural y tirar su daño: resultado en tarjetas con dado, ecuación y total grande; Descarga agonizante debe sumar Carisma.
5. Gastar ambas ranuras, usar Astucia mágica (recupera una), intentar volver a usarla (bloqueado), descansar corto (dos disponibles, Astucia sigue usada), descansar largo (Astucia disponible de nuevo). Comprobar lo mismo en Hechizos.
6. Abrir Personaje en Guerrero, Mago y Brujo y verificar «Guerrero», «Mago», «Brujo» respectivamente y su nivel real.
7. En Compañeros, crear dos fichas manuales, eliminar una confirmando, cancelar otra eliminación, y guardar cambios. Recargar y comprobar que solo queda la ficha correcta.
8. Guardar el Brujo nivel 2, cerrar y cargarlo: verificar selecciones, PG, ranuras y Astucia mágica. Desde Cargar personaje pulsar Eliminar, cancelar primero, luego confirmar para un personaje de prueba: la tarjeta desaparece sin borrar otras.
9. Reabrir personajes antiguos de nivel 1 y confirmar que conservan estado y biblioteca común de conjuros.

## Estado para continuar y TFG

Paso 69: Brujo niveles **1 y 2**, Patrón Infernal aún sin efectos. Mantener esquema de persistencia 4 para Brujo y su compatibilidad. El siguiente paso es **Brujo nivel 3 y Patrón Infernal**: desbloqueo de subclase, progreso de conjuros y ranuras, el rasgo Bendición del Oscuro, decisiones de invocación/preparación y pruebas de regresión. La ficha universal, el selector de personaje y el editor de Compañeros **no deben reproducirse de nuevo**: usar los mismos componentes.

La validación ejecutada en el entorno de elaboración es una prueba de humo de módulos puros de Node. El árbol aislado no contiene dependencias instaladas ni manifiesto del monorepo, por lo que las tres comprobaciones de pnpm quedan pendientes de ejecutar en el clon del usuario.

## Parche 69.1 · Corrección de tipado de recursos

La primera compilación de la actualización 69 detectó el error `TS2322` en `validateWarlockOneState`: TypeScript no podía estrechar los campos opcionales `secondPactSlotSpent` y `magicalCunningUsed` desde `Record<string, unknown>` hasta `boolean`. Tras comprobar que ambos campos son booleanos cuando están presentes, la normalización ahora usa comparaciones estrictas con `true`. La semántica se conserva (ausencia equivale a `false`) y los guardados de nivel 1 siguen sin recibir los campos exclusivos del nivel 2.
