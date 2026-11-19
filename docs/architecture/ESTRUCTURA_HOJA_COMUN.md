# Contrato de arquitectura visual: hoja de personaje CRÓNICAS (actualización 68)

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

Identidad visual compartida en la cabecera (`CharacterHeader`), guardado/carga (`SaveLoadPanel`) y pestañas (`CharacterTabs`). No hacer otra navegación solo para Mago o Brujo.

## Principal: estructura obligatoria

Responsable: `SharedPrincipalSheet.tsx` en Guerrero, Mago y Brujo.

1. Herramientas de tiradas d20: modo normal, ventaja y desventaja; mismas etiquetas y botones.
2. Fila de valores principales: PG actuales/temporales, CA, iniciativa.
3. Características (FUE, DES, CON, INT, SAB, CAR): puntuaciones y modificadores automáticos.
4. Columna de habilidades con entrenamiento, bonificación y tiradas.
5. Columna de salvaciones y tiradas; continuación con **ataques**, **recursos de clase**, **ranuras de conjuro cuando correspondan**.
6. Pie de hoja, orden obligatorio: **Percepción pasiva → Movimiento y origen → Salvaciones de muerte → Inspiración heroica**. Los datos adicionales (p. ej., firma de Mago) pueden añadirse como módulo identificable separado, sin sustituir estos cuatro.

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

**Una sola biblioteca**: `SpellLibraryPanel.tsx` con pestañas Preparados/Disponibles, Aprendidos/Conocidos y **Todos los conjuros**. Todos reciben `SHARED_SPELL_RULES` (`packages/rules-engine/src/shared-spell-catalog.ts`), unión deduplicada de **242 fichas de Mago y 27 de Brujo = 249 fichas únicas** en la actualización 68.

1. En **todas las clases**, «Todos los conjuros» permite buscar por nombre/escuela/descripción y filtrar por **lista Mago**, **lista Brujo** y nivel 0–9. Por defecto, las listas están marcadas y se ve la unión.
2. El selector de filtros y el detalle del conjuro (`WizardSpellDetails.tsx`) son compartidos, sin variantes visuales por clase.
3. **Ver un conjuro no equivale a poder aprenderlo.** La lista de clase determina permisos; Mago solo puede editar fichas de su lista mediante `editableForSpell`; Brujo nivel 1 edita su selección en la creación, y Guerrero solo consulta hechizos otorgados por origen. No conceder conjuros o ranuras indebidos mediante el catálogo.
4. Las ranuras, descansos, Recuperación arcana, Magia de Pacto y rasgos relacionados van en módulos separados de `SharedSpellsLayout.tsx`, sin reemplazar filtros ni fichas.
5. Al ampliar el catálogo (otras clases o niveles), añadir reglas nuevas al motor y **agregarlas a la unión**, más su lista de clase. Nunca crear una biblioteca duplicada de 27 registros para Brujo.

## Personaje

Componente: `CharacterProfilePanel.tsx`. Campos narrativos, retrato, información de origen y datos personales con persistencia en `profile`. Las clases solo pasan valores de origen/nivel para la cabecera; no recrear su disposición.

## Compañeros: módulo universal

Componente: `SharedCompanionsPanel.tsx`, modelo y validador: `packages/rules-engine/src/companions.ts`.

Interacciones: selector **Compañero visible**; **Crear compañero** (abre ficha vacía editable); **Editar ficha** (abre borrador); **Guardar ficha** (valida y añade/actualiza), **Cancelar** (no modifica guardado). Campos comunes: nombre, tipo/especie, tamaño, desafío, CA, PG actuales/máximos, velocidad, competencia, seis características y modificadores, iniciativa, salvaciones, habilidades, sentidos, idiomas, defensas, ataques (nombre, bono, daño, notas), rasgos, acciones/reacciones, equipo y notas. Hay tiradas d20 para características, iniciativa y ataques; no se automatizan órdenes del compañero ni combate.

Almacenamiento: `input.companions` **opcional** en `GuidedFighterInput`, `GuidedWizardInput`, `GuidedWarlockInput`. Se valida en el motor, admite hasta 20 registros y se conserva en el snapshot existente; guardados anteriores sin `companions` siguen siendo válidos. Las fichas se crean y editan localmente; persisten en la base de datos **cuando el usuario pulsa «Guardar personaje» o «Guardar cambios»**.

Las criaturas concedidas por rasgos no se mezclan con estas fichas manuales. Ejemplo: `WarlockCompanionsPanel.tsx` del Pacto de la Cadena es una extensión **posterior** al editor universal.

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
- [ ] Usa `TraitsPanel`, `EquipmentPanel` y `CharacterProfilePanel`; extensiones identificadas después.
- [ ] Usa `SharedSpellsLayout` + `SpellLibraryPanel` y todo `SHARED_SPELL_RULES`, incluso si la clase no puede lanzar conjuros.
- [ ] Filtros por clase y nivel funcionales; aprende/prepara solo con permisos legales.
- [ ] Usa `SharedCompanionsPanel` y persiste `input.companions`, sin mezclar invocaciones automáticas.
- [ ] Revisa editor de creación, guardado antiguo, guardado nuevo, subida/bajada de nivel y restauración.
- [ ] Pruebas del motor, lint, compilación y comparación visual de las tres clases antes del empaquetado.

**Para el TFG:** esta decisión minimiza deriva visual y duplicación, separa presentación (`components`), reglas (`rules-engine`) y estado persistente (`input`/`state`), y favorece pruebas regresivas por contrato.
