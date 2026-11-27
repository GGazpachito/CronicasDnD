# Paso 89 — Brujo Infernal 16 y contrato unificado de clases

**Fecha:** 27 de noviembre de 2026. **Base de contenido:** SRD 5.2.1, bajo CC BY 4.0. **Alcance:** evolución del Brujo y formalización documental de la creación y edición que deben cumplir Guerrero, Mago, Brujo y futuras clases.

## Decisiones de arquitectura

Los ajustes de creación/edición 88, 88.1 y 88.2 dejan de ser correcciones particulares: constituyen un **contrato transversal obligatorio**. El diálogo `CharacterCreationDialog` recibe el borrador de las elecciones iniciales y no presenta la hoja completa hasta confirmar. Su interior emplea `wizard-editor panel` y `wizard-editor-grid` adaptable en dos columnas: identidad/origen frente a características/competencias; después se añaden las opciones de clase. Guerrero, Mago y Brujo comparten estructura, orden, botón «Guardar elecciones», cancelación y hoja Principal final. Ninguna clase dispone de un segundo editor persistente, otra navegación por pasos o un marco modal propio. El botón de progresión común se llama «Subir de nivel».

La subida sigue el contrato `LevelUpDialogFrame`: novedades → elecciones (con `LevelUpHitPointsPicker` y fichas de reglas) → revisión/confirmación. La bajada usa `LevelDownDialog`, historial reversible y vista previa. **Guardar elecciones en la ventana** solo actualiza el estado de la sesión: persistir en base de datos sigue siendo una acción explícita de `SaveLoadPanel`. Estos elementos permanecerán sin cambios cuando existan módulos autorizados instalables por cuenta.

Normativa y checklist verificable en `docs/architecture/ARQUITECTURA_MODULAR_SRD.md` y `docs/architecture/ARQUITECTURA_PROGRESION_NIVELES.md`.

## Progresión del Brujo: 15 → 16

1. **Mejora de característica:** cuarta mejora, después de las de nivel 4, 8 y 12. Se elige +2 en una característica o +1 en dos diferentes, con máximo 20. El motor aplica el aumento y recalcula los modificadores, PG retroactivos, salvaciones, pruebas y lanzamientos. No se implementan alternativas de dotes generales todavía.
2. **Puntos de golpe:** d8 elegido explícitamente (media 5 o tirada 1d8) más Constitución, mínimo un PG por nivel. Se conserva el daño recibido hasta donde permiten los nuevos máximos. Los efectos de especie por nivel permanecen activos.
3. **Repertorio:** nueve invocaciones, cuatro trucos, trece preparados ordinarios de los niveles 1–5 y tres Arcanum (6, 7 y 8). No aumentan las tres ranuras de Pacto, que siguen en nivel 5, ni la competencia (+5). Se puede sustituir una invocación respetando prerrequisitos, un truco, un preparado y **solo uno** de los tres Arcanum. No se reponen usos de Arcanum ni recursos gastados por subir.
4. **Deshacer:** `level16History` conserva la configuración anterior. `previewWarlockLevelDown` restaura exactamente las elecciones del nivel 15 y revierte la mejora, el dado de golpe y sus efectos pasivos. Los usos, gasto de ranuras, Arrojar al infierno, equipo, compañeros e inspiración siguen conservados.
5. **Persistencia:** `GuidedWarlockInput` incorpora `level16Improvement`, `level16HitDieRoll` y `level16History`, opcionales en el esquema por compatibilidad. `validateWarlockCharacterSnapshot` valida las nuevas entradas, rechaza campos prematuros y conserva `schemaVersion: 4`.

## Ficheros de implementación

| Fichero | Cambio |
| --- | --- |
| `packages/rules-engine/src/warlock.ts` | Validación del nivel 16, dote, PG e historial |
| `packages/rules-engine/src/warlock-level-up.ts` | `advanceWarlockToLevelSixteen` y bajada reversible 16→15 |
| `packages/rules-engine/src/warlock-traits.ts` | Nueva ficha de Mejora de característica en Rasgos |
| `packages/rules-engine/tests/warlock-level-16-89.test.ts` | Pruebas de progresión, intercambio SRD, estados gastados, persistencia, reversión y entradas inválidas |
| `apps/web/src/components/WarlockLevelUpWizard.tsx` | Nueva ruta en asistente existente, selector de mejora, Arcanum, listas y revisión final |
| `apps/web/src/app/warlock/page.tsx`, `apps/web/src/app/create/page.tsx` | Habilitación de subida a 16 y texto de disponibilidad |
| `README.md`, `docs/architecture/*` | Estado de proyecto y estándar común detallado |

## Verificación y continuidad para el TFG

La ejecución local del *runner* de compatibilidad de Vitest, con Node 24 y transformación de TypeScript, confirmó **1.100 casos correctos y 0 fallos**, incluida la nueva batería de nivel 16. No se ejecutaron desde este entorno `pnpm lint` ni `pnpm build`, porque la copia de código recibida no contiene el manifiesto raíz ni las dependencias del monorepo; deben verificarse en el repositorio completo del usuario antes del push.

### Parche 89.1 — Contrato de tipos del nivel calculado

El `next build` del usuario compiló la aplicación, pero falló en el control de TypeScript (`TS2322` en `warlock.ts`): `GuidedWarlockInput.level` ya aceptaba 16 mientras `CalculatedWarlockOne.level` todavía estaba definido manualmente hasta 15. Se corrigió la segunda declaración usando **`GuidedWarlockInput['level']`**, una referencia al contrato de entrada que evita que ambos límites diverjan al incorporar próximos niveles. No cambia ninguna regla ni estado de partida. La compilación completa queda pendiente de validación en el entorno del proyecto.

**Próximo incremento:** Brujo nivel 17. Consultar la tabla del SRD 5.2.1 antes de implementar la nueva capacidad, sin suponer que cualquier material de otros manuales puede añadirse al núcleo; mantener diálogos, hoja común y estado manual. Las otras dotes generales SRD son deuda funcional del núcleo, no contenido de expansión comercial.
