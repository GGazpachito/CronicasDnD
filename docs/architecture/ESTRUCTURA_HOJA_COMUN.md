# Contrato de arquitectura visual: hoja de personaje CRÓNICAS (actualización 78)

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

**Regla transversal de tiradas con armas (paso 76):** los módulos `BasicWeaponAttacks` (Mago) y `WarlockWeaponAttacks` (Brujo) presentan ataques, daño y efectos de arma con `WeaponRollCards.tsx`, nunca con una cadena única de texto. El contrato de tarjetas muestra encabezado de arma/tirada, dados individuales y dado elegido en ventaja/desventaja, modificador y **total destacado**, fórmula y advertencias de uso manual. `overview-roll-cards`/`overview-dice-card` reutilizan el lenguaje visual de Descarga sobrenatural y el resto de la hoja; el CSS está centralizado en `globals.css`. La clase cambia los bonificadores, poderes y dados, pero no el diseño. Los críticos duplican dados de daño, no modificadores. El castigo del Brujo usa `nivel de ranura + 1` d8 y requiere registrar el gasto de Pacto manualmente.

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

**Una sola biblioteca**: `SpellLibraryPanel.tsx` con pestañas Preparados/Disponibles, Aprendidos/Conocidos y **Todos los conjuros**. Todos reciben `SHARED_SPELL_RULES` (`packages/rules-engine/src/shared-spell-catalog.ts`), unión deduplicada del catálogo completo del Mago y del Brujo: **252 fichas únicas** tras el paso 76, con **59 conjuros y trucos de la lista ordinaria de Brujo** y **ocho del Patrón Infernal** (pueden compartir identificador con la lista ordinaria). Los seis nuevos conjuros de nivel 4 y los dos gratuitos del patrón reutilizan las mismas instancias que Mago, por lo que el catálogo global sigue teniendo 252 fichas. Solo se agregan fichas nuevas para conjuros exclusivos que no existan, como `enthrall`, `command` y `hunger_of_hadar`.

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

**Orden normativo del Bestiario (paso 78):** desafío numérico ascendente (0, 1/8, 1/4, 1/2, 1...), y a igualdad de desafío orden alfabético español por nombre. Se implementa en el catálogo de reglas y se conserva en todos los filtros y búsquedas; ninguna clase crea su propia ordenación.

## Progresión del Brujo: implementación actual

**Actualización 76 (vigente):** la progresión cubre **Brujo 1→7** con `WarlockLevelUpWizard` y el marco compartido de tres pasos. Nivel 7: sexto hueco de invocación, octavo preparado ordinario, dos ranuras de nivel 4 y Escudo de fuego / Muro de fuego siempre preparados como séptimo y octavo conjuro del Patrón Infernal. Se puede elegir Susurros de la tumba. `level7History` guarda elecciones previas para 7→6→5; `LevelDownDialog` sigue siendo la única UI de descenso. Suerte del Oscuro (nivel 6) permanece activa con sus usos por descanso largo. Los cambios visuales de armas se hacen en `WeaponRollCards`, un único componente de presentación reutilizable, sin tocar las demás pestañas. **Las referencias de este apartado a niveles 1–6 describen las fases anteriores, no un nuevo límite.**

**Actualización 77 (vigente):** Brujo **1→8** sin variaciones en las siete pestañas, `CharacterHeader`, `SharedSpellsLayout`, `SpellLibraryPanel`, `LevelUpDialogFrame`, `LevelDownDialog` o `LevelUpHitPointsPicker`. Nivel 8 añade segundo rasgo Mejora de característica (+2 o +1/+1), novena preparación ordinaria y un d8, con misma capacidad de sustitución de un truco y una invocación. Conserva **seis invocaciones, tres trucos, dos ranuras de nivel 4 y ocho conjuros gratuitos del Patrón Infernal**. `level8History` restaura 8→7, preservando el resto de la progresión; no se añaden fichas ni duplicados al catálogo global. Todas las notas de actualización 76 describen la fase precedente.

**Actualización 78 (vigente):** Brujo **1→9** conserva íntegramente las siete pestañas y el marco compartido. Nivel 9 incorpora competencia +4, **siete invocaciones**, diez conjuros ordinarios, dos ranuras de conjuro de nivel 5 y Contactar con el patrón (preparación automática de Contactar con otro plano, un uso gratuito por descanso largo con salvación de Inteligencia automática). Los nueve conjuros de nivel 5 se **enlazan a fichas existentes del Mago**; no se duplica ningún texto del catálogo. Bebedor de vida ofrece un botón 1d6 en el módulo de arma del pacto equipada, con tarjetas universales `WeaponRollCards`. El nuevo uso se ve en módulos específicos de Recursos, Rasgos y Hechizos sin cambiar la arquitectura. `level9History` permite deshacer 9→8 restaurando elecciones.

**Contrato normativo obligatorio de ventanas de subida y bajada:** consultar [`ARQUITECTURA_PROGRESION_NIVELES.md`](ARQUITECTURA_PROGRESION_NIVELES.md) ANTES de crear una progresión de cualquier clase. `LevelUpDialogFrame` es el único asistente de tres pasos; `LevelDownDialog` es la única ventana de bajada con confirmación; `LevelUpHitPointsPicker` se utiliza en todas las clases (Guerrero d10/6, Mago d6/4, Brujo d8/5). Los nuevos asistentes de magia reutilizan el buscador, `wizard-spell-choice-list` y `WizardSpellDetails`; no deben tener diálogos ni selecciones estilísticas propias.

`WarlockLevelUpWizard.tsx` captura las decisiones de **1→2 hasta 8→9** mediante el mismo `LevelUpDialogFrame` que Guerrero y Mago. La validación de transición y bajada reside en `packages/rules-engine/src/warlock-level-up.ts`; `warlock.ts` valida snapshot, PG, invocaciones, ranuras, descansos y recursos. Se mantienen las siete pestañas. Nivel 2: tres invocaciones, dos trucos, tres preparados y dos ranuras de nivel 1. Nivel 3: Patrón Infernal, cuatro preparados ordinarios, cuatro gratuitos y ranuras de nivel 2. Nivel 4: Mejora de característica, tres trucos y cinco preparados. Nivel 5: cinco invocaciones, seis preparados, ranuras de nivel 3 y competencia +3. Nivel 6: Suerte del Oscuro y séptimo preparado. Nivel 7: sexta invocación, octavo preparado y nivel de conjuro 4. Nivel 8: segunda Mejora de característica y noveno preparado. **Nivel 9:** séptima invocación, décimo preparado, competencia +4, nivel de conjuro 5 y Contactar con el patrón. Los historiales `level3History` a `level9History` permiten retroceder y recuperar elecciones anteriores; los efectos activos siguen bajo control del jugador.

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
