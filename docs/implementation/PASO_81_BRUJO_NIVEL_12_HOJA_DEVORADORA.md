# Actualización 81 — Brujo Infernal nivel 12: Hoja devoradora y mejora de característica

**Proyecto:** CRÓNICAS · constructor de personajes D&D 2024.  
**Fecha de trabajo:** 26 de noviembre de 2026.  
**Alcance:** Brujo de nivel 11 a nivel 12 y descenso 12→11, sin modificar diseños compartidos ni el catálogo general de conjuros.

## 1. Objetivo y decisiones de análisis

- Mantener las siete pestañas y los componentes `SharedPrincipalSheet`, `TraitsPanel`, `SharedSpellsLayout`, `SpellLibraryPanel` y `LevelDownDialog` idénticos entre clases. Solo cambian los datos que alimentan las vistas y las acciones del Brujo.
- Reutilizar **exactamente** `LevelUpDialogFrame`, sus tres pasos y las tarjetas `WizardSpellDetails`. Mismo buscador, confirmación y `LevelUpHitPointsPicker` (media de 5 PG o tirada d8).
- En nivel 12 el Brujo pasa de **7 a 8 invocaciones sobrenaturales**; puede reemplazar otra como máximo, conservando al menos seis de las siete anteriores.
- Añadir la dote **Mejora de característica** (+2 en una característica o +1 en dos distintas, sin superar 20) y recalcular derivados pasivos, incluidos PG por Constitución.
- Mantener **4 trucos, 11 preparados ordinarios, 3 ranuras de Magia de Pacto de nivel 5 y Arcanum místico de nivel 6**. Se permite sustituir un truco, un preparado y el conjuro del Arcanum dentro de su nivel reglamentario; el uso gastado del Arcanum no se recarga por subir de nivel.
- Añadir **Hoja devoradora** (Devouring Blade), con requisitos `thirsting_blade` y, transitivamente, `pact_of_blade`. Cuando el arma del pacto está equipada y se usa la acción de Atacar, el botón del módulo ya existente ofrece **tres tiradas de ataque independientes**, frente a dos con Hoja sedienta. Los daños se siguen gestionando por separado mediante `WeaponRollCards`.

## 2. Archivos, responsabilidades y extensiones

| Archivo | Función del cambio |
| --- | --- |
| `packages/rules-engine/src/warlock.ts` | Catálogo y requisito de Hoja devoradora; nivel 12, tercera ASI, máximo PG, ocho invocaciones; historial validado y campos admitidos en el snapshot de versión 4. Corrección de `level7History` en la lista de campos persistibles. |
| `packages/rules-engine/src/warlock-level-up.ts` | Elecciones de la transición 11→12, guardado del historial exacto del nivel 11 y vista previa de descenso reversible 12→11. |
| `packages/rules-engine/src/warlock-traits.ts` | Ficha de tercera Mejora de característica y descripción contextual de los tres ataques de Hoja devoradora. |
| `apps/web/src/components/WarlockLevelUpWizard.tsx` | Amplía el mismo marco de tres pasos con el selector de ASI, octava invocación y Arcanum, manteniendo tarjetas, filtros y selector de dado. |
| `apps/web/src/components/WarlockAttacks.tsx` | El botón **Atacar ×2 / ×3** usa `WeaponRollCards`, manteniendo el arma del pacto equipada como condición necesaria. |
| `apps/web/src/app/warlock/page.tsx` | Abre subida hasta nivel 12, muestra 8 invocaciones y actualiza la indicación del siguiente nivel. |
| `packages/rules-engine/tests/warlock-level-12-81.test.ts` | Casos de subida, prerrequisitos, topes, daño/PG, persistencia, Arcanum y descenso. |

## 3. Persistencia y reversibilidad

`level12History` registra los siete rasgos elegidos previamente, trucos, preparaciones, dote opcional, elección de arma/Libro del Pacto, familiar, defensas y Arcanum original. `level12Improvement` y `level12HitDieRoll` registran la mejora y la tirada de PG. No se incrementa la versión de esquema (`schemaVersion: 4`), ya que las entradas antiguas siguen siendo válidas y los campos son opcionales por nivel.

Al confirmar la subida, se conserva el **daño acumulado** cuando cambian los PG máximos; no se regalan descansos ni se resetean los gastos de las tres ranuras o el Arcanum. La bajada restaura la fotografía exacta de las elecciones de nivel 11 y revierte el aumento de Constitución sobre todos los dados de golpe anteriores; ajusta PG actuales y los usos de Suerte del Oscuro a las estadísticas resultantes.

## 4. Comprobaciones y límites de este entorno

- Se ejecutó el script incremental `_warlock81_smoke.mjs`, con comprobaciones de características, ocho invocaciones, máximos de PG, topes de puntuaciones, requisitos de Hoja devoradora, Arcanum usado, serialización y 12→11→10 reversible.
- Se ejecutaron doce comprobaciones de humo existentes de Brujo (desde la base a nivel 12) sin fallos.
- Se incorporan pruebas Vitest replicables en `warlock-level-12-81.test.ts` para la instalación completa.
- En esta copia incremental de trabajo no existen `package.json` ni `node_modules`; por eso **no se declara que el build completo, lint ni Vitest se hayan ejecutado aquí**. Deben comprobarse en el repositorio real.

Desde la raíz del repositorio del usuario, en PowerShell, ejecutar **una orden por línea**:

```powershell
pnpm --filter @dnd/rules-engine test
pnpm --filter @dnd/web lint
pnpm build
```

## 5. Continuación propuesta

La siguiente ampliación sería **Brujo Infernal nivel 13** (Arcanum místico de nivel 7 y progresión de conjuros). Antes de programarla, cotejar fuentes oficiales 2024 y conservar esta política de historia reversible y diseño común. La biblioteca general de magia seguirá compartida.

**Apunte para el TFG:** este paso ejemplifica un patrón de extensibilidad: el motor de reglas proporciona datos específicos de clase, mientras las vistas y la persistencia exponen una arquitectura estable. La prueba de regresión de la progresión descendente protege la integridad histórica de las decisiones del jugador.
