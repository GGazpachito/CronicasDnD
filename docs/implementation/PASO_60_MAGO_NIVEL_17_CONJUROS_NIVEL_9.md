# Paso 60 — Mago nivel 17: conjuros de nivel 9 y Experto en Evocación

Fecha: **18/11/2026**. Repositorio: `GGazpachito/dnd-character-builder`, rama `main`. Base contrastada: actualización 59, commit `2deaf99636bbfb66e7a0c0a3ac74c691fa8b6b8e`.

## Objetivo y alcance

Completar el nivel **17** del Mago Evocador del *Player's Handbook* 2024. Se entrega de forma individual: añade doce conjuros de máximo nivel, algunos con numerosos efectos narrativos y decisiones de mesa. El nivel 18 exige, además, Maestría de conjuros y tratamiento especial de preparados siempre disponibles, por lo que se pospone para el paso 61.

La aplicación sigue siendo un **apoyo a la hoja de personaje**, no un videojuego: automatiza cálculos pasivos, muestra las reglas y ofrece dados; el jugador decide objetivos, recursos y resultados de cada efecto.

## Reglas contrastadas

| Indicador | Mago 16 | Mago 17 |
| --- | ---: | ---: |
| Competencia | +5 | **+6** |
| Trucos conocidos | 5 | 5 |
| Conjuros ordinarios del libro por progresión | 36 | **38** |
| Conjuros preparados reglamentarios | 21 | **22** |
| Ranuras de conjuro (niveles 1→9) | 4/3/3/3/2/1/1/1/0 | **4/3/3/3/2/1/1/1/1** |
| Conjuro gratuito nuevo de Experto en Evocación | — | **1** (niveles 1–9) |

La bonificación +6 repercute en tiradas de ataque, salvaciones y habilidades competentes, así como en ataque mágico y CD. Las características obtenidas en el 16 permanecen. La ranura de nivel 9 se incorpora disponible, sin restaurar las ranuras gastadas de niveles anteriores.

La tradición Evocación concede **un conjuro adicional nuevo de Evocación** al acceder a ranuras de nivel 9, además de los dos conjuros normales del libro. El regalo puede ser de cualquier nivel **1–9** permitido y no puede duplicar un conjuro del libro, otro regalo anterior ni las dos elecciones nuevas.

### Doce conjuros de nivel 9

| Conjuro (identificador) | Escuela | Soporte de dados |
| --- | --- | --- |
| Proyección astral (`astral_projection`) | Nigromancia | Resolución de planos y cuerpos manual |
| Presciencia (`foresight`) | Adivinación | Ventajas/desventajas manuales |
| Portal (`gate`) | Conjuración | Portal y entidades manuales |
| Aprisionamiento (`imprisonment`) | Abjuración | Salvaciones y modalidad manuales |
| Lluvia de meteoritos (`meteor_swarm`) | Evocación | **20d6 fuego + 20d6 contundente** |
| Palabra de poder: matar (`power_word_kill`) | Encantamiento | **12d12** psíquico cuando supera 100 PG |
| Muro prismático (`prismatic_wall`) | Abjuración | Siete capas, efectos manuales |
| Cambiar de forma (`shapechange`) | Transmutación | Forma elegida manualmente |
| Detener el tiempo (`time_stop`) | Transmutación | **1d4+1** turnos |
| Polimorfar verdadero (`true_polymorph`) | Transmutación | Forma, concentración y PG manuales |
| Pesadilla (`weird`) | Ilusión | **10d10** inicial y **5d10** posterior |
| Deseo (`wish`) | Conjuración | Decisión y riesgos manuales |

Todas las fichas incluyen componentes, tiempo de lanzamiento, duración, alcance y resumen **original** en español, con avisos sobre las decisiones del director y los jugadores. El catálogo unificado pasa de **230 a 242** fichas. La ficha de *Lluvia de meteoritos* separa los dos tipos de daño; **no** duplica el efecto cuando un objetivo está en varias esferas. *Deseo* no simula automáticamente la realidad ni la intervención del director. La magia de nivel 9 no se puede aprender antes del 17 por progresión.

Fuentes primarias:

- [D&D Beyond — Basic Rules 2024, clases y tabla del Mago](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes).
- [D&D Beyond — Basic Rules 2024, descripciones de conjuros](https://www.dndbeyond.com/sources/dnd/br-2024/spell-descriptions).

## Diseño de la actualización

### Motor y persistencia

1. `wizard-ninth-level.ts`: nuevo catálogo de doce fichas; las de efectos numéricos incluyen fórmulas de dados compatibles con los componentes existentes.
2. `wizard-creation.ts`: admite Mago **1–17**; añade `evokerLevelNineSpellId` al modelo de entrada y a la lista de claves persistidas, requiere una Evocación nueva desde el 17 y rechaza su uso antes. Mantiene `schemaVersion:3` porque la extensión del guardado es un campo opcional para personajes anteriores.
3. `wizard-level-up.ts`: subida atómica **16→17**; suma dos conjuros ordinarios, uno preparado y el regalo de Evocación; valida duplicados, escuela y nivel; mantiene recursos y las elecciones de nivel 16.
4. `wizard-spell-details.ts`, `wizard-spell-library.ts`, `wizard-traits.ts`: integran las fichas y el nuevo conjuro gratuito en la consulta, la selección manual, Memorizar conjuro y la lista de rasgos.

### Interfaz

- `WizardLevelUpWizard.tsx` muestra ranuras hasta **9**, el avance de competencia y la nueva selección obligatoria de Evocación, con consulta de fichas, revisión final y confirmación.
- `apps/web/src/app/wizard/page.tsx` ofrece la ranura de nivel 9 tanto en **Principal** como en **Hechizos**, con su propio rombo gastado/disponible. Se permite subir de 16 a 17; no se ofrece todavía la subida a 18.
- Se mantiene la decisión del proyecto: tirar un daño no lo resta automáticamente, gastar una ranura no lanza un conjuro y el uso de **Sobrecarga** sigue limitado a ranuras de niveles 1–5. **Recuperación arcana** sigue sin restaurar ranuras de nivel 6 o más.

### Retroceso y compatibilidad

Al bajar **17→16**:

- Desaparecen exactamente los dos conjuros ordinarios obtenidos en el 17 y la Evocación gratuita del 17, incluida su presencia en la biblioteca manual si fue concedida mediante progresión.
- Se pierde la ranura de nivel **9** y su marca de gasto; las de niveles 1–8 conservan su estado, incluso cuando estaban gastadas.
- Se recuperan **21** preparados y se mantiene la mejora de característica del nivel **16** con sus estadísticas derivadas. Esta preservación exige un ajuste explícito en `level-down.ts`.
- Se conservan inventario, perfil, inspiración, marcadores manuales, daño compatible y contador de Sobrecarga; se conservan las reglas de retroceso de los niveles anteriores.

## Pruebas de regresión

Se añade `wizard-level-17-60.test.ts` con una secuencia de subidas reales desde el nivel 1 y casos para:

1. Catálogo de 12 conjuros, sin IDs repetidos, metadatos y fórmulas.
2. Subida 16→17 con recuentos y ranuras reglamentarios, competencia +6 y regalo de Evocación.
3. Rechazo de regalo ausente, duplicado, de escuela errónea, prematuro y mejora de nivel 16 repetida indebidamente.
4. Guardado/carga de nivel 17 con ranuras **8 y 9 gastadas** y contador de Sobrecarga.
5. Inclusión del nuevo regalo en la biblioteca y sustitución mediante **Memorizar conjuro**.
6. Bajada 17→16 con conservación del ASI de nivel 16, ranura 8 y Sobrecarga.

Se actualiza `wizard-levels-15-16-59.test.ts` para admitir ampliaciones futuras del catálogo y esperar que el nivel 16 sí permita acceder al 17. Las demás reglas de nivel 15 y 16 se mantienen.

En una copia completa del repositorio, ejecutar:

```cmd
pnpm --filter @dnd/rules-engine test
pnpm build
```

## Verificación funcional manual

1. Abrir un Mago Evocador **16** con su mejora de característica ya elegida; entrar en **Subir de nivel** y observar el destino 17.
2. Comprobar la tabla: competencia **+5→+6**, preparados **21→22**, ranuras nivel 9 **0→1**.
3. Elegir como conjuros ordinarios **Deseo** y **Detener el tiempo**, preparar **Deseo** y escoger como regalo **Lluvia de meteoritos**. Confirmar.
4. Verificar el libro ordinario de **38**, los **22** preparados, los **5** trucos, la competencia **+6**, y el regalo *Lluvia de meteoritos* en rasgos/biblioteca.
5. En las fichas, comprobar **20d6 + 20d6** para *Lluvia de meteoritos*, **1d4+1** en *Detener el tiempo*, **12d12** en *Palabra de poder: matar* y **10d10 / 5d10** en *Pesadilla*. Las tiradas no deben alterar PG, estados ni objetivos.
6. Marcar gastada la ranura **9** desde Hechizos y comprobar el mismo estado en Principal. Gastar una **8**. Recuperación arcana no debe ofrecer recuperar ninguna de ellas.
7. Activar **Sobrecarga** con una ranura 1–5 y verificar que conserva sus límites habituales y su contador independiente.
8. Guardar en PostgreSQL y recargar: deben persistir nivel 17, selección gratuita, las dos ranuras gastadas y los usos de Sobrecarga.
9. **Bajar al 16**: deben desaparecer *Deseo*, *Detener el tiempo*, *Lluvia de meteoritos* y la ranura 9; la ranura 8, el contador de Sobrecarga y la mejora de nivel 16 permanecen.
10. Desde 16, volver a subir para verificar que el sistema exige un regalo **nuevo** de Evocación. Una vez en 17, no debe poder avanzarse todavía a 18.

## Inventario exacto del parche

**Nuevo:** `packages/rules-engine/src/wizard-ninth-level.ts`, `packages/rules-engine/tests/wizard-level-17-60.test.ts`, `docs/implementation/PASO_60_MAGO_NIVEL_17_CONJUROS_NIVEL_9.md`.

**Modificados:** `packages/rules-engine/src/wizard-creation.ts`, `packages/rules-engine/src/wizard-level-up.ts`, `packages/rules-engine/src/level-down.ts`, `packages/rules-engine/src/wizard-spell-details.ts`, `packages/rules-engine/src/wizard-spell-library.ts`, `packages/rules-engine/src/wizard-traits.ts`, `apps/web/src/app/wizard/page.tsx`, `apps/web/src/components/WizardLevelUpWizard.tsx`, `packages/rules-engine/tests/wizard-levels-15-16-59.test.ts`.

## Siguiente paso — Actualización 61

**Mago nivel 18: Maestría de conjuros**. Selección reglamentaria de un conjuro de nivel 1 y otro de nivel 2 del libro con tiempo de lanzamiento de una acción; siempre preparados y lanzamiento gratuito a nivel básico. Es necesario diseñar los controles de cambio de elección, la persistencia, las tiradas y la reversión a nivel 17 sin confundir preparados normales y siempre preparados. La subida a 18 añade también una ranura de nivel 5 y **23 preparados reglamentarios**.

## Relevancia para el TFG

El paso documenta la extensión progresiva de un modelo de dominio con validación fuerte, la trazabilidad entre reglas oficiales, estados persistentes y pruebas automatizadas, la diferenciación entre decisiones humanas y cálculo pasivo, la compatibilidad de guardados de versiones anteriores y el manejo de reversión de estado ante una bajada de nivel.
