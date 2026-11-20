# Arquitectura normativa: ventanas de subida y bajada de nivel (actualizada en paso 77)

> **CONTRATO OBLIGATORIO DE UI Y REGLAS PARA TODAS LAS CLASES.** Este documento complementa `ESTRUCTURA_HOJA_COMUN.md`. Ninguna clase nueva debe fabricar sus propios contenedores de progreso, pasos, botones ni estilos. Debe integrar componentes compartidos con un adaptador de reglas de clase.

## A. Subida de nivel: estructura exacta

**Único marco visual y accesible:** `apps/web/src/components/LevelUpDialogFrame.tsx`.

| Parte | Contrato estable | Clases CSS compartidas |
| --- | --- | --- |
| Fondo y ventana | Diálogo modal centrado, foco inicial, cierre con Escape/cerrar/cancelar | `level-wizard-backdrop`, `level-wizard` |
| Cabecera | «PROGRESIÓN · [CLASE] / [SUBCLASE]», «Subir del nivel N al N+1», descripción de confirmación diferida | `level-wizard-top`, `eyebrow`, `level-wizard-close` |
| Paso 0 | **Novedades**: capacidades que se adquieren, explicación, avance de estadísticas y recursos; no aplicar cambios | `level-wizard-section`, `level-wizard-milestones`, `level-wizard-stats`, `level-wizard-explanation` |
| Paso 1 | **Elecciones**: selección de todas las decisiones reglamentarias; incluir SIEMPRE `LevelUpHitPointsPicker`; dar explicaciones y validación inmediata | `level-wizard-section`, `level-wizard-fieldset`, `field`, `level-wizard-ok`, `level-wizard-error` |
| Paso 2 | **Confirmación**: antes/después numérico, nuevos rasgos y elecciones, nota sobre persistencia | `level-wizard-stats`, `level-wizard-choice-info`, `level-wizard-small-list` |
| Pie fijo | Botón Cancelar a la izquierda, Atrás y Siguiente/Confirmar a la derecha; desactivar avance ante elecciones inválidas | `level-wizard-actions`, `level-wizard-cancel`, `level-wizard-back`, `level-wizard-actions-right` |

**Prohibido** usar componentes con `<section role="dialog">` particulares y fondos `.warlock-level-up-overlay`, `.fighter-level-up-overlay`, etc. `LevelUpDialogFrame` recibe `stage` (0, 1, 2), `onClose`, `footer`, y renderiza los hijos de la clase en las tres posiciones. Las únicas diferencias legítimas son `eyebrow`, descripción de rasgos, elecciones reglamentarias y datos. Evitar la duplicación de cabeceras y controles.

**Implementaciones de referencia:** `LevelUpWizard.tsx` (Guerrero), `WizardLevelUpWizard.tsx` (Mago) y `WarlockLevelUpWizard.tsx` (Brujo). Las tres deben utilizar el **mismo** `LevelUpDialogFrame`, botones, clases de estilos y estructura de etapas. La entrada a progresión se presenta desde `CharacterHeader.tsx` mediante `onLevelUp`, nunca con una segunda botonera específica en medio de la página.

## B. Elección de magia durante la subida

La pestaña `Hechizos` de la ficha continúa siendo única e independiente: `SharedSpellsLayout` + `SpellLibraryPanel` + `SHARED_SPELL_RULES`. El asistente de nivel no duplica el catálogo: ofrece únicamente las opciones que **esa clase puede aprender en ese nivel**.

El mismo patrón visual debe aparecer siempre que haya magia para elegir:

1. Campo de **búsqueda por nombre/escuela** (y ampliar a nivel cuando corresponda) dentro de `level-wizard-section`.
2. `fieldset` con título y contador visible, ejemplo «Conjuros preparados (3/3)».
3. `wizard-spell-picker wizard-spell-choice-list` con tarjetas `wizard-spell-option`, selección por casilla/radio y nombre/nivel.
4. Cada hechizo usa el **mismo `WizardSpellDetails`** con texto, datos de reglas y botones de tirada, también si proviene de Brujo.
5. Validación **en el motor de reglas**: no basta bloquear botones. El resultado se calcula antes de entrar en Confirmación.

Ejemplos: Mago aprende dos conjuros de libro por nivel y prepara conforme a progresión; Brujo de 1 a 2 conserva dos trucos (puede sustituir uno), pasa de dos a tres preparados (puede sustituir uno anterior) y escoge tres invocaciones distintas. **Brujo 2→3** conserva tres invocaciones (puede sustituir una), conserva dos trucos (puede sustituir uno), elige cuatro preparados ordinarios (conserva al menos dos de los anteriores), elige Patrón Infernal y ve las cuatro fichas gratuitas de patrón en el mismo asistente. **Brujo 3→4** elige la dote Mejora de característica, aprende un tercer truco, pasa de cuatro a cinco preparados ordinarios y puede sustituir como máximo una invocación, un truco y un preparado anterior. **Brujo 4→5** mantiene tres trucos (puede sustituir uno), elige cinco invocaciones (al menos dos de las tres anteriores y requisitos de pacto), seis preparados ordinarios (al menos cuatro de los cinco anteriores) y recibe dos conjuros adicionales del patrón. Estas restricciones no alteran el aspecto común.

**Brujo 5→6 (paso 75):** exactamente el mismo asistente visual; mantiene tres trucos y cinco invocaciones (se puede sustituir como máximo uno de cada grupo), añade un séptimo preparado ordinario (retiene al menos cinco de los seis existentes), conserva los seis gratuitos del patrón y dos ranuras de nivel 3, y desbloquea el recurso manual Suerte del Oscuro. El nuevo nivel no cambia la ficha común ni introduce una lista paralela de conjuros.

**Brujo 6→7 (paso 76):** el mismo diálogo `LevelUpDialogFrame` con sus tres etapas, búsqueda y fichas `WizardSpellDetails`. Elige seis invocaciones (cinco anteriores más una, con sustitución opcional de una), tres trucos (sustitución opcional de uno) y ocho preparados ordinarios (conserva al menos seis de los siete). Las dos ranuras de Pacto ascienden a nivel 4; seis conjuros ordinarios de nivel 4 ya existentes en Mago pasan a ser opciones de Brujo. Escudo de fuego y Muro de fuego son dos preparaciones adicionales del patrón, en total ocho, que no ocupan plazas ordinarias. `Susurros de la tumba` desbloquea Hablar con los muertos sin ranura como invocación opcional. Ninguna novedad modifica la arquitectura de las demás clases.

**Brujo 7→8 (paso 77):** se conserva exactamente el diálogo de tres etapas y los selectores compartidos. El jugador elige una segunda **Mejora de característica** (+2 o +1/+1; máximo 20), un noveno conjuro ordinario de niveles 1–4 (retiene al menos siete de los ocho anteriores), mantiene tres trucos y seis invocaciones (puede sustituir una de cada grupo). Las dos ranuras siguen siendo de nivel 4 y el Patrón Infernal conserva ocho conjuros gratuitos. Se reutilizan las fichas y el catálogo de conjuros existentes, sin añadir componentes visuales exclusivos. La mejora de Constitución recalcula retroactivamente los ocho niveles de PG.

## C. Puntos de golpe: promedio o dado para todas las clases

**Componente único obligatorio** en paso 1: `apps/web/src/components/LevelUpHitPointsPicker.tsx`, configurado por `characterClass`. **Catálogo y validación:** `packages/rules-engine/src/level-hit-points.ts`.

| Clase | Dado | Promedio oficial | Valor que se guarda |
| --- | --- | --- | --- |
| Guerrero | d10 | 6 | `levelHitPointRolls` (array de d10 naturales, uno por nivel 2..N) |
| Mago | d6 | 4 | `levelHitPointRolls` (array de d6 naturales, uno por nivel 2..N) |
| Brujo | d8 | 5 | `level2HitDieRoll` a `level8HitDieRoll` (hasta nivel 8), uno por nivel adicional |

El selector muestra «Promedio» o «Tirada 1dX». Al elegir la segunda opción se lanza el dado; es posible repetir hasta confirmar. Cuando se elige promedio se almacena el valor fijo equivalente. No guardar la cadena de modo visual como sustituto del resultado; en ambos casos se guarda el **número de dado elegido**. No aplicar el dado dos veces al confirmar. No modificar el valor al cambiar de pestaña ni al restaurar el guardado.

PG ganados por nivel posterior al 1: **máximo de 1 y (resultado del dado + modificador de Constitución)**, más los efectos pasivos por nivel (Enano, Duro, etc.) según el motor. La Constitución modificada a posteriori recalcula el máximo de todos los niveles anteriores. Cada transición conserva el daño acumulado tanto como lo permitan los nuevos máximos. Las elecciones no se aplican al estado principal hasta Confirmar.

**Compatibilidad:** las entradas antiguas de Guerrero/Mago sin `levelHitPointRolls` continúan usando el promedio fijo. La primera subida nueva crea un historial completo rellenando los niveles anteriores con su media (6 o 4), después añade el dado actual. Se valida `length === level-1` y rango de cada dado. El descenso elimina el último dado del historial (`trimLevelHitPointRolls`), sin volver a tirar; **al regresar al nivel 1 se omite por completo `levelHitPointRolls`**, en vez de guardar una lista vacía, para recuperar exactamente el esquema anterior y superar las auditorías de igualdad de instantáneas. El esquema de guardados anterior se conserva (campo opcional y aceptado por sus validadores). Brujo mantiene `level2HitDieRoll` y añade `level3HitDieRoll`/`level4HitDieRoll`/`level5HitDieRoll` opcionales, con snapshot versión 4.

En **Brujo nivel 4**, el asistente presenta la *misma tarjeta de dote Mejora de característica* que Mago/Guerrero: +2 a una o +1/+1 a dos, con máximo 20, usando `applyFighterAbilityImprovement`. Un cambio en Constitución recalcula todos los PG previos. Las otras dotes generales quedan expresamente pendientes; no mostrar elecciones que aún no están implementadas.

En **Brujo nivel 8** se vuelve a utilizar esa misma tarjeta sin duplicar CSS ni diálogos. El campo `level8Improvement` aplica el incremento después de `level4Improvement`, con validación del límite 20; `level8HitDieRoll` guarda el valor concreto elegido en el selector d8 (5 de media). La bajada elimina solo los campos de nivel 8.

## D. Bajada de nivel: estructura exacta

**Único diálogo:** `apps/web/src/components/LevelDownDialog.tsx`. Las tres clases deben pasar un objeto compatible con `LevelDownSummary` (`packages/rules-engine/src/level-down.ts`) y `onConfirm`. No crear otro modal ni una bajada silenciosa.

Orden fijo de la ventana:

1. Encabezado con clase, nivel de origen y destino, y cierre de diálogo.
2. «Rasgos y elecciones que se pierden»: lista de novedades retiradas.
3. «Estadísticas y recursos que cambiarán»: PG, ranuras, competencias, etc.
4. «Información que se conserva»: identidad, perfil, equipo, daño compatible y marcadores.
5. Casilla de reconocimiento explícita; «Confirmar bajada al nivel N» solo se habilita al marcarla. Cancelar jamás muta.

Las reglas de **Guerrero/Mago** están en `level-down.ts`; las de **Brujo 6→5, 5→4, 4→3, 3→2 y 2→1** en `warlock-level-up.ts` (`previewWarlockLevelDown`). Los adaptadores construyen una vista previa y una instantánea validada **antes** de abrir la confirmación. El diálogo no conoce reglas de clases.

Importante para Brujo: en guardados antiguos de nivel 2 no existe un historial de qué invocación/conjuros eran los originales en nivel 1. El retroceso conserva una invocación legal de nivel 1 (o Pacto de la Hoja si ninguna lo es), los dos primeros trucos y los dos primeros preparados. **Debe avisar** de esta política antes de confirmar; se pierden las elecciones restantes. **Desde 2→3** se persiste `level3History` con invocaciones, preparados, trucos, dotes, vínculos y efectos seleccionados en nivel 2. **Desde 3→4**, `level4History` conserva los mismos grupos de datos del nivel 3. El descenso 4→3 elimina la mejora y dado del cuarto nivel, restaura elecciones anteriores y mantiene el `level3History` para seguir descendiendo 3→2, sin copiar estados de combate ni duplicar compañeros.

**Desde 4→5**, `level5History` guarda las elecciones originales de nivel 4; el descenso 5→4 elimina el dado adicional, las invocaciones del quinto nivel, la nueva magia de patrón y los beneficios de Investidura/Don de las profundidades. Conserva `level4History`, el daño acumulado compatible y los dos indicadores de ranuras de Pacto, que regresan de nivel 3 a nivel 2 sin alterar su gasto. Las nuevas invocaciones con prerrequisito deben elegirse junto al Pacto de la Hoja o de la Cadena correspondiente: no se puede retirar ese pacto si con ello queda otra invocación dependiente sin soporte.

**Desde 5→6**, `level6History` conserva las cinco invocaciones, tres trucos, seis preparados, vínculos del Tomo/Hoja, familiar y demás elecciones del nivel 5. El descenso 6→5 retira el d8 y Suerte del Oscuro, restaura las elecciones anteriores y conserva daño compatible, ranuras gastadas, inspiración, compañeros y los historiales previos. El contador `darkOnesOwnLuckUsed` solo existe desde nivel 6; se limita a máximo (1, modificador de Carisma), se recarga únicamente tras descanso largo y nunca suma automáticamente el resultado del d10 a un d20. La ficha presenta el lanzamiento usando el mismo estilo de resultados que las demás tiradas.

**Desde 6→7**, `level7History` almacena las elecciones anteriores y los vínculos y recursos de nivel 6; el descenso 7→6 quita el d8 y la sexta invocación, devuelve las elecciones originales y la ranura de Pacto al nivel 3, retira los dos conjuros gratuitos de nivel 4 y conserva gasto de ranuras, daño acumulado compatible, compañeros e historial 6→5. El estado de Suerte del Oscuro se restaura del historial anterior a la subida. El snapshot continúa con `schemaVersion: 4`, ampliando únicamente campos opcionales.

**Desde 7→8**, `level8History` registra exactamente las seis invocaciones, tres trucos, ocho conjuros preparados, dotes opcionales, vínculos de Pacto, familiar, Armadura de sombras, Tomo, Don de las profundidades y usos de Suerte del Oscuro. El descenso **8→7** deshace la Mejora de característica de nivel 8, elimina su d8, restaura las elecciones anteriores y deja intactos los campos de progresión previos, ranuras gastadas y daño compatible. El formato sigue siendo `schemaVersion: 4`.

## E. Checklist obligatorio antes de entregar una nueva clase/subclase

- [ ] Usa `CharacterHeader` con `onLevelUp` / `onLevelDown` y no crea controles duplicados.
- [ ] La subida se representa con `LevelUpDialogFrame` en **tres pasos y el mismo pie**.
- [ ] La bajada usa `LevelDownDialog`, `LevelDownSummary`, confirmación y cancelación segura.
- [ ] `LevelUpHitPointsPicker` con dX, promedio y resultado persiste y recalcula PG correctamente.
- [ ] Los conjuros se seleccionan con `wizard-spell-choice-list`, buscador, `WizardSpellDetails` y solo de la lista reglamentaria.
- [ ] Motor puro valida todas las elecciones y construye vista previa; estado principal cambia solo al confirmar.
- [ ] Guardados antiguos sin tiradas registradas continúan cargando; al subir se rellenan las medias anteriores.
- [ ] Al bajar se recorta el historial de PG y se ajustan recursos conservando daño y usos compatibles.
- [ ] Comparación visual con Guerrero/Mago/Brujo, ratón, teclado, móvil; pruebas de progresión, lint y build.

**Para el TFG:** decisión deliberada de separar componentes compartidos de presentación, políticas de cada clase (motor) y datos históricos persistidos. La uniformidad se consigue por reutilización de código, no intentando igualar capturas con CSS separado.
