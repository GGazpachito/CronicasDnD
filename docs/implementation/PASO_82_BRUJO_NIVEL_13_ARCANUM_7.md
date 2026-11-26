# Paso 82 — Brujo Infernal 13: Arcanum místico de nivel 7

## Objetivo y alcance

Extender la progresión 1–12 de Brujo Infernal a **nivel 13**, conservando las siete pestañas y todos los componentes de diseño compartidos con Guerrero y Mago. La decisión de partida continúa siendo un apoyo de hoja de personaje: automatiza modificadores pasivos, valida elecciones y permite marcar manualmente los usos; no resuelve las acciones de combate ni el efecto narrativo de los conjuros.

## Contrato reglamentario (D&D 2024)

| Recurso | Nivel 12 | Nivel 13 |
| --- | --- | --- |
| Competencia | +4 | **+5** |
| Trucos de Brujo | 4 | 4 |
| Conjuros ordinarios preparados (niveles 1–5) | 11 | **12** |
| Invocaciones sobrenaturales | 8 | 8 |
| Magia de Pacto | 3 ranuras de nivel 5 | 3 ranuras de nivel 5 |
| Arcanum místico nivel 6 | Uno, 1/descanso largo | Uno, 1/descanso largo |
| Arcanum místico nivel 7 | No disponible | **Uno, 1/descanso largo independiente** |
| Puntos de golpe | 12 dados de golpe d8 | 13 dados de golpe d8 |

El jugador elige uno de **Etereidad** (`etherealness`), **Dedo de la muerte** (`finger_of_death`), **Jaula de fuerza** (`forcecage`) o **Cambio de plano** (`plane_shift`). Se reutilizan las mismas **cuatro instancias `WizardSpellRule`** del catálogo de Mago (`warlockSpellRule(id) === wizardSpellRule(id)`), sin duplicar conjuros, y la biblioteca común las indexa dentro del filtro de Brujo. La preparación ordinaria sigue restringida a los niveles de conjuro 1–5; los dos Arcanum nunca se confunden con esas doce elecciones ni se lanzan gastando ranuras de Pacto.

## Archivos y decisiones técnicas

- `warlock-spells.ts` y `shared-spell-catalog.ts`: IDs y referencias de nivel 7 en la lista de Brujo y biblioteca deduplicada. No crear biblioteca ni fichas separadas.
- `warlock.ts`: admite `level: 13`, competencia +5, preparado ordinario de doce, PG adicionales d8 (5 de media o resultado 1–8) y `mysticArcanum7Id`. El recurso `mysticArcanum7Used` se valida, se consume a demanda y se recupera solo con descanso largo, independientemente de `mysticArcanum6Used`.
- `warlock-level-up.ts`: `advanceWarlockToLevelThirteen` exige Arcanum 7, doce conjuros válidos, ocho invocaciones y cuatro trucos; restringe la sustitución a uno de cada grupo, salvo el nuevo preparado añadido. `level13History` conserva las decisiones exactas de nivel 12, incluido el Arcanum de nivel 6. `previewWarlockLevelDown` elimina los campos de nivel 13, restaura nivel 12, mantiene el gasto anterior de ranuras y usos compatibles y adapta los PG actuales conservando daño tanto como permita el nuevo máximo.
- `warlock-traits.ts`: introduce el rasgo `warlock:mystic_arcanum_7` y corrige el número de preparaciones ordinarias mostrado en rasgos.
- `WarlockLevelUpWizard.tsx`: **mismo `LevelUpDialogFrame` de tres etapas**, `LevelUpHitPointsPicker` d8 y fichas `WizardSpellDetails`. Selector del Arcanum 6 (conservación/sustitución) y nuevo selector del Arcanum 7, ambos filtrables. No se ofrece Mejora de característica al nivel 13.
- `apps/web/src/app/warlock/page.tsx`: añade `mysticArcanum7Panel` exclusivamente a módulos de recursos dentro de Principal, Rasgos y Hechizos; no modifica las pestañas, el contador de vida, la inspiración, el bestiario, el equipo ni los compañeros. El botón de subida permite el paso 12→13.
- Guardados: permanece `schemaVersion: 4`. Campos nuevos opcionales `mysticArcanum7Id`, `level13HitDieRoll`, `level13History` y `mysticArcanum7Used`; rechazados cuando son prematuros o inválidos.

## Verificación y pruebas

El archivo `warlock-level-13-82.test.ts` añade pruebas Vitest de competencia, puntos de golpe (incluyendo el rasgo Enano), preparación, ocho invocaciones, fichas originales de Mago, uso separado de Arcana, descanso corto/largo, guardado/recarga, bajada 13→12 y casos negativos. `_warlock82_smoke.mjs` reproduce el camino real 1→13 con los scripts de la actualización anterior.

En el entorno de preparación incremental se ejecutaron los **13 scripts smoke existentes y nuevos** con Node 24 y finalizaron sin error. No fue posible ejecutar `pnpm --filter @dnd/rules-engine test`, `pnpm --filter @dnd/web lint` ni `pnpm build` aquí porque no está el monorepositorio completo ni sus dependencias; el usuario debe ejecutarlos **en su copia local** tras extraer el ZIP.

## Continuidad y TFG

El **nivel 14 de Brujo Infernal** se deja para el siguiente incremento; incorpora un rasgo nuevo del patrón que requiere diseñar efectos específicos, conservando este mismo marco común. Este paso documenta la distinción entre *catálogo compartido*, *reglas de progresión específicas de clase*, *estado de uso de recursos* y *presentación reutilizada*.
