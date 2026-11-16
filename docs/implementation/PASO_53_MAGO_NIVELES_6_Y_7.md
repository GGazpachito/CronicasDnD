# Paso 53. Progresión del Mago de niveles 6 y 7 y catálogo de magia de nivel 4

**Proyecto:** Crónicas, creador/hoja digital para D&D (revisión 2024)  
**Fecha:** 16 de noviembre de 2026  
**Estado:** implementación incremental elaborada y verificada mediante TypeScript y aserciones locales. Pendiente validación de lint, Vitest oficial, compilación de Next.js y PostgreSQL por parte del usuario.

## 1. Contexto y objetivo

Tras las actualizaciones 47–52, el motor genérico del Mago ya definía veinte niveles, pero la experiencia de creación guiada solamente admitía niveles 1–5. El paso 53 incorpora **los niveles 6 y 7 de Mago/Evocación**, sin duplicar las hojas compartidas ni el asistente utilizado por otras clases. Se amplía el catálogo para incluir todos los conjuros de **nivel de conjuro 4 presentes en la lista de Mago del manual de 2024**, con un resumen original de consulta, datos de lanzamiento y tiradas de dados cuando están definidas.

Deben mantenerse todos los principios de las entregas anteriores: los jugadores toman las decisiones activas; la web calcula características, ranuras y progresión, pero no decide blancos ni aplica daños automáticamente; el guardado es manual; el menú de inicio sigue siendo «Crear personaje / Cargar personaje»; y no se crea una hoja nueva para cada clase.

## 2. Referencia reglamentaria y contraste

Referencia principal: **Player's Handbook, edición 2024** facilitado por el usuario. Páginas impresas del libro:

- **165–167:** reglas de lanzamiento y libro de conjuros del Mago, progresión de preparados, recuperación arcana y conjuros nuevos por nivel.
- **166:** tabla oficial de clase: nivel 6 (competencia +3, 4 trucos, 10 preparados, ranuras 4/3/3), nivel 7 (competencia +3, 4 trucos, 11 preparados, ranuras 4/3/3/1).
- **169–170:** lista de **29 conjuros de nivel 4** del Mago en el manual, separados de las opciones de las demás clases.
- **174:** subclase Evocación. En nivel 6 obtiene *Sculpt Spells* (Esculpir conjuros), que permite designar `1 + nivel del conjuro` criaturas visibles afectadas para superar automáticamente sus salvaciones y evitar el daño residual. En nivel 7 no gana otro rasgo de subclase, pero *Evocation Savant* (Experto en Evocación) concede **un nuevo conjuro gratuito de esa escuela** por alcanzar un nivel nuevo de ranuras mágicas.
- **239–343:** capítulos individuales de los conjuros, usados como fuente para redactar los resúmenes originales y sus datos de lanzamiento.

**Notas de interpretación:** nivel de personaje 7 no significa conjuro de nivel 7: el Mago accede por primera vez a una ranura de **nivel de conjuro 4**. La capacidad de protección Esculpir conjuros es **manual en la interfaz**: el motor ya cuenta con `evokerSculptMaximum`, pero no selecciona criaturas ni resuelve salvaciones automáticamente. Los textos del catálogo son **resúmenes propios**, no transcripciones extensas del manual. Para excepciones y bloques de estadísticas de criaturas invocadas se conserva la cita a la página correspondiente.

## 3. Diseño e implementación

### 3.1. Modelo de persistencia y validación

Se amplían `GuidedWizardInput.level` y `WizardLevelOneView.level` de los valores 1–5 a **1–7**, manteniendo la identidad de las clases y el contrato anterior. Se introduce el campo opcional `evokerLevelFourSpellId?: string`, que solo puede estar presente desde nivel 7. La validación comprueba:

1. Que el identificador exista en el catálogo oficial del Mago.
2. Que corresponda a la escuela de Evocación.
3. Que sea como máximo de nivel de conjuro 4.
4. Que no esté repetido ni entre los conjuros ordinarios, ni en las elecciones gratuitas previas de Evocación.
5. Que no se suministre prematuramente en nivel 6 o inferior.

El tipo conserva `evokerBonusSpellIds` (los dos conjuros elegidos al iniciar la subclase en nivel 3) y `evokerLevelThreeSpellId` (regalo por desbloquear el nivel de ranura 3 cuando el Mago alcanza nivel 5). Se añade el nuevo identificador a la lista de atributos permitidos de los snapshots y al catálogo de la biblioteca manual. No cambia `schemaVersion: 3`, ni la API de personajes, ni el esquema PostgreSQL.

### 3.2. Subida de nivel transaccional

`prepareWizardLevelUp()` amplía los saltos consecutivos hasta **5→6 y 6→7**. El borrador sigue sin modificar el objeto original; calcula primero una hoja final validada y devuelve de manera atómica el nuevo `input`, los recursos `state`, el listado de rasgos obtenidos y la variación de PG.

| Transición | Conjuros regulares | Especialización y rasgos | Ranuras y preparación |
|---|---|---|---|
| 5→6 | Añadir dos conjuros nuevos, niveles 1–3 | Esculpir conjuros | 4/3/3, 10 preparados |
| 6→7 | Añadir dos conjuros nuevos, niveles 1–4 | Un conjuro adicional gratuito de Evocación, niveles 1–4 | 4/3/3/1, 11 preparados |

La implementación **no impone límites numéricos** en las casillas manuales de «Aprendidos / Preparados / Todos los conjuros», respetando la decisión del usuario. Las elecciones obligatorias de subida de nivel sí continúan sujetas a las reglas oficiales; ambas capas de datos se sincronizan sin confundirse. Esto evita invalidar guardados de Magos con biblioteca manual ampliada.

La actualización a nivel 7 inserta una ranura adicional de nivel 4 marcada internamente como disponible. Todas las marcas gastadas de niveles anteriores conservan su estado y posición relativa.

### 3.3. Asistente e interfaz comunes

Se reutiliza la misma ventana de tres pasos del Guerrero: **Novedades → Elecciones → Confirmación**. No se modifica el diseño compartido.

- **Novedades**: presenta «Esculpir conjuros» con su explicación cuando se alcanza el nivel 6; en el 7 explica el conjuro gratuito de Evocación, los PG nuevos, las ranuras y los preparados.
- **Elecciones**: lista el catálogo acorde al nivel de ranura disponible, con los desplegables compartidos `WizardSpellDetails`. En el paso 7 aparece un grupo independiente para el conjuro gratuito, de forma que no compita con las dos elecciones habituales y se impidan los duplicados.
- **Confirmación**: ofrece comparación de PG, competencia, CD, ataque mágico, conjuros, preparados y ranuras, más las descripciones de los conjuros adquiridos.

La página `/wizard` habilita el botón de subida cuando el personaje tiene nivel menor de 7. La etiqueta de siguiente paso se actualiza a **nivel 8** al alcanzar el límite implementado. Se amplían los renderizados de rombos en **Principal y Hechizos** de niveles 1–3 a **niveles 1–4**; se conserva que el rombo marcado es disponible y el vacío es gastado.

### 3.4. Retroceso seguro

La ventana compartida `LevelDownDialog` ahora acepta los saltos **7→6 y 6→5** además de los anteriores. Se retiran exactamente los dos conjuros regulares elegidos en el nivel que se pierde y, cuando procede, el conjuro gratuito de nivel 7. El rasgo Esculpir conjuros solo desaparece al retroceder desde nivel 6. Las ranuras que desaparecen y sus marcas se eliminan; el resto de datos se conserva si es compatible.

Durante esta implementación se detectó un caso adicional de regresión heredado del paso 52: en el descenso **6→5** debía conservarse `evokerLevelThreeSpellId`. Ahora ambos identificadores (`evokerLevelThreeSpellId` y `evokerLevelFourSpellId`) se vuelven a incorporar al objeto resultante solo cuando el nivel inferior lo permite. Se prueban explícitamente ambas condiciones.

### 3.5. Catálogo de conjuros reutilizable

Se crea `wizard-fourth-level.ts` con **29 entradas tipadas**, todas con ID único, nivel de conjuro, escuela, nombre en español, resumen propio, lanzamiento, alcance, componentes, duración y página de referencia. Las fichas con dados definidos incluyen acciones específicas, como:

- *Tormenta de hielo*: `2d8` contundente y `4d6` frío.
- *Marchitar*: `8d8` necrótico.
- *Esfera vitriólica*: `10d4` ácido inicial y `5d4` retardado cuando corresponda.
- *Muro de fuego*: `5d8` fuego por exposición.
- *Conjurar elementales menores*: `2d8` adicional al impacto, sujeto a las condiciones del conjuro.

Los conjuros sin una tirada que pueda ejecutarse de manera independiente presentan su información sin botones de dados ficticios. Invocaciones que requieren bloques de estadísticas no se ejecutan automáticamente. La pestaña de Hechizos y el asistente obtienen sus descripciones de la **misma fuente**, evitando divergencias.

El catálogo total pasa de **122 a 151 entradas**: 20 trucos, 31 conjuros de nivel 1, 39 de nivel 2, 32 de nivel 3 y 29 de nivel 4. Los filtros por nivel y la búsqueda ya estaban desarrollados y aprovechan directamente el catálogo ampliado.

## 4. Pruebas y resultados observados

**Comprobaciones realmente ejecutadas en este entorno:**

- Chequeo estricto de TypeScript del motor: satisfactorio.
- Chequeo estricto TSX de las páginas `/wizard` y `WizardLevelUpWizard`, mediante definiciones aisladas de React y Next.js: satisfactorio. No equivale a ejecutar el build de Next.js.
- **12 pruebas nuevas** de nivel 6/7: catálogo, rasgo de Evocación, ranuras de nivel 4, conjuros y preparados, decisiones inválidas, Recuperación arcana, subidas y bajadas, persistencia y biblioteca manual: superadas.
- Regresión focalizada del Mago y sistemas compartidos: **117 casos locales**, 0 fallos.
- Pruebas compiladas de todos los módulos del motor (62 archivos de tests): **912 casos locales**, 0 fallos. Utilizaron un adaptador local de aserciones y código compilado a CommonJS, **no Vitest oficial**.
- Integridad de los archivos y del ZIP: comprobar con el listado y pruebas ZIP antes de su entrega.

**Pendiente de validar en el equipo del usuario:**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

La base de datos real, los estilos visuales en navegadores y el mecanismo completo de prerenderizado de Next.js **no se ejecutaron** en el entorno de preparación. No deben describirse en el TFG como probados hasta registrar los resultados correspondientes.

### Matriz de aceptación manual

1. Cargar un Mago de nivel 5 y gastar dos ranuras distintas; abrir el asistente de nivel 6, comprobar «Esculpir conjuros», cancelar y verificar que no se alteró la ficha.
2. Subir a nivel 6, incorporar dos conjuros de niveles 1–3, elegir un nuevo preparado y comprobar la nueva ranura de nivel 3 y la conservación de las gastadas.
3. Consultar Esculpir conjuros en Rasgos. Verificar que explica el límite 1 + nivel de conjuro, la salvación automática y la ausencia de daño residual, sin resolver objetivos automáticamente.
4. Subir a nivel 7, elegir dos conjuros ordinarios y una Evocación adicional. Confirmar que el sistema impide que esta última repita un conjuro ya conocido o pertenezca a otra escuela.
5. Verificar en Principal y Hechizos el rombo de **nivel 4**; gastarlo y recuperarlo mediante Recuperación arcana (límite de cuatro niveles), y comprobar el uso único por descanso largo.
6. Seleccionar **Todos los conjuros**, filtrar lista Mago y nivel de conjuro 4, abrir fichas y utilizar varios botones de dados. Marcar algunos como aprendidos y preparados, incluso por encima del cupo recomendado.
7. Guardar el Mago 7 en PostgreSQL. Volver al menú, abrir la galería, recuperar el personaje y comprobar nivel, biblioteca, retrato, inventario y estado de ranuras.
8. Bajar 7→6; comprobar la pérdida de la ranura de nivel 4 y el conjuro gratuito correspondiente. Bajar 6→5 y comprobar que desaparece Esculpir conjuros **sin perder** el conjuro gratuito elegido en nivel 5.
9. Abrir un Guerrero guardado; confirmar que no hay diferencias en sus pestañas, progreso ni inventario.
10. Registrar el resultado de `pnpm lint`, `pnpm test` y `pnpm build`, con fecha y capturas de los pasos 1–9 en el apartado de pruebas del TFG.

## 5. Riesgos, límites y próximos pasos

| Riesgo | Mitigación |
|---|---|
| Al ampliar el nivel máximo, la validación admite elecciones inexistentes | Validación de nivel, escuela, ausencia de duplicados y estado completo antes de confirmar |
| Los conjuros gratuitos de Evocación de 3 y 5 se borran al subir o bajar | Conservación explícita por nivel de adquisición y tests de regresión |
| El Mago usa ranura nivel 4 pero no se muestra | Ambas vistas de rombos amplían su mapa hasta 4 |
| Recuperación arcana restaura más niveles de los permitidos | Cálculo por `ceil(nivel/2)`, ranuras gastadas disponibles y uso único |
| Se rompen guardados anteriores | Nuevo atributo opcional, mismos tipos de snapshot y esquema de BD |
| El catálogo muestra nombres sin detalles | Una única fuente tipada con descripciones, metadatos y tiradas enlazadas |
| Se automatizan efectos activos no deseados | Tiradas bajo clic; objetivos, salvaciones, daños y conjuros de invocación siguen manuales |
| Un test previo esperaba límite nivel 5 o 122 conjuros | Actualización de expectativas obsoletas, sin borrar pruebas funcionales |

**Limitaciones deliberadas:** solamente la subclase Evocación; la progresión interactiva del Mago llega a nivel **7**; no se han implementado las dotes alternativas de los niveles de Mejora de característica; las fichas son resúmenes originales con referencia al manual; quedan pendientes los conjuros de niveles 5–9, ajustes posteriores de Evocación y las mecánicas de combate que el proyecto ha decidido no automatizar.

**Próxima actualización propuesta, paso 54:** progresión del Mago a **niveles 8 y 9**, con Mejora de característica en el 8, nuevos conjuros de nivel 5 en el 9, nuevo regalo de Evocación cuando se desbloquea la ranura de nivel 5, actualización del retroceso y ampliación del catálogo. Mantener la misma ventana y las mismas seis pestañas.

## 6. Relación de archivos que se entregan

- `apps/web/src/app/wizard/page.tsx`
- `apps/web/src/components/WizardLevelUpWizard.tsx`
- `packages/rules-engine/src/level-down.ts`
- `packages/rules-engine/src/wizard-creation.ts`
- `packages/rules-engine/src/wizard-fourth-level.ts` **nuevo**
- `packages/rules-engine/src/wizard-level-up.ts`
- `packages/rules-engine/src/wizard-slot-marks.ts`
- `packages/rules-engine/src/wizard-spell-details.ts`
- `packages/rules-engine/src/wizard-spell-library.ts`
- `packages/rules-engine/src/wizard-traits.ts`
- `packages/rules-engine/tests/wizard-levels-4-5-52.test.ts`
- `packages/rules-engine/tests/wizard-levels-6-7-53.test.ts` **nuevo**
- `packages/rules-engine/tests/wizard-spell-library-51-1.test.ts`
- `docs/implementation/PASO_53_MAGO_NIVELES_6_Y_7.md` **nuevo**

No se incluyen `node_modules`, cambios de dependencias, migraciones de base de datos ni otros archivos anteriores del proyecto.
