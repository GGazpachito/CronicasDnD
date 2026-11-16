# PASO 54. Progresión del Mago: niveles 8 y 9

**Proyecto:** Crónicas, editor y hoja digital de personajes de Dungeons & Dragons (reglas de 2024).  
**Estado:** implementación incremental para revisión, con pruebas locales y validación pendiente en el entorno real del desarrollador.  
**Dependencia:** actualización 53 instalada y validada.  
**Ámbito:** Mago con subclase Evocación. No modifica el Guerrero ni incorpora otras clases.

## 1. Objetivo y motivación

Extender la progresión guiada del Mago desde nivel 7 hasta nivel **9** y continuar la implantación del catálogo de conjuros, manteniendo los principios arquitectónicos establecidos: una hoja y un asistente visual compartidos entre clases, cálculos pasivos y tiradas bajo petición, edición transaccional de la progresión, guardado explícito y retroceso de nivel explicativo.

Los objetivos comprobables son: (a) elegir la Mejora de característica en nivel 8; (b) añadir dos conjuros por cada nivel nuevo; (c) obtener en nivel 9 el acceso a ranuras de nivel 5 y un conjuro gratuito de Evocación, sin duplicar conjuros conocidos; (d) actualizar las fichas de conjuro y sus tiradas; (e) conservar la partida en ascensos, retrocesos y guardados; y (f) no alterar los módulos de clases anteriores.

## 2. Fuente normativa y decisiones de alcance

La referencia primaria es el **Manual del Jugador 2024**, aportado por el responsable del proyecto:

- **pp. 165–167:** clase Mago, tabla de progresión, preparación, libro, espacios y mejora de característica.
- **p. 170:** lista de conjuros de Mago, incluidas las opciones de nivel 5.
- **p. 174:** subclase Evocación y «Experto en Evocación»; nuevos conjuros gratuitos cuando se abre un nivel de ranura apropiado.
- **Capítulo de conjuros, pp. 239–343:** datos específicos de cada conjuro, con número de página propio en el catálogo.

Se redactaron **resúmenes propios en español** para la interfaz, en lugar de copiar íntegramente las entradas del manual. Cada ficha indica datos estructurados y página para consultar los detalles y excepciones. La web no interpreta automáticamente las decisiones del director ni aplica efectos activos a objetivos.

**Alcance deliberado:** el nivel 8 permite la dote Mejora de característica (+2 a una característica o +1 a dos), pero todavía no se ofrecen todas las dotes generales alternativas que contempla el reglamento. Se indica en el asistente; no se presentan elecciones ausentes como si fueran implementadas. La preparación manual de conjuros en la biblioteca sigue sin imponer límites numéricos, aunque la progresión reglamentaria sí valida sus elecciones obligatorias.

## 3. Reglas que se incorporan

| Característica | Nivel 7 anterior | Nivel 8 | Nivel 9 |
|---|---:|---:|---:|
| Bonificador de competencia | +3 | +3 | +4 |
| Trucos conocidos | 4 | 4 | 4 |
| Conjuros preparados reglamentarios | 11 | 12 | 14 |
| Ranuras de nivel 1 | 4 | 4 | 4 |
| Ranuras de nivel 2 | 3 | 3 | 3 |
| Ranuras de nivel 3 | 3 | 3 | 3 |
| Ranuras de nivel 4 | 1 | 2 | 3 |
| Ranuras de nivel 5 | 0 | 0 | 1 |
| Nuevos conjuros ordinarios en libro | — | +2 | +2 |
| Mejora de característica | — | Sí | — |
| Conjuro gratuito de Evocación | — | — | +1, nuevo, de nivel 1–5 |

### 3.1. Mejora de nivel 8

Se añadió `level8Improvement` al `GuidedWizardInput`, reutilizando el tipo y el validador de la mejora de nivel 4. Las mejoras se aplican **secuencialmente**, después de las bonificaciones de origen y la mejora previa. El sistema rechaza aumentos ilegales de puntuación y la asignación de esta elección a niveles inferiores a 8. El cálculo posterior de PG, salvaciones, habilidades, CD y ataque mágico utiliza las nuevas puntuaciones finales. El asistente muestra los valores *antes y después* de confirmar.

### 3.2. Acceso a nivel 5 en el nivel 9

La progresión sube a bonificación de competencia +4, ajusta las ranuras a `4/3/3/3/1`, aumenta a catorce los preparados reglamentarios y exige dos conjuros nuevos del libro. El rasgo **Experto en Evocación** incorpora un nuevo conjuro gratuito de esta escuela elegible entre los niveles de conjuro 1–5. Se comprueba que no esté ya en el libro, en los conjuros gratuitos anteriores o en las dos elecciones simultáneas.

Las marcas de ranuras se reajustan por **grupo de nivel de conjuro**, conservando los rombos gastados de niveles ya existentes y añadiendo los rombos nuevos como disponibles. Se conserva el convenio visual: **marcado = disponible; vacío = gastado**; el campo interno de gasto no cambia. Las vistas Principal y Hechizos muestran el quinto grupo cuando existe. La Recuperación arcana sigue consultando el nivel real y las ranuras disponibles para restaurar, con sus restricciones.

### 3.3. Retroceso explicativo, nivel 9→8→7

Se amplió el mismo motor `level-down.ts` y la ventana compartida existente. Al pasar de **9 a 8**, se eliminan las elecciones obtenidas al nivel 9, el conjuro gratuito correspondiente, una ranura de nivel 5 y los incrementos de ranuras y preparados de esa etapa. Al pasar de **8 a 7**, se deshace únicamente la Mejora de característica del 8 junto a sus dos conjuros y demás incrementos, conservando la mejora de nivel 4 y los regalos anteriores de Evocación. Los cambios se previsualizan antes de solicitar confirmación; no se ejecuta un guardado automático.

Siempre que los datos continúen siendo compatibles, persisten PG actuales con daño, inventario, recursos gastados, perfil y retrato, inspiración y marcadores manuales. El resultado debe actualizarse mediante **Guardar cambios** para quedar persistido en PostgreSQL.

## 4. Catálogo de nivel 5 y arquitectura

Se incorporó `wizard-fifth-level.ts` con **29 conjuros de nivel 5 de la lista de Mago**, cada uno con identificador único, nombre, escuela, descripción original, datos de lanzamiento, componentes, duración, alcance, página del manual y, cuando procede, fórmulas de dados o indicación de ataque mágico. Estas entradas se integran en `WIZARD_SPELL_CATALOG` y en el catálogo de detalles `WIZARD_SPELL_RULES`, fuente común para el asistente y la pestaña Hechizos.

El catálogo pasa de **151 a 180** registros: 20 trucos + 31 nivel 1 + 39 nivel 2 + 32 nivel 3 + 29 nivel 4 + 29 nivel 5. Se mantienen las pestañas **Preparados / Aprendidos / Todos los conjuros** y los filtros existentes.

Ejemplos de dados documentados bajo clic: **Cono de frío** (`8d8`), **Mano de Bigby** (`5d8` en Puño cerrado) y **Geas** (`5d10` cuando se incumple la orden). El botón de dados **no** gasta ranuras, resuelve salvaciones ni aplica daño. Los conjuros sin dados determinables no reciben tiradas ficticias. Las fichas son un apoyo de juego y remiten a la página del manual para casuísticas completas.

Se mantienen **dos capas** de selección:

1. **Progresión reglamentaria validada**: conjuros nuevos obligatorios, rasgos gratuitos y preparada inicial por nivel; evita duplicados y opciones ilegales.
2. **Biblioteca manual sin límites**: casillas editables en Catálogo, Aprendidos y Preparados, independientes de los cupos; las incorporaciones reglamentarias se fusionan de manera conservadora sin borrar las modificaciones manuales.

## 5. Arquitectura, persistencia y alternativas

**Código compartido conservado:** `WizardLevelUpWizard.tsx` sigue utilizando el marco visual de tres pasos de `LevelUpDialogFrame`; el descenso reutiliza `LevelDownDialog`; las pestañas y la hoja Principal no se duplican. `wizard.ts` mantiene la tabla de progresión de nivel 1 a 20 como referencia; esta actualización extiende únicamente el máximo **interactivo** a nivel 9.

**Modelo de datos:** se añaden dos campos opcionales al input del Mago, `level8Improvement` y `evokerLevelFiveSpellId`. Se actualiza la lista blanca de claves aceptadas por la validación de snapshots, evitando un fallo en el que una ficha válida en memoria sería rechazada al guardar. Los personajes antiguos, sin estas claves, mantienen sus niveles anteriores. **No hay migraciones de PostgreSQL ni nuevos paquetes.**

**Alternativas descartadas:** copiar un nuevo componente de nivel para 8/9 (duplicación de UI); actualizar las estadísticas sin modificar el input persistente (pérdida al recuperar); reiniciar ranuras en un ascenso (altera decisiones de partida); bloquear las casillas de Preparados al superar el cupo (contradice los requisitos del proyecto); programar el efecto de los conjuros como un combate automático (fuera de alcance).

## 6. Verificación ejecutada y límites de la evidencia

**Realmente comprobado durante la preparación:**

- Compilación TypeScript estricta del motor de reglas modificado: correcta.
- Tipado estricto de la página del Mago y el asistente, usando tipos de React originales y declaraciones locales de Next.js para el entorno aislado: correcto. **No equivale a `next build`.**
- **13 pruebas nuevas** del paso 54: entradas de catálogo, reglas y páginas, progresión 8/9, mejoras, imposibilidad de elegir conjuros de nivel 5 en nivel 8, conjuro gratuito de Evocación, persistencia, Preparados, marcas de ranura y Recuperación arcana, descenso y no mutación del original: superadas.
- Compilación y ejecución con adaptador local de aserciones de los archivos de prueba del motor y su regresión: **925 comprobaciones, 0 fallos**. **No es la ejecución oficial de Vitest.**

**Pendiente y necesario en la máquina del responsable:**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

La ejecución real de ESLint, Vitest, la compilación/prerenderizado de Next.js y las pruebas desde navegador con PostgreSQL **no han sido verificadas** aquí. Deben registrarse con fecha y evidencias antes de presentarlas como realizadas en el TFG.

### Matriz de aceptación funcional

1. Cargar un Mago nivel 7 con retrato, equipo, conjuros y una ranura de nivel 3 gastada. Abrir subida 7→8 y comprobar que se muestran los cambios antes de confirmar; cancelar, verificar ausencia de modificaciones.
2. Subir 7→8 con dos nuevos conjuros y Mejora de característica +2 o +1/+1; verificar los PG y, según característica elegida, la CD, ataque mágico y habilidades.
3. Comprobar en Hechizos que el catálogo contiene 180 entradas y que el filtro por lista Mago y nivel 5 muestra **29 conjuros**. Consultar detalles y botones de dados.
4. Subir 8→9, elegir dos conjuros ordinarios y un conjuro gratuito de Evocación diferente. Comprobar que la validación rechaza duplicados o conjuros que no sean Evocación.
5. Verificar en **Principal y Hechizos** la nueva línea de rombos de nivel 5: marcado = disponible, vacío = gastado. Gastar la ranura y comprobar Recuperación arcana si sus condiciones se cumplen.
6. Guardar en PostgreSQL, volver al menú inicial, abrir la galería y recuperar el mismo personaje; comprobar su nivel, Mejora de característica, biblioteca, inventario, perfil, retrato y ranuras gastadas. La carga debe **actualizar el registro existente**, no crear un duplicado al guardar.
7. Bajar 9→8: confirmar eliminación del conjuro gratuito de nivel 9 y las nuevas ranuras; bajar 8→7: verificar recuperación de características anteriores y conservación de los regalos de Evocación de niveles 3, 5 y 7.
8. Revisar que el inventario, los recursos y la información de uno o más Guerreros antiguos no han cambiado.
9. Conservar capturas y logs de `pnpm lint`, `pnpm test`, `pnpm build` y pasos manuales para el anexo del TFG.

## 7. Riesgos conocidos y próximos pasos

- Las fichas contienen resúmenes redactados para consulta, **no reproducciones exhaustivas** del manual; pueden existir excepciones detalladas que requieran consultar la página citada.
- Los ataques, daños y demás tiradas se hacen bajo clic. No se automatiza selección de objetivos, aplicación de estados, concentración, gasto automático de ranuras ni resolución de combate.
- Las dotes generales alternativas a Mejora de característica, además de otras clases y subclases, siguen pendientes.
- La progresión interactiva se detiene **en nivel 9**; no se deben seleccionar todavía niveles 10–20 mediante este flujo.

**Actualización 55 prevista:** Mago **niveles 10 y 11**, quinto truco, **Evocación potenciada** en el 10, acceso a conjuros y ranuras de **nivel 6** en el 11, regalo adicional de Evocación cuando corresponda, retroceso y catálogo, sin cambiar el diseño compartido.

## 8. Archivos incluidos en el paquete incremental

1. `apps/web/src/app/wizard/page.tsx`
2. `apps/web/src/components/WizardLevelUpWizard.tsx`
3. `packages/rules-engine/src/wizard-creation.ts`
4. `packages/rules-engine/src/wizard-level-up.ts`
5. `packages/rules-engine/src/level-down.ts`
6. `packages/rules-engine/src/wizard-slot-marks.ts`
7. `packages/rules-engine/src/wizard-spell-details.ts`
8. `packages/rules-engine/src/wizard-spell-library.ts`
9. `packages/rules-engine/src/wizard-traits.ts`
10. `packages/rules-engine/src/wizard-fifth-level.ts` **nuevo**
11. `packages/rules-engine/tests/wizard-levels-8-9-54.test.ts` **nuevo**
12. `packages/rules-engine/tests/wizard-levels-4-5-52.test.ts`
13. `packages/rules-engine/tests/wizard-levels-6-7-53.test.ts`
14. `packages/rules-engine/tests/wizard-spell-library-51-1.test.ts`
15. `docs/implementation/PASO_54_MAGO_NIVELES_8_Y_9.md` **nuevo**

Se distribuyen únicamente estos archivos con las rutas relativas originales. No se incluyen dependencias, `node_modules`, carpetas generadas ni migraciones.
