# Paso 58 — Mago nivel 14 · Sobrecarga (Evocación)

Fecha de preparación: 17/11/2026  
Repositorio: `GGazpachito/dnd-character-builder` · rama `main`  
Punto de partida revisado: actualización 57, commit `e72669634c7e4e4411d51a7c8d5432d5181ff8d8`.

## Alcance de esta entrega

La progresión guiada del Mago se amplía del nivel 13 al **14**, siguiendo el reglamento de 2024. El Evocador obtiene **Sobrecarga**. No se incorporan conjuros de nivel 8: esos corresponderán al nivel 15.

- La subida 13→14 permite escoger **2 conjuros nuevos** de niveles 1–7 y preparar **18** (frente a 17).
- El libro pasa de al menos 30 a **32** conjuros de progresión. Conserva los cinco trucos del Mago y los regalos anteriores de Evocación.
- La competencia sigue siendo **+5** y las ranuras se mantienen **4/3/3/3/2/1/1**; no se concede una nueva ranura de nivel 7.
- El aumento de PG procede de la progresión existente, preservando heridas, equipo y ranuras gastadas.
- La pantalla de subida y la hoja de personaje muestran el rasgo adquirido.

## Regla implementada: Sobrecarga

Solo desde el nivel 14 y al **lanzar un conjuro de Mago que cause daño usando una ranura de nivel 1 a 5**, el jugador puede decidir que el daño causado por ese conjuro **en el turno de su lanzamiento** sea máximo.

El contador `magic.overchannelUses` registra las activaciones **desde el último descanso largo**:

| Activación | Daño necrótico sobre el evocador |
| --- | --- |
| Primera | Ninguno |
| Segunda | `2d12 × nivel de la ranura` |
| Tercera | `3d12 × nivel de la ranura` |
| Cuarta | `4d12 × nivel de la ranura` |
| Posteriores | Sigue aumentando en `1d12 × nivel de la ranura` por uso |

Este daño necrótico ignora **resistencia e inmunidad**.

La interfaz se integra en la pestaña **Hechizos**, con:
1. Contador persistente de usos y consecuencia prevista de la siguiente activación.
2. Selector de nivel de ranura, limitado a 1–5.
3. Casilla de confirmación explícita antes de registrar cada uso.
4. Tirada visible de los d12 de daño necrótico propio, solo desde la segunda activación.
5. Acceso rápido desde el resumen de recursos de **Principal**.

**Límite funcional deliberado:** por las directrices del proyecto, la página no selecciona objetivos, no determina si el conjuro daña a alguien, no gasta una ranura por Sobrecarga y **no resta automáticamente puntos de golpe**. El usuario debe lanzar el conjuro y marcar su ranura en el módulo correspondiente; si procede, aplica el resultado del daño propio en los controles de PG. Tampoco se maximizan automáticamente las tiradas de daño de una ficha de hechizo: la elección de activación es del jugador, y se muestra el recordatorio reglamentario.

## Estado, seguridad y compatibilidad

- `validateWizardOneState` acepta contadores **enteros no negativos y seguros** a nivel 14; no permite usos de Sobrecarga antes del nivel 14.
- `makeWizardCharacterSnapshot` y `validateWizardCharacterSnapshot` conservan los usos al guardar y cargar.
- El descanso largo reinicia `overchannelUses` a 0 gracias al motor ya existente (`wizardLongRest` y `resetWizardSlots`).
- Al bajar **14→13**, el sistema retira los dos conjuros elegidos a nivel 14, restaura los 17 preparados permitidos, retira Sobrecarga y pone su contador a 0. Conserva el regalo de Evocación de nivel 13, las ranuras compatibles, PG temporales, inspiración y elecciones previas.
- Los guardados de niveles anteriores no requieren migración ni actualización manual: el campo `overchannelUses` ya existía en el formato anterior.

## Archivos modificados

| Ruta | Responsabilidad |
| --- | --- |
| `packages/rules-engine/src/wizard-creation.ts` | Tipos y validación 1–14; persistencia de contador |
| `packages/rules-engine/src/wizard-level-up.ts` | Progresión guiada 13→14 |
| `packages/rules-engine/src/level-down.ts` | Retroceso 14→13 y reinicio de Sobrecarga |
| `apps/web/src/app/wizard/page.tsx` | Nueva sección interactiva en Hechizos, recurso en Principal, descanso y carga |
| `apps/web/src/components/WizardLevelUpWizard.tsx` | Explicación de la capacidad en el asistente |
| `packages/rules-engine/tests/wizard-level-13-57.test.ts` | Actualiza expectativa de disponibilidad 13→14 |
| `packages/rules-engine/tests/wizard-level-14-58.test.ts` | Nuevos casos de progresión, contador, guardado y retroceso |
| `docs/implementation/PASO_58_MAGO_NIVEL_14_SOBRECARGA.md` | Trazabilidad técnica y funcional para el TFG |

## Verificaciones para el usuario

Partiendo de un Mago de Evocación de nivel 13 válido:

1. **Subir a 14:** elegir dos conjuros nuevos de niveles 1–7, añadir uno a la preparación y confirmar. Comprobar 32 conjuros de progresión, 18 preparados, competencia +5 y la misma distribución de ranuras.
2. **Consultar Sobrecarga:** abrir Hechizos. La sección solo debe aparecer en nivel 14; el contador empieza en 0.
3. **Activación gratuita:** seleccionar ranura de nivel 3, marcar la confirmación y pulsar el botón. Debe mostrar primer uso, 0 daño necrótico y contador 1; no deben cambiar los PG ni los rombos.
4. **Segundo uso:** elegir ranura de nivel 5 y confirmar. Debe lanzar y mostrar **10d12** de daño necrótico, contador 2 y el aviso de que ignora inmunidad/resistencia. Los PG deben permanecer iguales hasta que el jugador los ajuste.
5. **Tercer uso:** elegir ranura de nivel 1 y confirmar. Debe mostrar **3d12** y contador 3.
6. **Desmarcado:** después de cada activación la casilla debe quedar desmarcada; sin confirmación, el botón queda deshabilitado.
7. **Persistencia:** guardar el personaje y cargarlo de nuevo. El contador debe conservarse.
8. **Descanso largo:** comprobar que los usos vuelven a 0 y las ranuras se restauran.
9. **Bajada a 13:** después de usar Sobrecarga, bajar de 14 a 13; comprobar desaparición de la sección, contador a 0, retirada de los dos conjuros elegidos a nivel 14 y conservación del regalo de nivel 13.
10. **Regresión:** comprobar que el Mago aún puede progresar desde los niveles previos, usar Recuperación arcana, memorizar conjuros y guardar/cargar.

Comandos para ejecutar en el **repositorio completo**, después de copiar los archivos del ZIP:
```cmd
pnpm --filter @dnd/rules-engine test
pnpm build
```

La orden general `pnpm build` regenera el cliente Prisma antes de compilar Next.js, conforme al `package.json` del repositorio. Las pruebas son parte de la entrega, pero deben validarse localmente antes del commit.

## Siguiente actualización propuesta — Paso 59

**Mago nivel 15**: desbloquear la primera ranura de **nivel 8**, añadir el catálogo y las fichas de los conjuros disponibles de ese nivel, permitir dos elecciones de conjuros nuevos y la progresión de preparados correspondiente. Incluir validaciones, pruebas de guardado/retroceso y documentación del TFG. El futuro catálogo debe contrastarse con las fuentes oficiales del reglamento 2024.
