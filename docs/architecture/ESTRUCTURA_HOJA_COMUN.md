# Contrato de arquitectura visual: hoja de personaje CRÓNICAS (actualización 74)

> **DOCUMENTO NORMATIVO PARA TODAS LAS CLASES.** Antes de implementar otra clase o subclase, mantener este contrato. Si un módulo cambia, actualizar el componente común, sus adaptadores y este documento en el mismo cambio. Nunca reproducir bloques JSX específicos de otra clase mediante copia de código.

## Principio rector

La estructura visual, los nombres de pestaña, los controles y los filtros **no dependen de la clase**. Solo pueden variar los datos calculados, las capacidades permitidas por las reglas y las extensiones de clase ubicadas en espacios explícitos. La ficha no sustituye al jugador: cálculos pasivos y tiradas sí; decisiones y acciones se ejecutan manualmente.

## Esqueleto universal de navegación

Implementación: `apps/web/src/components/CharacterTabs.tsx`. Orden e identificadores idénticos:

| Posición | Identificador | Título | Contenido y responsable |
| --- | --- | --- | --- |
| 1 | `principal` | Principal | `SharedPrincipalSheet` + controles compartidos + ranuras/rasgos específicos |
| 2 | `rasgos` | Rasgos | `TraitsPanel`; todos los rasgos, invocaciones y bonificadores por colecciones de reglas; extensiones justificadas por clase |
| 3 | `equipo` | Equipo | `EquipmentPanel`, inventario y equipo equipado; adaptador de clase para equipamiento permitido |
| 4 | `hechizos` | Hechizos | `SharedSpellsLayout` + `SpellLibraryPanel` + catálogo `SHARED_SPELL_RULES`; extras de clase fuera del catálogo |
| 5 | `personaje` | Personaje | `CharacterProfilePanel`, historia, identidad, retrato y notas; parámetros comunes |
| 6 | `companions` | Compañeros | `SharedCompanionsPanel` en **todas** las clases, incluso sin rasgos de invocación; debajo, extensiones específicas |
| 7 | `combate` | Combate | Pestaña universal reservada al futuro sistema, sin alterar las otras pestañas |

Identidad visual compartida en la cabecera (`CharacterHeader`), guardado/carga (`SaveLoadPanel`) y pestañas (`CharacterTabs`). No hacer otra navegación solo para Mago o Brujo. La pantalla común `apps/web/src/app/load/page.tsx` debe mostrar «Abrir» y «Eliminar personaje» como acciones independientes. Borrar exige confirmación y la revisión vigente del registro para no eliminar modificaciones concurrentes.

## Principal: estructura obligatoria

Responsable: `SharedPrincipalSheet.tsx` en Guerrero, Mago y Brujo.

1. Herramientas de tiradas d20: modo normal, ventaja y desventaja; mismas etiquetas y botones.
2. Fila de valores principales: PG actuales/temporales, CA, iniciativa.
3. Características (FUE, DES, CON, INT, SAB, CAR): puntuaciones y modificadores automáticos.
4. Columna de habilidades con entrenamiento, bonificación y tiradas.
5. Columna de salvaciones y tiradas; continuación con **ataques**, **recursos de clase**, **ranuras de conjuro cuando correspondan**.
6. Pie de hoja, orden obligatorio: **Percepción pasiva → Movimiento y origen → Salvaciones de muerte → Inspiración heroica**. Los datos adicionales (p. ej., firma de Mago) pueden añadirse como módulo identificable separado, sin sustituir estos cuatro.
7. Módulos exclusivos de ataques como `WarlockEldritchBlast` son complementos a `SharedPrincipalSheet`: resultados presentados con **`overview-roll-result`, `overview-roll-result-heading`, `overview-roll-dice`, `overview-die` y `overview-roll-formula`**, nunca como una frase diminuta sin jerarquía visual.

Controles: `SharedHealthControls.tsx` para Mago/Brujo y `PrincipalHealthControls` de Guerrero, con el **mismo DOM visible y clases CSS** (`overview-health-inline`, `overview-health-pair`, `overview-hp-stat`, `overview-hp-reading`, `overview-hp-input-group`, `overview-hp-stepper`, `overview-health-hint`). Flechas ▲/▼, entrada de ajuste firmado, Intro, Escape y daño que consume antes PG temporales. El Guerrero conserva opciones especiales como Fortaleza épica en un espacio adicional.

Marcadores: `SharedDeathSavePanel.tsx` para Mago/Brujo, el control equivalente del Guerrero, con 3 éxitos y 3 fallos manuales. `SharedInspirationPanel.tsx` es **el mismo componente** para Guerrero, Mago y Brujo; el Guerrero puede añadir su nota del Campeón mediante `children`.

## Rasgos

- Componente base: `TraitsPanel.tsx`, alimentado por `collectWizardTraits`, `collectWarlockTraits` o el colector de Guerrero.
- Secciones y tarjetas: mismas clases, jerarquía y estados de visualización.
- Diferencias legítimas: características exclusivas (p. ej., invocaciones de Brujo, elección de arma de pacto), siempre bajo un encabezado de extensión identificado y después del panel común.
- Ninguna clase debe omitir de la pestaña rasgos efectos de especie, origen o dotes por reutilizar el panel.

## Equipo

- Componente principal: `EquipmentPanel.tsx` para las tres clases; misma distribución de inventario, equipamiento, opciones y efectos pasivos.
- El cálculo de competencia/bonificadores proviene del motor de reglas correspondiente, no del JSX.
- Ejemplo de extensión: arma vinculada al Pacto de la Hoja, que solo surte efecto si está **equipada**.

## Hechizos: contrato de biblioteca única

**Una sola biblioteca**: `SpellLibraryPanel.tsx` con pestañas Preparados/Disponibles, Aprendidos/Conocidos y **Todos los conjuros**. Todos reciben `SHARED_SPELL_RULES` (`packages/rules-engine/src/shared-spell-catalog.ts`), unión deduplicada del catálogo completo del Mago y del Brujo: **252 fichas únicas** tras el paso 74, con **53 conjuros y trucos de la lista de Brujo** y **seis del Patrón Infernal** (pueden compartir identificador con la lista ordinaria). Los conjuros compartidos mantienen la ficha única del Mago; se agregan fichas nuevas únicamente para los exclusivos que no existían, como `enthrall`, `command` y `hunger_of_hadar`.

1. En **todas las clases**, «Todos los conjuros» permite buscar por nombre/escuela/descripción y filtrar por **lista Mago**, **lista Brujo**, **Patrón Infernal** y nivel 0–9. Por defecto, las listas están marcadas y se ve la unión.
2. El selector de filtros y el detalle del conjuro (`WizardSpellDetails.tsx`) son compartidos, sin variantes visuales por clase.
3. **Ver un conjuro no equivale a poder aprenderlo.** La lista de clase determina permisos; Mago solo puede editar fichas de su lista mediante `editableForSpell`; Brujo nivel 1 elige conjuros en la creación y en el nivel 2 modifica las preparaciones solo durante la subida de nivel; Guerrero consulta hechizos otorgados por origen. No conceder conjuros o ranuras indebidos mediante el catálogo.
4. Las ranuras, descansos, Recuperación arcana, Magia de Pacto y rasgos relacionados van en módulos separados de `SharedSpellsLayout.tsx`, sin reemplazar filtros ni fichas.
5. Al ampliar el catálogo (otras clases o niveles), añadir reglas nuevas al motor y **agregarlas a la unión**, más su lista de clase. Nunca crear una biblioteca duplicada de 27 registros para Brujo.

## Personaje

Componente: `CharacterProfilePanel.tsx`. Campos narrativos, retrato, información de origen y datos personales con persistencia en `profile`. Las clases pasan **obligatoriamente** `characterClass` (`Guerrero`/`Mago`/`Brujo`) y el nivel real junto a origen/especie; nunca escribir «Guerrero» como literal dentro del componente universal. No recrear su disposición para otra clase.

## Compañeros: módulo universal

Componente: `SharedCompanionsPanel.tsx`, modelo y validador: `packages/rules-engine/src/companions.ts`.

Interacciones: selector **Compañero visible**; **Crear compañero** (abre ficha vacía editable); **Editar ficha** (abre borrador); **Guardar ficha** (valida y añade/actualiza), **Cancelar** (no modifica guardado); **Eliminar compañero** (solicita confirmación antes de quitarlo del borrador de personaje). Campos comunes: nombre, tipo/especie, tamaño, desafío, CA, PG actuales/máximos, velocidad, competencia, seis características y modificadores, iniciativa, salvaciones, habilidades, sentidos, idiomas, defensas, ataques (nombre, bono, daño, notas), rasgos, acciones/reacciones, equipo y notas. Hay tiradas d20 para características, iniciativa y ataques; no se automatizan órdenes del compañero ni combate.

Almacenamiento: `input.companions` **opcional** en `GuidedFighterInput`, `GuidedWizardInput`, `GuidedWarlockInput`. Se valida en el motor, admite hasta 20 registros y se conserva en el snapshot existente; guardados anteriores sin `companions` siguen siendo válidos. Las fichas se crean y editan localmente; persisten en la base de datos **cuando el usuario pulsa «Guardar personaje» o «Guardar cambios»**.

Las criaturas concedidas por rasgos no se mezclan con estas fichas manuales. Ejemplo: `WarlockCompanionsPanel.tsx` del Pacto de la Cadena es una extensión **posterior** al editor universal. Desde el paso 71, **todas las fichas visuales de criatura** se presentan mediante `CreatureStatBlock.tsx`: las manuales admiten edición en `SharedCompanionsPanel`, mientras las de Bestiario y de familiar son **referencias no editables** derivadas de una sola ficha de origen.

**Bestiario transversal:** el menú principal añade «Bestiario» (`/bestiary`). Toda clase futura que conceda una criatura deberá consultar `packages/rules-engine/src/bestiary.ts` en lugar de copiar estadísticas. En el Brujo, la forma registrada en `state.familiarForm` proyecta la ficha del catálogo sin ocupar un compañero manual. Contrato obligatorio de catálogo, persistencia y procedencia: [`ARQUITECTURA_BESTIARIO.md`](ARQUITECTURA_BESTIARIO.md).

## Progresión del Brujo: implementación actual

**Actualización 75 (vigente):** la progresión cubre ahora **Brujo 1→6**, con `WarlockLevelUpWizard` y el marco compartido de tres pasos. Al llegar a 6, el Patrón Infernal añade Suerte del Oscuro (1d10 manual tras ver una prueba o salvación, máximo una vez por tirada, usos por Carisma y recarga solo en descanso largo), séptimo preparado ordinario y un d8 de PG; conserva tres trucos, cinco invocaciones, dos ranuras de nivel 3 y los seis conjuros gratuitos del patrón. Se incorpora `level6History` para 6→5 y se mantiene `LevelDownDialog` como única UI de descenso. El módulo `WarlockLuckPanel` es una extensión específica dentro de Principal y Rasgos, sin alterar sus contenedores comunes ni la biblioteca de hechizos. **Las referencias de este apartado a niveles 1–5 describen las fases anteriores, no un nuevo límite.**

**Contrato normativo obligatorio de ventanas de subida y bajada:** consultar [`ARQUITECTURA_PROGRESION_NIVELES.md`](ARQUITECTURA_PROGRESION_NIVELES.md) ANTES de crear una progresión de cualquier clase. `LevelUpDialogFrame` es el único asistente de tres pasos; `LevelDownDialog` es la única ventana de bajada con confirmación; `LevelUpHitPointsPicker` se utiliza en todas las clases (Guerrero d10/6, Mago d6/4, Brujo d8/5). Los nuevos asistentes de magia reutilizan el buscador, `wizard-spell-choice-list` y `WizardSpellDetails`; no deben tener diálogos ni selecciones estilísticas propias.

`WarlockLevelUpWizard.tsx` captura las decisiones de **1→2, 2→3, 3→4 y 4→5** mediante el mismo `LevelUpDialogFrame` que Guerrero y Mago. La validación de transición y bajada reside en `packages/rules-engine/src/warlock-level-up.ts`; `warlock.ts` sigue siendo responsable de validar el snapshot, PG, invocaciones, ranuras, descansos y Astucia mágica. Cada nueva subida usa esta separación de responsabilidades y mantiene exactamente las siete pestañas anteriores. La progresión de nivel 2 admite 3 invocaciones, 2 trucos, 3 conjuros preparados y 2 ranuras de nivel 1. La de nivel 3 conserva 3 invocaciones y 2 trucos, admite 4 preparados ordinarios, 2 ranuras de **nivel de conjuro 2** y concede el Patrón Infernal con **4 conjuros siempre preparados aparte** y **Bendición del Oscuro** (activación manual; valor calculado). La de nivel 4 admite **3 trucos, 5 preparados ordinarios y Mejora de característica**, sin modificar ranuras, y recalcula PG, características, tiradas y efectos pasivos. La de nivel 5 concede **5 invocaciones, 6 preparados ordinarios, 2 ranuras de nivel 3, competencia +3 y seis conjuros de patrón siempre preparados**. `level3History`, `level4History` y `level5History` permiten retroceder desde 3, 4 y 5 conservando elecciones. Las decisiones activas se resuelven por el jugador.

No crear vistas de biblioteca diferentes para Brujo ni reescribir conjuros que ya existan en el Mago. Las invocaciones que alteran directamente Descarga sobrenatural añaden bonificadores al módulo exclusivo sin cambiar los demás módulos compartidos. **Hoja sedienta** y **Castigo sobrenatural** solo se muestran en el arma del pacto *equipada*, sin sustituir el bloque común de ataques. **Investidura del Señor de la Cadena** añade en el módulo específico de familiar el selector persistido de vuelo/nado, la CD y las opciones manuales; la ficha original continúa derivándose del Bestiario, no se duplica.

## Creación de características

Selector único: `AbilityScoreMethodPicker.tsx`, motor `ability-generation.ts`.

- Matriz estándar: 15, 14, 13, 12, 10, 8 sin duplicar valores.
- Compra de puntos: **seis 8 iniciales**, botones ▲/▼, máximo 15 antes del trasfondo; saldo automático de 27 puntos con coste creciente.
- Tirada oficial: **4d6, se descarta el dado menor**; cada característica puede repetir su tirada, se muestran los cuatro dados. El método `d20` se mantiene solo para leer guardados anteriores, no para nuevas tiradas.
- Aumentos de trasfondo (+2/+1 o +1/+1/+1) se aplican después y sin cambiar el método base.

## Lista de comprobación para CADA futura clase/subclase

- [ ] Usa exactamente `CharacterTabs` y sus siete pestañas en el mismo orden.
- [ ] Usa `SharedPrincipalSheet` y controles de salud, muerte e inspiración con mismos estilos y posición.
- [ ] Presenta Percepción pasiva, Movimiento y origen, Salvaciones de muerte e Inspiración, aunque la clase no tenga magia.
- [ ] Usa `TraitsPanel`, `EquipmentPanel` y `CharacterProfilePanel`; este último recibe `characterClass` con la clase real, nunca un literal fijo.
- [ ] Usa `SharedSpellsLayout` + `SpellLibraryPanel` y todo `SHARED_SPELL_RULES`, incluso si la clase no puede lanzar conjuros.
- [ ] Filtros por clase y nivel funcionales; aprende/prepara solo con permisos legales.
- [ ] Usa `SharedCompanionsPanel` con crear/editar/eliminar confirmando y persiste `input.companions`, sin mezclar invocaciones automáticas.
- [ ] Para cualquier familiar o aliado concedido por rasgo, consulta el **Bestiario central** y usa `CreatureStatBlock`; no crees otra fuente de estadísticas ni dupliques las fichas manuales.
- [ ] La lista de carga permite abrir y eliminar personajes por controles distintos y exige confirmación/revisión antes de borrar.
- [ ] Revisa editor de creación, guardado antiguo, guardado nuevo, subida/bajada de nivel y restauración.
- [ ] Reutiliza `LevelUpDialogFrame`, `LevelDownDialog`, `LevelUpHitPointsPicker` y las mismas fichas con buscador de conjuros; respeta el contrato de `ARQUITECTURA_PROGRESION_NIVELES.md`.
- [ ] Pruebas del motor, lint, compilación y comparación visual de las tres clases antes del empaquetado.

**Para el TFG:** esta decisión minimiza deriva visual y duplicación, separa presentación (`components`), reglas (`rules-engine`) y estado persistente (`input`/`state`), y favorece pruebas regresivas por contrato.
