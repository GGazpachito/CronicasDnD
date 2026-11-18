# Paso 62 — Mago nivel 19: Beneficio épico y segunda ranura de nivel 6

Fecha: **18/11/2026**. Repositorio: `GGazpachito/dnd-character-builder`, rama `main`. Base de entrega: actualización 61, commit `c6dadf4d36052d9e4353c81e86e4b71195eb0a92`.

## Objetivo

Incorporar la progresión **18→19** del Mago (Evocación), con selección explícita de un **Beneficio épico**, sus efectos pasivos derivados, un asistente para resolver una de las tiradas de dicho beneficio, guardado y carga, y retroceso **19→18** sin eliminar rasgos ganados en niveles anteriores.

La herramienta **no juega por el usuario**: calcula cifras pasivas y proporciona los dados necesarios, pero no lanza conjuros, no gasta ranuras automáticamente, no aplica curaciones, no decide acciones ni cambia resultados de ataques sin confirmación del jugador.

## Reglas integradas: D&D 2024

| Dato | Nivel 18 | Nivel 19 |
| --- | ---: | ---: |
| Competencia | +6 | +6 |
| Trucos de Mago | 5 | 5 |
| Libro de conjuros ordinario | 40 | **42** |
| Preparados ordinarios | 23 | **24** |
| Maestrías siempre preparadas adicionales | 2 | **2**, conservadas |
| Ranuras de nivel 6 | 1 | **2** |
| Ranuras de niveles 1–9 | 4/3/3/3/3/1/1/1/1 | **4/3/3/3/3/2/1/1/1** |
| Beneficio épico | Ninguno | **Uno**, con +1 a característica (máximo 30) |

El rasgo de nivel 19 permite elegir una dote de Beneficio épico u otra dote compatible. Igual que ocurre en el Guerrero del proyecto, **el catálogo de dotes todavía es parcial**: esta versión ofrece cinco beneficios épicos implementados, con validación de la característica elegida.

| Beneficio | Cálculo pasivo o apoyo implementado | Gestión manual |
| --- | --- | --- |
| **Recuperación de conjuros** (*Boon of Spell Recall*, opción recomendada) | +1 a Inteligencia, Sabiduría o Carisma, hasta 30. Panel que tira 1d4 para ranuras gastadas al lanzar conjuros de niveles 1–4. La ranura se conserva si el dado **iguala su nivel**. | El jugador declara el conjuro y marca o no su ranura según el dado; no se alteran rombos en automático. |
| **Fortaleza** (*Boon of Fortitude*) | +1 a una característica, hasta 30, y **+40 PG máximos**. Constitución actualizada en todas las estadísticas derivadas. | Cuando recibe curación, el jugador puede sumar adicionalmente su modificador de Constitución y registra los PG. |
| **Velocidad** (*Boon of Speed*) | +1 a una característica, hasta 30, y **+30 pies de velocidad**. | Usar Destrabarse como acción adicional y terminar Agarrado se resuelve en mesa. |
| **Pericia en combate** (*Boon of Combat Prowess*) | +1 a una característica, hasta 30. Se informa del rasgo. | Permite convertir un fallo de ataque en un impacto; recupera la opción al comenzar el siguiente turno. |
| **Visión verdadera** (*Boon of Truesight*) | +1 a una característica, hasta 30, y **60 pies de Visión verdadera**, que se muestran en Principal y Rasgos. | Interpretación de lo percibido con el director de juego. |

La opción Recuperación de conjuros tiene requisito de **nivel 19 y aptitud de lanzar conjuros**, cubierto por Mago. Por ello este beneficio no se ha añadido indiscriminadamente al catálogo del Guerrero.

Referencias primarias del reglamento:

- [D&D Beyond — Free Rules 2024: clases y tabla de Mago](https://www.dndbeyond.com/sources/dnd/free-rules/character-classes).
- [D&D Beyond — Free Rules 2024: Feats / Epic Boon Feats](https://www.dndbeyond.com/sources/dnd/free-rules/feats).

## Decisiones de arquitectura

1. **Módulo de reglas separado**: `wizard-epic-boons.ts` reutiliza `EPIC_BOONS` y `applyEpicBoon` del Guerrero para las tres opciones compartidas, y aporta Recuperación de conjuros y Visión verdadera únicamente al Mago. `wizardSpellRecallResult` es pura y determinista, sin estado ni efectos secundarios.
2. **Datos persistentes mínimos**: se incorpora `epicBoon: {id,ability}` a `GuidedWizardInput`, obligatorio a nivel 19 y prohibido antes. Se conserva el esquema de snapshot **v3**; no se requieren migraciones de base de datos para guardar esta propiedad opcional.
3. **Estadísticas derivadas**: `calculateGuidedWizard` calcula el +1 antes de derivar modificadores, salvaciones, habilidades, CD de conjuro, ataque, iniciativa y PG. Además aplica +40 PG, +30 pies de movimiento o Visión verdadera cuando corresponde. La puntuación que aumenta por dote puede alcanzar **30**, a diferencia de las mejoras generales anteriores, limitadas a 20.
4. **Subida atómica**: `prepareWizardLevelUp` valida los dos conjuros ordinarios, los **24 preparados** y el Beneficio épico. Conserva las Maestrías del nivel 18, la Evocación gratuita del 17, el equipo y los marcadores. El segundo espacio de nivel 6 empieza disponible.
5. **Interfaz consistente**: el diálogo de tres pasos describe el nuevo nivel, deja elegir entre cinco beneficios y seleccionar la característica válida y presenta una revisión de los efectos. En **Principal** se muestra el beneficio; en **Rasgos**, sus reglas y automatización parcial; en **Hechizos**, el panel del d4 si se eligió Recuperación.
6. **Retroceso seguro 19→18**: `previewWizardLevelDown` elimina la dote, el +1, los dos conjuros nuevos y la segunda ranura de nivel 6. Conserva ambas Maestrías, los 40 conjuros adquiridos hasta el 18, la Evocación del 17, las ranuras existentes y su estado gastado, la inspiración, el inventario, el perfil y el daño compatible. Se documentan los cambios de PG, velocidad y sentidos.
7. **Compatibilidad de pruebas**: la prueba de nivel 18 se modifica para esperar la nueva subida disponible a nivel 19. Se mantiene el comportamiento de la versión 61 para 18→17 y descanso largo.

## Pruebas de regresión

`packages/rules-engine/tests/wizard-level-19-62.test.ts` cubre:

1. Subida real desde nivel 1 hasta 19, con tabla de ranuras exacta, preparación, número de trucos, 42 conjuros y las Maestrías existentes.
2. Validación del beneficio obligatorio, prohibición antes del 19, incompatibilidades de característica, opciones desconocidas y límite de 30.
3. Valores pasivos de los cinco beneficios y presencia de la Visión verdadera en Rasgos.
4. Tirada determinista de Recuperación y rechazo de dados o niveles de ranura imposibles.
5. Serialización y validación del guardado con beneficio, Maestrías y ranuras gastadas.
6. Retroceso **19→18** con conservación de herida, Maestrías y ranura de nivel 6 anterior gastada, descartando el excedente.

### Pruebas a ejecutar en el repositorio completo

```cmd
pnpm --filter @dnd/rules-engine test
pnpm build
```

Los archivos se entregan en ZIP para aplicar sobre la rama `main` **después de integrar y guardar la actualización 61**. Esta sesión contiene una copia parcial de los archivos modificados, no el árbol completo con las dependencias de Vitest y Next.js; por ello las pruebas finales deben ejecutarse en la copia local completa del usuario.

## Verificaciones manuales sugeridas

1. Cargar un Mago Evocador de nivel **18**, con nombre, conjuros y las dos Maestrías correctamente elegidos. Comprobar que aparece **Subir de nivel**.
2. Abrir 18→19. Verificar **23→24 preparados**, libro **40→42** y ranuras de nivel 6 **1→2**; competencia +6 y cinco trucos sin cambios.
3. Elegir dos conjuros nuevos, por ejemplo **Polimorfar verdadero** y **Cambiar de forma**, y preparar uno. Seleccionar **Recuperación de conjuros** y **Inteligencia +1**. Confirmar el aumento de característica en la revisión.
4. En **Principal**, ver el Beneficio épico. En **Rasgos**, comprobar la descripción. En **Hechizos**, seleccionar una ranura de nivel 1–4, tirar **1d4** y verificar que la interfaz indica conservarla solo si **dado = nivel de ranura**. El rombo **no debe cambiar solo**.
5. Regresar a nivel 18 mediante retroceso y repetir la subida con **Fortaleza**: comprobar que el máximo de PG sube **40 adicionales** al incremento normal de nivel; la curación sigue siendo manual.
6. Repetir con **Velocidad** y con **Visión verdadera**, comprobando respectivamente el +30 pies en Principal y el sentido de 60 pies en Principal y Rasgos. **Pericia en combate** debe describirse sin marcar impactos por sí misma.
7. Gastar el **segundo** espacio de nivel 6 y uno de nivel 9, guardar y recargar el personaje. Confirmar beneficio, Maestrías, libro y marcas.
8. Bajar **19→18**: desaparecen dote, +1, dos conjuros del 19 y ranura sobrante de nivel 6; permanecen ambas Maestrías de nivel 18 y la primera ranura de nivel 6 con su marca. El daño se conserva en la medida posible.
9. Comprobar que en nivel **19** no se habilita todavía la subida a 20.

## Archivos del parche

**Nuevos**:

- `packages/rules-engine/src/wizard-epic-boons.ts`
- `packages/rules-engine/tests/wizard-level-19-62.test.ts`
- `docs/implementation/PASO_62_MAGO_NIVEL_19_BENEFICIO_EPICO.md`

**Modificados**:

- `packages/rules-engine/src/wizard-creation.ts`
- `packages/rules-engine/src/wizard-level-up.ts`
- `packages/rules-engine/src/level-down.ts`
- `packages/rules-engine/src/wizard-traits.ts`
- `packages/rules-engine/tests/wizard-level-18-61.test.ts`
- `apps/web/src/components/WizardLevelUpWizard.tsx`
- `apps/web/src/app/wizard/page.tsx`

## Próximo paso: actualización 63 — Mago nivel 20

Incorporar **Conjuros de firma** (*Signature Spells*): elegir dos conjuros del libro de nivel 3, que estén siempre preparados y admitan un lanzamiento gratuito de cada uno por descanso corto o largo, sin automatizar las decisiones activas. Se completará así el recorrido del Mago hasta el nivel 20 y se planificarán verificaciones integrales de la clase y la documentación del TFG.

## Trazabilidad para el TFG

El cambio documenta la reutilización de lógica entre clases, la validación contextual de requisitos de dotes, el control de límites de características según origen de la mejora, la distinción entre efectos pasivos y decisiones activas del jugador, la ampliación compatible de snapshots, la persistencia manual de recursos y las regresiones al retroceder de nivel. La interfaz se mantiene como hoja de personaje y soporte de tiradas, no como videojuego.
