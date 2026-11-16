# Paso 50. Unificación de módulos de ficha y marcadores de ranuras

**Proyecto:** Crónicas, creador y hoja de personaje D&D 2024.  
**Fecha de preparación:** 16 de noviembre de 2026.  
**Alcance:** presentación común para Guerrero y Mago (nivel 1 en su interfaz actual), persistencia de inventario del Mago, galería como vía de carga y representación interactiva de espacios de conjuro.  
**Referencia de partida:** actualización 49, con la corrección 49.1 aplicada.  
**Estado:** implementación preparada y validada mediante pruebas de motor aisladas; pruebas completas de Next.js, ESLint, Vitest y PostgreSQL pendientes de ejecución en el equipo del desarrollador.

## 1. Necesidad y requisitos

La aplicación había evolucionado de una hoja exclusiva para el Guerrero a un gestor multiclase. Aunque el paso 49 incorporaba una página inicial y una estructura común de Principal, el Mago todavía mantenía inventario y Rasgos reducidos; ambas fichas incluían un panel de carga redundante dentro del personaje. Se solicitó:

1. Usar los **mismos componentes y formato** para Principal, Rasgos, Equipo y Personaje en todas las clases. La clase debe proporcionar datos y recursos, no su propia interfaz duplicada.
2. Representar los espacios de conjuro mediante **rombos individuales, marcables y desmarcables**, con estado persistente.
3. Mantener `/` como menú principal con **Crear personaje** y **Cargar personaje**.
4. Efectuar toda carga mediante la galería `/load`, cuyas tarjetas muestran el retrato y los datos guardados. Retirar los controles de listado y carga dentro de las hojas y dejar **un único botón de guardado**.
5. Retirar los selectores de Guerrero/Mago de las fichas. Elegir la clase únicamente en `/create`.
6. Evitar regresiones y conservar los Magos/Guerreros guardados con anterioridad.

## 2. Criterios arquitectónicos

Se descartó copiar código de una página a otra, porque esa solución habría producido nuevas divergencias en accesibilidad, validación y reglas. Se conserva una **composición por adaptadores**, con la misma UI y distinta fuente de datos:

| Componente de interfaz | Guerrero | Mago |
|---|---|---|
| `SharedPrincipalSheet` | A través de `PrincipalOverview` | Directo con datos de `calculateGuidedWizardOne` |
| `TraitsPanel` | Colección del motor de Guerrero | Proyección `collectWizardTraits` |
| `EquipmentPanel` | Inventario existente | Inventario común mediante `wizardInventory` |
| `CharacterProfilePanel` | Perfil de Guerrero | Mismo componente de perfil |
| `CharacterTabs` | Seis pestañas existentes | Las mismas seis pestañas |
| `SheetPlaceholder` (Combate) | Pendiente | El mismo componente pendiente |
| `SaveLoadPanel` | Validador y snapshot de Guerrero | Validador y snapshot de Mago |

Las reglas no se mezclan: cada clase mantiene el cálculo y el modelo de sesión que le corresponde. `SaveLoadPanel` es genérico sobre el tipo de snapshot; su método de validación procede de cada motor y verifica además `characterClass` y `level` cuando carga una ficha. Las mismas pantallas no equivalen a recursos idénticos.

### Enrutamiento

- `/`: pantalla principal ya introducida en la actualización 49; se mantiene como entrada predeterminada.
- `/create`: elección de clase para personaje **nuevo** a nivel 1.
- `/load`: galería de personajes guardados, tarjetas con retrato, nombre, nivel, especie, clase y subclase cuando exista.
- `/fighter?character=<id>` y `/wizard?character=<id>`: apertura de la ficha existente por identificador.
- `/fighter?new=1` y `/wizard?new=1`: creación en blanco. Cada ficha tiene un enlace de regreso al menú, no un selector de clase.

**No se ha modificado** ni duplicado la lógica de rutas `/`, `/create` ni `/load`: ya estaban establecidas. Se sustituyó exclusivamente el panel embebido de guardado/carga dentro de las fichas.

## 3. Guardado y carga: una sola responsabilidad por pantalla

`SaveLoadPanel` recibe `snapshot`, `characterClass`, `validate`, `onLoad` y un normalizador opcional. El componente muestra **un botón**, «Guardar personaje» si es nuevo y «Guardar cambios» si existe un registro cargado. El estado visual «Guardado al día» o «Cambios sin guardar» compara el snapshot serializado con la revisión persistida.

La carga desde `/load` no está duplicada dentro de las hojas. Al entrar en una URL con `?character=<id>`, el propio componente consulta **solo ese registro**, valida que pertenezca a la clase mostrada y conserva su `id` y `revision`. Al guardar se hace `PUT` con esa revisión; para nuevos personajes se utiliza `POST`. Esto protege frente a sobrescribir otro personaje o crear un duplicado tras abrir una tarjeta. Se mantiene un aviso de salida ante cambios pendientes.

El componente no modifica las rutas de la API ni ejecuta operaciones de base de datos en cliente aparte de las solicitudes existentes. No hay migraciones ni cambios de esquema Prisma.

**Decisión:** normalizar el snapshot validado de Magos antiguos con `makeWizardCharacterSnapshot` antes de comparar cambios. Se evita tratar campos históricos opcionales, ausentes en registros anteriores, como si fueran modificaciones del usuario.

## 4. Inventario del Mago sobre el motor común

Se creó `wizard-inventory.ts`, que transforma la elección de equipo y el trasfondo del Mago al modelo de inventario común. Se usan `replayInventory`, `InventoryAction` y `InventoryState`, **sin un segundo motor de compras**.

La alternativa de equipo inicial del Mago se modela con dos dagas, un bastón que hace de foco arcano, una túnica, el libro de conjuros, la bolsa de erudito y 5 po. La opción monetaria concede 55 po y conserva el libro de conjuros que exige el rasgo de lanzamiento. Se aplica el equipo del trasfondo según su configuración, incluyendo monedas; `spellbook` y `scholars_pack` se incorporan al catálogo común solo con los identificadores necesarios. La referencia es el **Manual del Jugador 2024, p. 165**, sección Wizard, apartado Starting Equipment.

El inventario calculado es la fuente de información de `EquipmentPanel` y también de los ataques manuales del Mago. Se incluye `BasicWeaponAttacks` para tirar con sus armas equipadas, con competencia solamente en armas simples. No se asignan las maestrías y rasgos marciales exclusivos del Guerrero. La CA se proyecta a partir del equipo; equipar un escudo sin competencia no suma automáticamente su bonificación.

**Persistencia compatible:** `backgroundEquipment` e `inventoryActions` son campos opcionales del `GuidedWizardInput`. La ausencia de esos campos en guardados de versiones previas se interpreta como equipo inicial por defecto, no como un error. El validador del snapshot permite los campos nuevos y rechaza nombres de campos desconocidos.

**Limitación de reglas:** poder incorporar equipo a un inventario no implica ser competente con él. La interfaz avisa de que un Mago sin entrenamiento en armaduras/escudos puede tener consecuencias para lanzar conjuros; la aplicación no simula efectos no implementados del lanzamiento al llevar ese equipo.

## 5. Rasgos: catálogo único, contenido específico

El componente `TraitsPanel` recibe opcionalmente la colección ya proyectada por el motor. Para el Mago se genera mediante `collectWizardTraits` y se presentan los rasgos de clase, especie y dote de origen; la misma UI muestra explicaciones, filtros, estados de automatización y detalles. El Guerrero sigue empleando `collectCharacterTraits`.

No se añade una subclase de Mago inexistente: Evocación estará disponible cuando se implemente la subida interactiva a nivel 3. La explicación del rasgo no equivale a que se encuentre automatizado.

## 6. Ranuras de conjuro: rombos interactivos

Se creó `SpellSlotDiamonds.tsx`, componente **reutilizable por nivel de conjuro**. Recibe un nivel, un array de booleanos y una función de cambio. Cada booleano representa una ranura independiente:

- Rombo sin marcar: **disponible**.
- Rombo marcado: **gastado**.
- Cada rombo es un botón accesible con `aria-pressed`, nombre individual y foco visible.
- Los marcadores son interactivos y se sincronizan inmediatamente con el contador de ranuras restantes.

El componente no conserva contadores internos. El estado permanece en el motor `wizard-slot-marks.ts`: `toggleWizardSlotMark`, `recoverWizardArcaneSlot` y `resetWizardSlots`. Para el nivel 1 actual del Mago se renderizan dos rombos. La regla de ranuras y recuperación se basa en el Manual del Jugador 2024, **pp. 166–167**. Al marcar/desmarcar un rombo se gestiona un recurso, **no se lanza automáticamente un conjuro**.

Recuperación arcana limpia una marca gastada cuando corresponde; el descanso largo limpia ambas. La marca opcional `slotMarks` se serializa junto a la sesión del Mago. Los guardados antiguos, que solo tenían contador de ranuras restantes, siguen siendo aceptados y las marcas se reconstruyen a partir del gasto conocido. Las marcas persistidas se validan contra ese mismo contador para evitar discrepancias.

Cuando otros lanzadores tengan múltiples niveles de conjuro, este mismo componente se podrá representar una vez por nivel con las ranuras correspondientes. **No se ha implementado todavía ese nuevo motor multiclase**.

## 7. Límites conocidos y decisiones diferidas

- La **creación y progresión interactiva** del Mago siguen limitadas al nivel 1. Existe el núcleo de reglas 1–20 de la actualización 47, pero aún falta el asistente y la persistencia de progresión.
- La pestaña Hechizos continúa siendo específica del Mago y no se ha rehecho en esta actualización; se integrará en el esquema común en etapas siguientes.
- La aplicación no aplica de manera automática conjuros, concentraciones, objetivos, daños por área ni decisiones del DM.
- Algunas dotes de origen de Mago y la magia de especie requieren más opciones/automatizaciones que se implementarán posteriormente.
- El nuevo módulo de armas simples no sustituye el de ataques marciales del Guerrero; ambos comparten inventario pero no sus reglas de combate.
- El formato compartido no equivale a que ya exista soporte de todas las clases de D&D.
- No se ha modificado el contenido de los guardados antiguos in situ, ni se han migrado registros automáticamente.

## 8. Archivos afectados

| Ruta | Acción |
|---|---|
| `apps/web/src/app/page.tsx` | Texto del menú inicial actualizado al nuevo botón de guardado. |
| `apps/web/src/app/fighter/page.tsx` | Elimina cambio de clase y cargador embebido; mantiene hoja y guardado. |
| `apps/web/src/app/wizard/page.tsx` | Reutiliza los módulos de ficha, inventario, rasgos, perfil y guardado. Integra rombos. |
| `apps/web/src/app/globals.css` | Diseño y estados de los rombos y guardado reducido. |
| `apps/web/src/components/SaveLoadPanel.tsx` | Operación única de guardado y carga directa por URL de una ficha existente. |
| `apps/web/src/components/TraitsPanel.tsx` | Permite una colección de rasgos externa con la misma UI. |
| `apps/web/src/components/SpellSlotDiamonds.tsx` | Nuevo control genérico de ranuras con marcas individuales. |
| `apps/web/src/components/BasicWeaponAttacks.tsx` | Apoyo manual de armas simples para Mago. |
| `packages/rules-engine/src/background-equipment.ts` | Catálogo mínimo de libro y bolsa de erudito. |
| `packages/rules-engine/src/wizard-creation.ts` | Inventario común y validación/persistencia de marcas; compatibilidad anterior. |
| `packages/rules-engine/src/wizard-inventory.ts` | Adaptador de equipamiento del Mago al inventario común. |
| `packages/rules-engine/src/wizard-slot-marks.ts` | Lógica pura para ranuras y recuperaciones. |
| `packages/rules-engine/src/wizard-traits.ts` | Adaptador de rasgos del Mago para `TraitsPanel`. |
| `packages/rules-engine/src/index.ts` | Exportaciones de los nuevos módulos. |
| `packages/rules-engine/tests/shared-sheets-50.test.ts` | Pruebas de regresión de la actualización. |
| `docs/implementation/PASO_50_HOJAS_COMPARTIDAS_Y_RANURAS_ROMBO.md` | Esta memoria técnica. |

## 9. Verificación y evidencias

**Verificado en el entorno de preparación:**

- Chequeo estricto de TypeScript del motor (`tsc --strict --noEmit` sobre `src/index.ts`).
- Chequeo de tipos de las páginas y componentes con un stub aislado de React para el entorno disponible; **no constituye una compilación oficial de Next.js**.
- 10 casos nuevos de `shared-sheets-50.test.ts`: inventario inicial, variante de dinero, transacciones, operaciones inválidas, CA sin formación, rombos individuales, Recuperación arcana y descanso largo, guardados antiguos, discrepancias de ranuras, y catálogo de rasgos.
- 13 casos anteriores de `wizard-48.test.ts` y 4 de `character-navigation-49.test.ts`: **27 casos** en un ejecutor de aserciones local. No se afirma que se haya ejecutado la suite completa de Vitest.

**Pendiente en el ordenador del desarrollador:**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

**Pruebas manuales sugeridas para el TFG (registrar resultado y captura):**

1. Abrir `/` y comprobar que muestra únicamente «Crear personaje» y «Cargar personaje».
2. Pulsar Crear y elegir Guerrero. Comprobar seis pestañas, sin selector de clase ni galería interna y con un botón de guardado.
3. Elegir Mago desde `/create`; completar la creación, abrir Rasgos, Equipo, Principal y Personaje, y comprobar que comparten los componentes visuales del Guerrero.
4. Equipar una daga desde Equipo en el Mago, realizar una tirada desde Principal y guardar. Recuperar y verificar la misma selección.
5. Pulsar un rombo de ranura; verificar que queda marcado y disminuye de 2/2 a 1/2. Desmarcarlo; comprobar restauración.
6. Gastar ambas ranuras, usar Recuperación arcana, comprobar que se recupera una; ejecutar descanso largo y comprobar que quedan ambas disponibles.
7. Guardar un Mago con una marca gastada y retrato. Abrirlo desde su tarjeta en `/load`; comprobar retrato, inventario, rasgos, ranuras y que «Guardar cambios» **actualiza** en lugar de duplicar.
8. Abrir un Mago guardado en la actualización 48/49; verificar que se recupera aunque no contenga `slotMarks` ni `inventoryActions`.
9. Abrir un Guerrero antiguo desde la galería, modificar PG y pulsar «Guardar cambios». Comprobar que el identificador y la revisión se mantienen actualizados.
10. Con cambios pendientes, volver al menú y comprobar la advertencia de salida. Probar en tamaños de pantalla de móvil y escritorio.

**No declarar como comprobadas** las pruebas de PostgreSQL real ni de navegador hasta registrar sus resultados en el entorno del usuario.

## 10. Próxima iteración prevista

**Actualización 51: progresión del Mago a partir del nivel 1.** Primer objetivo: adaptar su asistente de subida de nivel a la ficha compartida, con elecciones de conjuros y actualización atómica de espacios, libro, preparación y sesión, sin duplicar interfaces. La implementación se planificará por intervalos y continuará hasta el nivel 20 y Evocación.
