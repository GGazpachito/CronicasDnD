# Paso 51. Progresión guiada del Mago (niveles 2 y 3) y semántica visual de las ranuras

**Proyecto:** Crónicas, gestor de personajes para D&D 2024.  
**Fecha de implementación:** 16 de noviembre de 2026.  
**Tipo de entrega:** incremento funcional verificable, sin migración de PostgreSQL.  
**Alcance:** se habilitan únicamente las transiciones interactivas de Mago **1→2** y **2→3**. La progresión teórica del motor hasta el nivel 20 existe desde el paso 47, pero la interfaz guiada de niveles superiores permanece pendiente.

## 1. Necesidad y objetivos

El creador inicial del Mago admitía nivel 1, y el proyecto ya tenía un motor de reglas para su progresión teórica. Era necesario conectar ese motor con un asistente semejante al del Guerrero, respetando la decisión arquitectónica de mantener **las mismas hojas y pestañas para todas las clases**. Además, se solicitó invertir la representación de las ranuras mágicas: **rombo relleno/marcado = ranura disponible; rombo vacío/sin marcar = ranura gastada**.

**Criterios de aceptación:**

1. El Mago puede pasar del nivel 1 al 2 eligiendo la competencia que recibe pericia mediante Erudito, dos conjuros nuevos y un conjuro preparado adicional.
2. Puede pasar del nivel 2 al 3, recibir Evocación, elegir dos conjuros nuevos de clase y dos conjuros gratuitos de Evocación, y disponer de ranuras de nivel 2.
3. Cada subida presenta novedades con descripciones y una vista previa; los cambios solo se aplican al confirmar.
4. No deben restaurarse ranuras gastadas, daño recibido o recursos de partida por el simple hecho de subir de nivel.
5. Los rombos presentan el significado solicitado sin alterar el significado interno de las marcas guardadas.
6. Los Magos y Guerreros guardados previamente siguen siendo recuperables; no hay migración de esquema.

## 2. Fuente reglamentaria y decisiones de alcance

**Fuente principal:** *Player's Handbook* (2024), capítulo de clase Mago, páginas impresas **165–169**, y Tradición de Evocación, página **174**. Se consultó el ejemplar proporcionado para este proyecto. Los textos de la interfaz son explicaciones resumidas, no transcripciones extensas del libro.

- **Nivel 2:** Erudito otorga pericia en una habilidad apropiada en la que ya se sea competente; mejora la progresión de ranuras y conjuros preparados; se añaden dos conjuros al libro.
- **Nivel 3:** acceso a conjuros y ranuras de nivel 2, elección de tradición (en esta fase, **Evocación**), rasgos **Experto en Evocación** y **Truco potente**; se añaden dos conjuros de progresión y otros dos de la escuela de Evocación concedidos por la tradición.
- **Recuperación arcana:** se mantiene el uso manual del recurso. Al alcanzar el nivel 3, la interfaz permite recuperar una ranura de nivel 2 o hasta dos de nivel 1 cuando cumpla los límites; cada recuperación consume el uso correspondiente de Recuperación arcana.
- Se preservan las opciones y capacidades de las especies y trasfondos que ya existían, sin ampliar su automatización en este paso.

**Limitaciones explícitas:** no existe todavía una subida guiada 3→4 ni más allá; no se ha integrado el catálogo de conjuros de nivel 3 o superior. No se automatiza la resolución activa de conjuros en combate, la copia de conjuros de pergaminos, la selección de blancos ni el reemplazo de la lista de conjuros preparados al completar descansos largos. Los rasgos de Evocación se explican en la pestaña Rasgos; sus efectos situacionales no se ejecutan sin intervención del jugador.

## 3. Diseño técnico

### 3.1. Modelo y validación de la progresión

`packages/rules-engine/src/wizard-creation.ts` admite ahora `GuidedWizardInput.level` con los niveles 1, 2 y 3, conserva la API de nivel 1 como fachada de compatibilidad y valida las decisiones nuevas mediante los datos de `wizard.ts`:

- Número de conjuros del libro: 6 al nivel 1, 8 al nivel 2, y 10 de progresión más 2 adicionales de Evocación al nivel 3.
- Preparados: 4, 5 y 6 en los niveles 1, 2 y 3 respectivamente.
- Erudito solo admite una habilidad elegible con competencia real del personaje.
- Evocación solo aparece en el nivel 3, con exactamente dos conjuros nuevos de la escuela de Evocación que no repitan otros del libro.
- Se amplía el catálogo conocido con conjuros de nivel 2; no se desbloquean antes del nivel de clase apropiado.

Se conservan campos opcionales en los datos de entrada de un Mago previamente guardado, por lo que no se fuerza ninguna modificación de guardados antiguos. El guardado mantiene `schemaVersion: 3`.

### 3.2. Transición atómica

El módulo nuevo `wizard-level-up.ts` expone `prepareWizardLevelUp(input, state, choices)` y `wizardLevelUpChoicesPreview(input)`. Recibe valores anteriores inmutables, calcula los nuevos y comprueba su consistencia **antes** de devolver un resultado listo para confirmar. En ningún momento muta el estado recibido.

El asistente `WizardLevelUpWizard.tsx` mantiene selecciones en estado local, presenta las explicaciones de rasgos, bloquea la confirmación hasta que el motor aprueba todas las elecciones y solo entonces entrega el resultado a la hoja del Mago. **Cancelar** descarta el borrador. La hoja reutiliza el botón general **Gestionar nivel** del encabezado compartido.

La cantidad de PG máximos aumenta según el dado de clase y la Constitución calculada en el motor. Se conserva el daño previo sumando únicamente el incremento legítimo de PG máximos a los actuales, sin convertir la subida de nivel en un descanso; se preservan PG temporales, inspiración, inventario, perfil y marcas manuales de muerte. Las ranuras nuevas aparecen disponibles y las anteriores conservan su estado.

### 3.3. Ranuras individuales y persistencia

`wizard-slot-marks.ts` permite consultar, marcar, gastar y recuperar ranuras individuales de los niveles 1 y 2. Para los guardados antiguos se mantiene la compatibilidad con las marcas previas. El orden de las marcas se calcula según la capacidad de cada grupo de ranuras, evitando asociar por error una ranura antigua a otra categoría después de subir de nivel.

**Punto importante sobre la inversión visual:** en el modelo **`true` continúa significando “gastada”**. Solo se invierten `aria-pressed`, clase CSS, descripción accesible y apariencia de `SpellSlotDiamonds.tsx`:

| Estado almacenado | Representación | Interpretación del jugador |
| --- | --- | --- |
| `false` | Rombo relleno / marcado | Ranura disponible |
| `true` | Rombo vacío / desmarcado | Ranura gastada |

Esta decisión evita una migración innecesaria y protege los datos previos. Un clic sigue alternando el estado de esa ranura; el contador y las acciones de descanso o Recuperación arcana siguen conectados al motor.

### 3.4. Vistas compartidas

La página `apps/web/src/app/wizard/page.tsx` conserva las seis pestañas y el sistema de guardado ya establecidos. Integra el asistente, presenta correctamente el nivel y la subclase, muestra los nuevos conjuros y genera grupos de rombos para las ranuras disponibles. `wizard-traits.ts` amplía el panel común de Rasgos con Erudito y las capacidades de Evocación; `character-card.ts` muestra «Evocación» en la galería cuando corresponde.

No se han duplicado los componentes del inventario, hoja Principal o biografía. La progresión y la presentación solo añaden los datos específicos de clase a la arquitectura común.

## 4. Archivos incluidos en el ZIP

1. `apps/web/src/app/wizard/page.tsx` — integración en la ficha compartida.
2. `apps/web/src/app/globals.css` — apariencia de rombos y asistente.
3. `apps/web/src/components/WizardLevelUpWizard.tsx` — componente nuevo de subida de nivel.
4. `apps/web/src/components/SpellSlotDiamonds.tsx` — semántica solicitada de ranuras.
5. `packages/rules-engine/src/wizard-creation.ts` — validación de fichas de nivel 1–3 y conjuros.
6. `packages/rules-engine/src/wizard-level-up.ts` — motor nuevo de transición atómica.
7. `packages/rules-engine/src/wizard-slot-marks.ts` — agrupación y recuperación de ranuras.
8. `packages/rules-engine/src/wizard-traits.ts` — rasgos de progresión y Evocación.
9. `packages/rules-engine/src/character-card.ts` — metadatos de subclase.
10. `packages/rules-engine/src/index.ts` — exportaciones del motor.
11. `packages/rules-engine/tests/wizard-level-up-51.test.ts` — 16 pruebas nuevas de regresión.
12. `docs/implementation/PASO_51_PROGRESION_MAGO_NIVELES_2_Y_3.md` — esta memoria técnica.

## 5. Comprobaciones y evidencias

**Ejecutadas en entorno local aislado:** comprobación estricta de TypeScript en motor, página y asistente React; renderizado aislado de rombos y asistente; **57/57 pruebas con aserciones** al combinar la nueva batería con las pruebas históricas de Mago (pasos 47, 48, 50 y 50.1). **Las 57 comprobaciones se ejecutaron con un adaptador local de Vitest; no sustituyen la ejecución oficial del comando `pnpm test` del repositorio.**

**Pendientes en el entorno real del proyecto:**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

### Matriz de aceptación manual recomendada

| Caso | Acción | Resultado esperado |
| --- | --- | --- |
| 51-A | Crear y guardar Mago nivel 1 | Guarda sin error; 2 espacios de nivel 1 aparecen rellenos/disponibles |
| 51-B | Gastar uno de los dos espacios | Su rombo queda vacío y el contador baja a 1/2 |
| 51-C | Gestionar nivel 1→2 y cancelar | No cambian nivel, PG, libro ni ranuras |
| 51-D | Gestionar nivel 1→2 y confirmar | Erudito, 2 conjuros y 5 preparados; 3 espacios de nivel 1 |
| 51-E | Gestionar nivel 2→3 | Evocación, 2 conjuros de progresión + 2 de escuela, 6 preparados; 4+2 espacios |
| 51-F | Subir con una ranura gastada | La ranura previa sigue vacía; las nuevas se muestran rellenas |
| 51-G | Recuperación arcana en nivel 3 | Permite recuperar 2 ranuras nivel 1 o 1 nivel 2, si procede |
| 51-H | Guardar, salir a inicio y cargar desde galería | Conserva nivel, subclase, repertorio, ranuras y retrato |
| 51-I | Abrir un Guerrero anterior | Todas sus pestañas, equipo y guardado funcionan sin cambios |
| 51-J | Intentar gestionar nivel del Mago nivel 3 | No ofrece salto no implementado al nivel 4 |

Conviene registrar capturas de las pantallas de elección, vista previa, cancelación, confirmación y galería como evidencias reproducibles para la memoria del TFG, sin presentar resultados manuales como ejecutados hasta verificarlos en el navegador del usuario.

## 6. Alternativas consideradas y descartadas

- **Implementar inmediatamente todos los niveles 1–20 en una sola interfaz:** descartado por el riesgo de combinaciones de reglas incompletas, sin pruebas de persistencia ni un catálogo de magia de niveles altos preparado.
- **Crear otra ficha específica para el Mago:** descartado por la decisión arquitectónica de reutilización transversal de todas las hojas.
- **Invertir el significado de los booleanos de ranuras guardadas:** descartado porque obligaría a migrar o reinterpretar guardados anteriores.
- **Aplicar los cambios de subida conforme se seleccionan:** descartado para evitar estados parciales, rasgos duplicados o pérdida de recursos si se cancela.
- **Permitir reemplazar conjuros preparados en cualquier momento durante la subida:** descartado; la preparación distinta requiere contemplar la regla de descanso largo. Se incorporará explícitamente en una fase posterior.

## 7. Siguiente paso propuesto

**Actualización 52:** extender la progresión del Mago a los niveles **4 y 5**, incorporando las elecciones de mejora de característica o dote permitidas por el catálogo, las capacidades de ese tramo, la progresión del libro y preparados, la primera ampliación de conjuros de nivel 3 y los rasgos adicionales de Evocación aplicables. Mantener el mismo asistente y el mismo motor de guardado compatible.
