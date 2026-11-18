# Paso 61 — Mago nivel 18: Maestría de conjuros y descanso largo

Fecha: **18/11/2026**. Repositorio: `GGazpachito/dnd-character-builder`, rama `main`. Base comprobada: actualización 60, commit `b3f5cd899d5f2f7377754e72d199d354a542d2b9`.

## Objetivo y alcance

Completar la progresión guiada del **Mago Evocador hasta el nivel 18** con el rasgo **Maestría de conjuros**, su representación en la hoja, la modificación opcional durante un descanso largo, la persistencia del estado y el retroceso seguro al nivel 17. Se entrega un solo nivel porque combina una selección reglamentaria nueva y una interacción con el descanso que requiere verificación específica.

Se preserva el principio de arquitectura del proyecto: la web automatiza estadísticas pasivas, muestra fichas y facilita dados; el jugador decide objetivos, acciones, aplicación de efectos y cuándo declara descansos.

## Reglas: manual 2024

| Dato | Nivel 17 | Nivel 18 |
| --- | ---: | ---: |
| Bonificador de competencia | +6 | +6 |
| Trucos conocidos | 5 | 5 |
| Conjuros ordinarios del libro por progresión | 38 | **40** |
| Conjuros preparados regulares | 22 | **23** |
| Conjuros **siempre preparados** por Maestría | 0 | **2 adicionales** |
| Ranuras (niveles 1–9) | 4/3/3/3/2/1/1/1/1 | **4/3/3/3/3/1/1/1/1** |

El rasgo permite elegir **uno de nivel 1 y uno de nivel 2** del libro que tengan tiempo de lanzamiento **de una acción**. Se consideran elegibles los conjuros cuyo tiempo diga «Acción o Ritual», pues pueden lanzarse de la primera manera. No son elegibles reacciones, acciones adicionales ni conjuros que exijan un minuto o más para su lanzamiento normal.

Los dos elegidos permanecen **siempre preparados** y pueden lanzarse **sin gastar ranura** únicamente a su nivel mínimo. Si se quieren potenciar con una ranura superior, esta sí debe gastarse. Cuando el jugador termina un **descanso largo**, puede cambiar **uno solo de ellos** por otro conjuro del libro del **mismo nivel** que se lance con una acción; también puede mantener ambos.

No se obtiene una Evocación gratuita adicional, porque el nivel máximo de ranura continúa siendo **9** (ya desbloqueado en 17). La ranura nueva de nivel **5** empieza disponible y las ranuras previamente gastadas mantienen su estado.

Fuente primaria: [D&D Beyond, Basic Rules 2024 — Mago, rasgo *Spell Mastery* y tabla de progresión](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes). Verificación de tiempos de lanzamiento: [descripciones oficiales de conjuros](https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions).

## Decisiones de diseño

### Motor y validación

- `wizard.ts` ya incluye las 20 filas de progresión y la estructura `alwaysPreparedIds`; se aclara la descripción del rasgo de nivel 18. La elección se valida a través del motor existente de `validateWizardSpellChoices`.
- `wizard-creation.ts` se amplía a **niveles 1–18** y añade `spellMasteryIds` (tupla ordenada: nivel 1 y nivel 2). Se rechaza este campo antes del 18. El cálculo diferencia los **23 preparados ordinarios** de los **2 siempre preparados**.
- `wizard-mastery.ts`, nuevo módulo puro, clasifica los tiempos de los 70 conjuros de niveles 1–2. Las excepciones a «Acción» están centralizadas para evitar dependencias circulares con el catálogo visual de fichas. Una prueba comprueba que la clasificación coincide con los metadatos ya documentados de las 70 fichas.
- `wizard-level-up.ts` incorpora la subida **17→18**, exige las dos elecciones válidas y ofrece `wizardMasteryAlternatives` y `wizardReplaceMasteryAfterLongRest` para verificar sustituciones del mismo nivel. La sustitución no modifica los conjuros ordinarios, los preparados reglamentarios ni el consumo de ranuras.
- El guardado continúa usando **`schemaVersion:3`**: `spellMasteryIds` es un campo opcional nuevo y no cambia los guardados de niveles anteriores.

### Interfaz y descanso

- `WizardLevelUpWizard.tsx`: explica la Maestría, permite elegir cada conjuro por separado, ofrece sus fichas con tiradas y exige completar ambos campos para confirmar.
- `wizard/page.tsx`: presenta ambos hechizos bajo **Hechizos**, con la indicación «lanzamiento básico gratuito», fichas desplegables y el nuevo máximo de ranuras de nivel 5. Da acceso desde la hoja Principal.
- `WizardMasteryRestDialog.tsx`: cuando un Mago de nivel 18 pulsa **Descanso largo** en cualquiera de las dos pestañas, aparece un único diálogo. Permite **sin cambio / cambiar nivel 1 / cambiar nivel 2**, ofrece solo alternativas del libro válidas y confirma el descanso y el cambio a la vez. **Cancelar** no descansa ni altera el personaje. No se admite sustituir dos conjuros en un mismo diálogo.
- `wizard-spell-library.ts` y `WizardSpellLibrary.tsx`: la biblioteca manual sigue siendo flexible, pero la selección resultante no puede ocultar ni desmarcar los dos conjuros que el rasgo considera siempre preparados. El contador de preparados de progresión continúa siendo 23 y no se incrementa artificialmente al marcar la Maestría.
- **No** se introduce una automatización de lanzamiento gratuito: el personaje no consume ranuras de forma automática al pulsar una tirada. El jugador declara qué hechizo lanza y si usa una ranura superior. La web muestra las opciones y sigue ofreciendo dados.

### Retroceso 18→17

- Se eliminan las elecciones `spellMasteryIds`, el rasgo y sus dos preparaciones automáticas, sin borrar los conjuros que permanecen en el libro por haberse aprendido en niveles anteriores.
- Se retiran los **dos conjuros ordinarios aprendidos al llegar al 18** y se pasa de **23 a 22** preparados reglamentarios.
- Las ranuras de nivel 5 bajan de **3 a 2** y se descarta el estado de la tercera. El resto de ranuras válidas conservan sus marcas gastadas, incluida la de nivel 9.
- Se conservan la Evocación gratuita del 17, la mejora de característica del 16, el inventario, el perfil, el daño compatible, la inspiración y el contador de Sobrecarga.

## Pruebas automatizadas y regresiones

Nuevo archivo: `packages/rules-engine/tests/wizard-level-18-61.test.ts`, con casos de:

1. Correspondencia entre elegibilidad de Maestría y tiempo de lanzamiento documentado para los **70** conjuros de nivel 1 y 2.
2. Subida completa desde nivel 1 hasta **18**, comprobando libro 40, preparados 23 + 2 siempre, ranuras de nivel 5, competencia y rasgos anteriores.
3. Rechazo de ausencia de elección, niveles intercambiados, reacciones, acciones adicionales y conjuros de otro nivel.
4. Sustitución reglamentaria de una Maestría por otra del mismo nivel, sin tocar libro, preparados normales ni ranuras.
5. Inclusión de los conjuros dominados en la biblioteca incluso si la selección manual los omite.
6. Persistencia de los dos conjuros dominados y las ranuras gastadas, y restauración tras descanso largo.
7. Retroceso **18→17** conservando la ranura 9 gastada, el contador de Sobrecarga, la mejora 16 y el regalo 17.

Se adapta una aserción de `wizard-level-17-60.test.ts`: la vista previa desde 17 debe ofrecer ahora la subida al **18** en lugar de terminar allí.

## Verificaciones manuales sugeridas

1. Partir de un Mago Evocador **17**. Pulsar **Subir de nivel**; comprobar preparados **22→23** y ranuras de nivel 5 **2→3**.
2. Añadir dos conjuros normales (por ejemplo, **Presciencia** y **Portal**) y uno de ellos a preparados. En Maestría escoger **Detectar magia** (nivel 1, Acción o Ritual) e **Imagen múltiple** (nivel 2, Acción).
3. Comprobar que **Escudo** (Reacción), **Paso brumoso** (Acción adicional) y **Alarma** (1 minuto) no aparecen como candidatos de Maestría. Debe existir una opción válida para cada nivel.
4. Confirmar 18. Verificar **40 conjuros ordinarios**, **23 preparados normales**, **5 trucos**, **+6 competencia** y ranuras **4/3/3/3/3/1/1/1/1**.
5. En **Hechizos**, comprobar que las dos Maestrías se muestran **siempre preparadas** y gratuitas a nivel mínimo; las tiradas no consumen ranuras ni aplican daño automáticamente.
6. Gastar manualmente una ranura de nivel 9 y la tercera ranura de nivel 5; guardar, recargar y confirmar que permanecen gastadas y que los dos conjuros dominados se conservan.
7. Pulsar **Descanso largo**. Elegir **Mantener ambos** y confirmar. Verificar que las ranuras se restauran, que Sobrecarga se reinicia y que las Maestrías no cambian.
8. Volver a pulsar Descanso largo: elegir **sustituir solo el conjuro de nivel 1**, escoger **Proyectil mágico**, confirmar y verificar el cambio. No debe existir la posibilidad de sustituir dos en la misma confirmación.
9. Cancelar un descanso antes de confirmar y comprobar que no cambia ninguna ranura ni Maestría.
10. Bajar a **17**: deben desaparecer Maestría, dos conjuros ordinarios del 18 y la tercera ranura de nivel 5; deben permanecer la ranura 9 y el regalo de Evocación del 17, la mejora del 16 y Sobrecarga.
11. Comprobar que no se ofrece todavía la subida al **19**.

## Pruebas del proyecto completo

```cmd
pnpm --filter @dnd/rules-engine test
pnpm build
```

Este ZIP está preparado para extracción manual. La copia parcial de trabajo permite validación sintáctica y comprobación del paquete, pero no sustituye la ejecución de Vitest ni de la compilación de Next.js en el repositorio completo.

## Archivos incluidos en el parche

**Nuevos**:

- `packages/rules-engine/src/wizard-mastery.ts`
- `apps/web/src/components/WizardMasteryRestDialog.tsx`
- `packages/rules-engine/tests/wizard-level-18-61.test.ts`
- `docs/implementation/PASO_61_MAGO_NIVEL_18_MAESTRIA_CONJUROS.md`

**Actualizados**:

- `packages/rules-engine/src/wizard.ts`
- `packages/rules-engine/src/wizard-creation.ts`
- `packages/rules-engine/src/wizard-level-up.ts`
- `packages/rules-engine/src/level-down.ts`
- `packages/rules-engine/src/wizard-spell-library.ts`
- `apps/web/src/components/WizardSpellLibrary.tsx`
- `apps/web/src/components/WizardLevelUpWizard.tsx`
- `apps/web/src/app/wizard/page.tsx`
- `packages/rules-engine/tests/wizard-level-17-60.test.ts`

## Siguiente paso: actualización 62, Mago nivel 19

El nivel 19 incorpora la **dote de Beneficio épico**, una nueva decisión de progresión con requisitos, límites y efectos pasivos específicos. Antes de codificarla habrá que acotar las opciones implementables y reutilizar el sistema de dotes del Guerrero cuando sea compatible, sin inventar efectos activos ni alterar las elecciones de niveles anteriores.

## Trazabilidad para el TFG

La actualización aporta un caso de estudio sobre reglas condicionales (tiempo de lanzamiento), datos derivados frente a selección manual, inmutabilidad de progresión, acciones opcionales de descanso, protección de datos al retroceder, compatibilidad de esquemas y pruebas de regresión entre versiones. La separación de la UI del motor permite mantener el criterio de herramienta de apoyo a la partida.
