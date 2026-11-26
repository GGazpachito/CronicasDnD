# Actualización 80 · Brujo Infernal nivel 11 · Arcanum místico y tercera ranura

Fecha: 26 de noviembre de 2026. Sistema de referencia: D&D 2024, PHB 2024.

## Motivación y alcance

Se implementa el nivel 11 como una actualización única, porque introduce una nueva **clase de recurso mágico** distinta de las ranuras ordinarias. La prioridad arquitectónica es mantener **las mismas siete pestañas**, la biblioteca única de hechizos, el asistente común de tres etapas, el diálogo compartido de descenso y la persistencia existente. No se automatizan decisiones durante el combate; el jugador marca los usos.

| Recurso | Brujo nivel 10 | Brujo nivel 11 |
| --- | --- | --- |
| Competencia | +4 | +4 |
| Trucos | 4 | 4 |
| Conjuros preparados ordinarios | 10 | **11** (niveles 1–5) |
| Invocaciones sobrenaturales | 7 | 7 |
| Magia de Pacto | 2 ranuras de nivel 5 | **3 ranuras de nivel 5** |
| Astucia mágica, 1 uso/descanso largo | Recupera hasta 1 ranura gastada | **Recupera hasta 2** ranuras gastadas |
| Arcanum místico de nivel 6 | No disponible | **1 conjuro de nivel 6 elegido; 1 uso/descanso largo** |
| Descarga sobrenatural | 2 rayos | **3 rayos** independientes |
| Dado de golpe | 10d8 | 11d8; el último 5 de media o 1d8 |

Los once preparados ordinarios y el Arcanum son **conjuntos separados**. Nunca se podrá gastar una ranura de Pacto para lanzar el Arcanum, ni utilizar el uso gratuito del Arcanum para lanzar un conjuro ordinario. El lanzamiento del Arcanum no consume ninguna de las tres ranuras de nivel 5.

## Catálogo de conjuros y reutilización

Se incorporan a la **lista de Brujo** los siete conjuros de nivel 6 mediante referencias a sus fichas existentes del Mago; no se duplica código de reglas:

- Portal arcano (`arcane_gate`).
- Círculo de muerte (`circle_of_death`).
- Crear muertos vivientes (`create_undead`).
- Mordisco ocular (`eyebite`).
- Invocar infernal (`summon_fiend`).
- Caldero burbujeante de Tasha (`tashas_bubbling_cauldron`).
- Visión verdadera (`true_seeing`).

Los nombres mostrados se toman de las fichas compartidas existentes, independientemente de las traducciones de este documento. Se amplía `WARLOCK_SIXTH_LEVEL_IDS`, `WARLOCK_LEVEL_SIX_SPELLS`, `SHARED_SPELL_RULES` y el filtro de clase Brujo en `SHARED_CLASS_SPELL_LISTS`. El **listado íntegro del Mago** permanece consultable desde todas las clases usando los filtros comunes.

## Motor de reglas

### Progresión

- `advanceWarlockToLevelEleven` exige Brujo Infernal nivel 10, once preparados ordinarios legales (conservar al menos nueve de diez), cuatro trucos (conservar al menos tres), siete invocaciones (conservar al menos seis), un Arcanum válido de la lista de nivel 6 y un dado d8 válido. La sustitución opcional de un conjuro/rasgo se valida en motor, no solo en interfaz.
- `level11History` guarda invocaciones, trucos, preparados, vínculos de Hoja/Tomo, familiares, otros estados específicos y la resistencia infernal anterior. `level11HitDieRoll` guarda el resultado elegido; los PG se recalculan con Constitución.
- `thirdPactSlotSpent` representa el tercer hueco de Pacto; `mysticArcanum6Used`, el uso del Arcanum. Ambos nacen en `false` al subir; no se permiten en estados anteriores al nivel 11.
- `warlockPactSlots` y `toggleWarlockPactSlot` admiten tres huecos desde nivel 11. `warlockMagicalCunning` recupera hasta `ceil(huecos totales/2)` ranuras de Pacto gastadas (dos desde este nivel), una vez por descanso largo.
- `spendWarlockMysticArcanum6` consume solo el uso gratuito del Arcanum, **sin alterar** los indicadores de ranuras. `warlockShortRest` repone las ranuras, pero **no** el Arcanum; `warlockLongRest` repone ambos y el uso de Astucia mágica.
- `validateWarlockCharacterSnapshot` sigue usando `schemaVersion: 4` y acepta los campos opcionales del nivel 11; conserva compatibilidad con guardados anteriores.

### Descenso

`previewWarlockLevelDown` implementa **11→10** con la misma ventana `LevelDownDialog` que Guerrero y Mago. Retira el Arcanum, la tercera ranura y el d8 adicional; recupera las decisiones guardadas en `level11History`. Conserva el daño acumulado si es compatible, los gastos anteriores de las dos ranuras de Pacto, la resistencia elegida, el inventario, los compañeros, inspiración y los historiales previos. El resultado es una **vista previa validada** antes de modificar la hoja. Después permite seguir 10→9→8.

## Interfaz y modularidad

- `WarlockLevelUpWizard`: mantiene **exactamente tres pasos**: novedades, selección, confirmación. Usa `LevelUpDialogFrame`, `LevelUpHitPointsPicker`, el buscador y `WizardSpellDetails`. La elección separada de Arcanum reutiliza el aspecto de las tarjetas mágicas; los once preparados ordinarios siguen en su propia lista (solo conjuros 1–5).
- `SharedPrincipalSheet`: mantiene PG, inspiración, ataques y recursos en el mismo lugar que otras clases; la única adición es una fila de **Arcanum místico** con nombre, estado, ficha y botón de marcar lanzamiento.
- `TraitsPanel` y `SharedSpellsLayout` / `SpellLibraryPanel`: conservan los mismos diseños. El Arcanum aparece como rasgo y se consulta desde la biblioteca y el apartado de magia de Brujo, junto a sus tres ranuras de Pacto.
- `WarlockEldritchBlast`: su cálculo anterior por nivel ya produce tres rayos en nivel 11; no se crea otro componente ni se modifican los estilos de dados.
- El uso del Arcanum y de los conjuros sigue siendo **manual**. La web no gasta ranuras automáticamente al abrir fichas o tirar dados.

## Verificación y casos de aceptación

Se añade `packages/rules-engine/tests/warlock-level-11-80.test.ts`: progresión 1→11, recuentos y PG; siete fichas compartidas y filtro de Brujo; consumo y descansos del Arcanum; tercera ranura y Astucia mágica; rechazo de selección ilegal, dado inválido y edición fraudulenta; guardado/validación; descenso 11→10→9 con vida y elecciones intactas.

El entorno de entrega contiene una copia parcial de los fuentes, sin `package.json` ni `node_modules`, así que la validación disponible es el **humo con Node 24**: se ejecutaron las once secuencias existentes desde nivel 1 a 11, todas correctas. La suite de Vitest del archivo nuevo deberá ejecutarse en el repositorio completo.

En la raíz del repositorio del usuario, en **PowerShell**, ejecutar una instrucción por línea:

```powershell
pnpm --filter @dnd/rules-engine test
pnpm --filter @dnd/web lint
pnpm build
```

### Inspección manual recomendada

1. Cargar un Brujo Infernal de nivel 10 con compañeros, objetos y varios usos de recursos gastados. Abrir subida, confirmar **tres pasos idénticos** al Mago.
2. Ver siete fichas de nivel 6 de Arcanum, elegir una, y mantener once conjuros **ordinarios** de nivel 1–5 en lista separada. Comprobar que el buscador y las tarjetas funcionan.
3. Confirmar: tres rombos de ranura de nivel 5, cuatro trucos, siete invocaciones, Arcanum en Principal/Rasgos/Hechizos y tres rayos de Descarga sobrenatural.
4. Gastar tres ranuras y usar Astucia mágica: se recuperan dos, no tres; un segundo rito no debe ser posible hasta el descanso largo.
5. Marcar un lanzamiento de Arcanum: no modifica las ranuras. Un descanso corto no reinicia el Arcanum; un descanso largo sí. La ficha se ve en el catálogo único de hechizos.
6. Guardar y cargar: todos los usos, las elecciones y la ficha persistida deben mantenerse.
7. Bajar 11→10: comprobar pérdida de Arcanum y tercera ranura, recuperación de exactamente diez preparados, preservación de resistencia/vida/inventario/compañeros e idéntica ventana de descenso común.

## Decisiones TFG y continuación

Separación explícita entre **datos de conjuros** (instancias reutilizadas), **reglas de acceso por clase** (lista de Brujo), **recursos diferenciados** (ranuras de Pacto frente a uso de Arcanum), **estado persistido** (uso del recurso) y **componentes compartidos** (ficha, asistente y biblioteca). Esta división permite que otras clases incluyan recursos especiales sin copiar la interfaz general.

**Próximo paso:** Brujo Infernal **nivel 12**: dote/mejora de característica, una invocación adicional y ajustes de progresión con el mismo contrato de ficha, persistencia y descenso.
