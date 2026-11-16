# PASO 51.1 · Asistente compartido de progresión y biblioteca de conjuros

**Proyecto:** Crónicas, editor y hoja de personaje D&D 2024.  
**Entrega:** 51.1, entre los pasos 51 (Mago 1→3) y 52 (Mago 4→5).  
**Referencia reglamentaria:** *Player's Handbook* (2024), especialmente clase Mago pp. 165–169, reglas de lanzamiento pp. 233–238 y descripciones de conjuros pp. 239–343, consultadas en el ejemplar aportado al proyecto.  
**Alcance:** refactorización de presentación, catálogo consultable y elección manual de conjuros; **sin nuevos niveles de clase**, migraciones de base de datos o cambios de dependencias.

## 1. Necesidad detectada

El Guerrero disponía de un asistente de subida de nivel con tres etapas explicativas; el Mago usaba otro diseño, más breve, y obligaba a elegir conjuros sin poder consultar fácilmente su efecto. La pestaña de conjuros del Mago carecía de una separación clara entre conjuros preparados, aprendidos y repertorio general. Los rombos de espacios de conjuro resultaban grandes para futuros niveles. El usuario solicitó, además, no impedir preparar ni aprender más conjuros que los que recomienda la progresión reglamentaria.

## 2. Decisiones de arquitectura

### 2.1. Un solo marco para los asistentes de nivel

Se introduce `apps/web/src/components/LevelUpDialogFrame.tsx`, que implementa el diálogo, cabecera, navegación visual de tres pasos, foco inicial, Escape, contenedor y pie. Lo consumen `LevelUpWizard.tsx` (Guerrero) y `WizardLevelUpWizard.tsx` (Mago). Las diferencias están en **el contenido y las reglas**, no en el marco visual. El componente de Guerrero conserva sus validaciones, confirmación atómica y posible recuperación excepcional de sesión. El de Mago conserva la progresión existente 1→2→3 y permite cancelar el borrador sin alterar el personaje.

En el Mago se muestran explícitamente las ganancias de PG máximos, competencia, nuevos recursos de magia y capacidades nuevas. En el nivel 2 se elige la pericia de Erudito; en el 3 se eligen los conjuros nuevos y los gratuitos de Evocación. El usuario puede desplegar cada conjuro antes de escogerlo y revisar su efecto antes de confirmar. **La ventana no escribe en PostgreSQL:** después se utiliza Guardar cambios.

### 2.2. Biblioteca manual sin límites numéricos

Los campos históricos `cantripIds`, `spellbookIds` y `preparedIds` de `GuidedWizardInput` siguen representando las **elecciones de creación y progresión de clase**, que el motor valida conforme a los niveles implementados. Eliminar esos límites del modelo histórico habría invalidado los guardados y el asistente existente.

Se introduce un campo **opcional** `spellSelection` con `{learnedIds, preparedIds}`: representa únicamente la selección de biblioteca que gestiona el jugador en la hoja. No tiene máximo numérico; solo se exige que cada ID pertenezca al catálogo implementado, no aparezca duplicado y que los preparados figuren entre los aprendidos. El usuario puede incluso marcar conjuros de un nivel superior al que puede lanzar, sin que ello conceda ranuras nuevas. Es un comportamiento deliberado de apoyo flexible al jugador y al DM, no una afirmación de legalidad en partidas reglamentarias.

El motor `wizard-spell-library.ts` proporciona funciones puras para aprender, desaprender, preparar, desmarcar y fusionar nuevas adquisiciones al subir de nivel. Al desaprender, el conjuro sale también de preparados; la elección *histórica* de progreso no cambia. Si falta `spellSelection` en un guardado anterior, se deriva de los campos conocidos: no es necesaria migración.

La validación de instantáneas de versión 3 admite el campo nuevo y sigue rechazando otros campos desconocidos. **No hay cambios de esquema Prisma ni migraciones.**

### 2.3. Tres pestañas y catálogo extensible

`SpellLibraryPanel.tsx` es un componente de presentación independiente de la clase; recibe las listas de clase, los datos de los conjuros, los contadores y callbacks. `WizardSpellLibrary.tsx` es un adaptador del Mago y conecta el componente con el motor y su guardado.

- **Preparados:** conjuros cuya casilla `Preparado` está activa, incluidos trucos.
- **Aprendidos:** todos los conjuros marcados como aprendidos; la casilla `Preparado` los añade o retira de la pestaña Preparados.
- **Todos los conjuros:** repertorio completo implementado. La casilla `Aprendido` incorpora o quita el conjuro del libro manual; si se quita, se retira también de Preparados.

Solo en el Catálogo se filtra por **lista de clase** (por ahora Mago), **nivel de conjuro** (casillas 0–9) y **búsqueda** (nombre, escuela y efecto). Los filtros de los niveles 3–9 se muestran de antemano, aunque su contenido se implementará con las próximas progresiones. Los contadores indican los valores de progresión *recomendados*, **no bloquean** selecciones. La biblioteca está preparada para futuras listas de Clérigo, Druida, etc., sin duplicar el componente.

### 2.4. Catálogo de reglas compartido

`wizard-spell-details.ts` declara 90 entradas: **20 trucos, 31 conjuros de nivel 1, 39 de nivel 2**. Cada entrada cuenta con identificación, nivel, escuela, una paráfrasis propia del efecto, página de referencia al manual, tiempo de lanzamiento, alcance, componentes y duración cuando la extracción local ha sido verificable, indicadores de ritual y ataque y dados automatizables cuando procede.

**No se reproduce el texto íntegro del PHB**, que está protegido por derechos de autor; las descripciones son resúmenes propios con información necesaria para orientar decisiones, y la página indicada permite consultar las excepciones y escalados completos. No debe presentarse el resumen como una transcripción oficial exhaustiva. Este es un punto pendiente de revisión editorial durante la expansión por niveles.

La misma ficha `WizardSpellDetails.tsx` aparece en las opciones de subida de nivel y en las tres pestañas de Hechizos. Con ello se evita mantener dos descripciones inconsistentes. La ventana proporciona botones para tiradas d20 de ataque mágico y para fórmulas de daño, curación o dados auxiliares cuando están modeladas. Las fórmulas de trucos escalan en niveles 5, 11 y 17 cuando corresponde; una penalización como el d4 de Fragmento mental **no** escala con el daño.

`spell-dice.ts` valida las fórmulas y usa WebCrypto, con muestreo por rechazo para resultados uniformes; las funciones no modifican la ficha. La gestión de objetivo, salvaciones, concentración, duración, elección de ranura y aplicación de efectos sigue siendo manual. No se automatizan dados o fórmulas no verificadas.

### 2.5. Presentación compacta de ranuras

Se cambia únicamente el CSS de `.spell-diamond`: de aproximadamente `2.05rem` a `1.38rem`, con menos separación y relleno. **No se invierten datos persistidos**: rombo lleno/marcado sigue siendo ranura **disponible** y rombo vacío sigue siendo **gastada**, como se había fijado en el paso 51. El cambio facilita colocar múltiples filas de ranuras en niveles altos.

## 3. Archivos de la entrega

| Ruta | Operación | Responsabilidad |
|---|---|---|
| `apps/web/src/components/LevelUpDialogFrame.tsx` | Nuevo | Estructura visual común de asistentes |
| `apps/web/src/components/LevelUpWizard.tsx` | Modificado | Guerrero: usa marco común sin perder sus reglas |
| `apps/web/src/components/WizardLevelUpWizard.tsx` | Modificado | Mago: asistente de tres etapas y consulta de conjuros |
| `apps/web/src/components/SpellLibraryPanel.tsx` | Nuevo | Tres pestañas y filtros genéricos |
| `apps/web/src/components/WizardSpellLibrary.tsx` | Nuevo | Adaptador de reglas del Mago |
| `apps/web/src/components/WizardSpellDetails.tsx` | Nuevo | Desplegable de descripción y tiradas |
| `apps/web/src/app/wizard/page.tsx` | Modificado | Integra biblioteca y botón de ataque mágico |
| `apps/web/src/app/globals.css` | Modificado | Estilos, filtros, responsividad y rombos compactos |
| `packages/rules-engine/src/wizard-spell-library.ts` | Nuevo | Selección manual sin límites numéricos |
| `packages/rules-engine/src/wizard-spell-details.ts` | Nuevo | 90 fichas con datos de reglas |
| `packages/rules-engine/src/spell-dice.ts` | Nuevo | Parser y tiradas seguras |
| `packages/rules-engine/src/wizard-creation.ts` | Modificado | Campo opcional y validación de snapshot |
| `packages/rules-engine/src/wizard-level-up.ts` | Modificado | Preservación y fusión de biblioteca manual |
| `packages/rules-engine/tests/wizard-spell-library-51-1.test.ts` | Nuevo | Pruebas del catálogo, selección y dados |
| `docs/implementation/PASO_51_1_ASISTENTE_Y_BIBLIOTECA_HECHIZOS.md` | Nuevo | Esta memoria técnica |

## 4. Pruebas y evidencias

Se comprobó el tipado estricto del motor y de componentes modificados con TypeScript; para TSX se utilizaron declaraciones ambientales de React/Next de prueba, no una compilación integral del proyecto. Se ejecutaron comprobaciones directas compilando los tests y con un adaptador local de aserciones: **71/71** de los bloques de Mago (fases 47, 48, 50, 50.1, 51 y 51.1), y **37/37** de bloques de Guerrero, nivel y proyección de magia de origen. Estos resultados no equivalen a la ejecución oficial de Vitest. Los casos incluyen:

1. El repertorio tiene los 90 conjuros esperados, sin IDs repetidos y con referencias de página.
2. Un guardado anterior sin `spellSelection` sigue cargándose y mostrando su libro.
3. Aprender, preparar y desaprender actualiza la biblioteca sin alterar el historial reglamentario.
4. Seleccionar 25 aprendidos y 25 preparados es válido; los contadores son informativos.
5. Una preparación de conjuro desconocido o no aprendido es rechazada.
6. Los guardados con biblioteca manual mantienen los datos al subir de nivel 1→2→3.
7. La generación de dados, el escalado de trucos y los dados que **no** escalan se validan.
8. Rayo debilitador utiliza salvación y Rayo de enfermedad no pide salvación adicional tras impactar.
9. Los Guerreros mantienen su asistente y progresión de nivel 1→20 sin cambios de reglas.

**Pendiente en Windows del usuario:** `pnpm lint`, `pnpm test`, `pnpm build`, pruebas manuales en navegador y verificación real de guardado/recuperación PostgreSQL. No se ha afirmado haber ejecutado esos comandos en este entorno aislado.

### Matriz manual de aceptación

- [ ] Cargar un Guerrero existente; abrir su asistente y comprobar las etapas Novedades/Elecciones/Confirmación.
- [ ] Cargar un Mago de nivel 1; abrir el asistente y confirmar que usa idéntico marco.
- [ ] En el nivel 2, consultar reglas de los conjuros antes de elegirlos; cerrar sin confirmar y verificar que nada cambió.
- [ ] Elegir conjuros y avanzar a nivel 2 y después al 3, guardando el personaje.
- [ ] En Hechizos, aprender desde Catálogo, preparar desde Aprendidos y consultar en Preparados; desmarcar y verificar la retirada.
- [ ] Exceder intencionadamente el número reglamentario recomendado y comprobar que la interfaz no impide continuar.
- [ ] Aplicar filtros de nivel 0, 1 y 2, casilla de lista Mago y búsqueda de texto. Los niveles 3–9 muestran resultados vacíos por ahora.
- [ ] Desplegar conjuros con componentes materiales, realizar una tirada de conjuro, y otra con el botón de ataque mágico.
- [ ] Comprobar que tirar no gasta ranuras ni modifica PG de nadie.
- [ ] Guardar, salir al menú, recuperar el Mago y comprobar selección aprendida/preparada y ranuras gastadas.
- [ ] Confirmar que los rombos compactos conservan la semántica marcado=disponible.
- [ ] Revisar disposición en pantalla pequeña y con zoom del navegador.

## 5. Limitaciones y decisiones diferidas

- La progresión **interactiva** del Mago sigue llegando solo al nivel **3**; no se han añadido los niveles 4–20.
- El catálogo de conjuros cubre únicamente los niveles 0–2 y solo la lista implementada del Mago. No se han implementado los conjuros de otras clases ni los niveles 3–9.
- La selección libre manual puede contener conjuros que el personaje no podría aprender o preparar conforme al reglamento. Es una funcionalidad solicitada para juego flexible y homebrew, distinta de las opciones legales de progresión.
- Las fichas de conjuro son **resúmenes reglamentarios** y referencias, no el texto oficial íntegro. Algunas excepciones, escalados por ranura, efectos situacionales y requisitos de materiales exigen consultar la página citada. Las fichas se ampliarán durante la implementación por niveles.
- No se aplican automáticamente efectos, daño, concentración, salvaciones, selección de objetivos ni gasto de ranuras. Solo se lanzan dados cuando el jugador pulsa un botón.
- No se modifican Prisma, migraciones, dependencias ni tipos de guardado de otras clases.

## 6. Próxima entrega propuesta: actualización 52

Incorporar progresión guiada del Mago **niveles 4 y 5**, con mejora de característica, ajuste de valores y PG, actualización de preparados y espacios, desbloqueo de conjuros de **nivel 3** y su incorporación al catálogo y fichas de consulta. Conservar el marco común del asistente y la biblioteca manual flexible.
