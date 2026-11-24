# Contrato del Bestiario y criaturas vinculadas · actualizaciones 71 y 78

> **Normativo para cualquier clase, subclase, invocación, montura o enemigo que utilice criaturas.** No introducir una segunda copia de un bloque de estadísticas en el JSX ni en el motor de otra clase.

## Propósito y separación de responsabilidades

El menú principal de CRÓNICAS presenta **Crear personaje / Cargar personaje / Bestiario**. El Bestiario es una página independiente (`/bestiary`) que consulta un catálogo único de bloques de criaturas. Se conserva la arquitectura común de las siete pestañas de cada clase.

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| Reglas y catálogo | `packages/rules-engine/src/bestiary.ts` | Fuente única de estadísticas, identificadores estables, búsqueda por ID y proyección de plantilla a familiar |
| Referencia de opciones | `packages/rules-engine/src/warlock.ts` | `WARLOCK_FAMILIARS`: formas elegibles y compatibles con guardados previos |
| Hoja visual universal | `apps/web/src/components/CreatureStatBlock.tsx` | Visualiza **todas** las fichas de criatura (manual, bestiario, familiar) y permite tiradas d20 |
| Exploración | `apps/web/src/app/bestiary/page.tsx`, `apps/web/src/components/BestiaryBrowser.tsx` | Buscar, filtrar, seleccionar, consultar ficha y fuente |
| Extensión de clase | `apps/web/src/components/WarlockCompanionsPanel.tsx` | Formas elegibles en Pacto de la Cadena y ficha derivada del catálogo central |
| Compañeros universales | `apps/web/src/components/SharedCompanionsPanel.tsx` | Hasta 20 fichas manuales persistentes; mantiene selector, editor y borrado con confirmación |

**Invariante:** el bloque de la criatura solo se define una vez en `CREATURES` dentro de `bestiary.ts`; todas las vistas usan `BESTIARY_ENTRIES`, `findBestiaryCreature` y, si necesitan un familiar nominal, `familiarSheetFromBestiary`. Esta función crea una copia independiente con ID `familiar:<forma>` y nombre personalizable, sin tocar la ficha original. Los componentes de presentación comparten `CreatureStatBlock` y clases `.shared-companion-*`.

## Orden obligatorio de consulta · paso 78

El Bestiario **siempre muestra las criaturas en orden ascendente de valor de desafío (VD)**. En cada grupo de desafío idéntico, las fichas se ordenan **alfabéticamente por nombre en español**, ignorando mayúsculas y acentos como criterio principal. Un empate se resuelve por ID estable.

- `challengeRatingValue` convierte etiquetas fraccionarias (`1/8`, `1/4`, `1/2`) a números reales; está prohibido ordenarlas como texto.
- `compareBestiaryEntries` aplica la ordenación numérica y alfabética con configuración regional española. `BESTIARY_ENTRIES` ya sale ordenado del motor.
- Búsqueda por nombre, tipo y desafío y filtros de categoría actúan como **subconjuntos ordenados**; no reordenan las fichas después de filtrar.
- `findBestiaryCreature` y `familiarSheetFromBestiary` conservan ID, estadísticas y guardado del familiar. Cambiar la posición visual no modifica datos.
- Al añadir criaturas, se comprueban fracciones de VD, orden alfabético, filtros combinados e IDs únicos.

## Estado, guardado y alcance

- Las fichas del Bestiario son **plantillas de lectura**. No se guardan en la base de datos con cada personaje, no se modifican al tirar dados y no cambian al editar un acompañante manual.
- En un Brujo que conoce Pacto de la Cadena, la forma elegida y su nombre ya se almacenan en `state.familiarForm` y `state.familiarName`; a partir de esa selección se obtiene dinámicamente la ficha. Si cambia la forma, cambia el bloque sin duplicar las estadísticas en el snapshot.
- El familiar de rasgo **no ocupa** un lugar entre los veinte registros de `input.companions`; estos siguen siendo editables, eliminables y persistentes. Tanto ellos como el familiar se ven en la misma pestaña universal «Compañeros», en sus secciones correspondientes.
- CA y PG de la ficha del Bestiario son **valores base**: se muestran como referencia, no como un contador de PG de combate sincronizado con el familiar. En futuras actualizaciones se podrá añadir estado transitorio de combate independiente, sin modificar las plantillas.
- Se admiten tiradas d20 de características, iniciativa y ataques. No se resuelven efectos activos, condiciones, decisiones tácticas ni descansos automáticamente.

## Entradas iniciales y trazabilidad

**23 formas** del selector del Brujo: ocho especiales (`imp`, `pseudodragon`, `quasit`, `skeleton`, `slaad_tadpole`, `sphinx_of_wonder`, `sprite`, `venomous_snake`) y quince comunes o históricas (`bat`, `cat`, `crab`, `frog`, `hawk`, `lizard`, `octopus`, `owl`, `poisonous_snake`, `fish`, `rat`, `raven`, `sea_horse`, `spider`, `weasel`).

Se ha usado la [tabla de criaturas de *Basic Rules 2024* de D&D Beyond](https://www.dndbeyond.com/sources/dnd/br-2024/creature-stat-blocks) para contrastar CA, PG, características, velocidades, ataques y aptitudes. El texto de reglas largo **no se reproduce**: se resumen los efectos principales en español y se enlaza la fuente para detalles completos. La [opción Pacto de la Cadena de Brujo 2024](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes#Warlock) especifica las ocho formas especiales.

**Compatibilidad deliberada:**

1. `fish` se presenta como **Pez (piraña)** y utiliza las estadísticas del bloque *Piranha* de 2024.
2. `poisonous_snake` era un identificador distinto del selector anterior. Se mantiene para abrir personajes ya creados y se vincula al bloque vigente *Venomous Snake* (el mismo de `venomous_snake`). Se indica en notas que es un alias.
3. `sea_horse` utiliza *Seahorse* (2024) y no un bloque inventado.

El catálogo se añade como **datos versionados en código** en esta fase; el botón del Bestiario no implica todavía un editor público, una base de datos de monstruos o importaciones externas. No llamar a un bloque «oficial» si se ha creado para contenido casero. Ante una nueva criatura, registrar fuente, edición, categoría y traducción respetando las licencias correspondientes.

## Reglas obligatorias de ampliación

1. Añadir la ficha **una sola vez** a `packages/rules-engine/src/bestiary.ts`, con ID estable, tipo, tamaño, CA, PG, velocidad, puntuaciones FUE/DES/CON/INT/SAB/CAR, desafío, ataques y apartados de habilidad/defensas/rasgos/acciones si aplican.
2. Conservar el mismo `CompanionSheet` como modelo común de lectura, pero **no** llamar `validateCompanionSheets` con más de 20 plantillas juntas: ese límite es únicamente el cupo de compañeros manuales.
3. Si una clase permite elegir esa criatura, persistir **el identificador y los datos propios de la instancia**, no otra copia de todas las estadísticas. Presentar la ficha reutilizando `CreatureStatBlock` desde la pestaña universal «Compañeros» o el módulo especial que proceda.
4. Mantener categorías de búsqueda y procedencia. Cuando se añadan animales o enemigos que no sean familiares, ampliar el tipo de ID/categoría del Bestiario sin hacer que todas las entradas pasen a ser elegibles para Encontrar familiar.
5. Añadir pruebas de IDs únicos, bloques válidos, ataques, compatibilidad de guardados antiguos y aislamiento entre plantilla y personaje.
6. Actualizar este documento, el registro del paso y `ESTRUCTURA_HOJA_COMUN.md` si cambian contratos visuales o de estado.

## Para el TFG

Decisión arquitectónica: **catálogo central + vistas/adaptadores**. Favorece normalización, integridad de datos, trazabilidad de fuentes y reutilización entre clases; evita introducir estadísticas discordantes cada vez que una clase concede un acompañante. Limitación de fase: datos estáticos versionados en Git y PG del familiar como referencia, no estado de combate dinámico.
