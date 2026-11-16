# Paso 51.2. Retroceso de nivel compartido, con vista previa y confirmación

**Proyecto:** Crónicas, hoja de personaje D&D 2024.  
**Fecha:** 16 de noviembre de 2026.  
**Alcance:** Guerrero/Campeón (niveles 2–20) y Mago/Evocación (niveles 2–3).  
**Motivo:** el Guerrero tenía un botón de retroceso con confirmación genérica y reinicio de sesión; el Mago solo podía subir. El usuario pidió un botón de descenso para todas las clases y una ventana que explicara las pérdidas y modificaciones.

## 1. Decisiones funcionales

1. **Una interfaz común.** `LevelDownDialog.tsx` no conoce clases, puntos de golpe ni conjuros. Recibe `LevelDownSummary` y una operación de confirmación. `CharacterHeader` expone `onLevelDown`, de forma que cualquier clase futura pueda reutilizar el mismo control.
2. **Motor específico por clase.** `level-down.ts` ofrece `previewFighterLevelDown` y `previewWizardLevelDown`, que construyen y validan los datos del nivel inferior antes de permitir confirmarlos. Las próximas clases deberán aportar un adaptador análogo; no deben copiar la ventana.
3. **Ninguna mutación prematura.** Abrir/cerrar la ventana no cambia ni entrada ni recursos. Una casilla de aceptación explícita habilita el botón definitivo.
4. **Sin pérdida general de sesión.** En Guerrero se sustituye el reinicio de sesión del botón antiguo por una reducción compatible con los nuevos máximos. Se preservan inventario, dinero, perfil, condiciones, historial y marcadores de muerte. Se recortan dados gastados, usos y PG al límite nuevo. Solo se retira el turno activo si sus ataques registrados superan los permitidos al nivel inferior.
5. **Los PG no se curan al bajar.** Se mantiene el daño sufrido, restando al máximo y a los PG actuales la misma diferencia, con suelo cero. Esto evita curación gratuita o restauración involuntaria de ranuras.
6. **Sin auto-guardado.** La transacción actualiza el estado de React, pero PostgreSQL solo cambia si el usuario pulsa después «Guardar cambios». No hay migraciones.

## 2. Detalle del Guerrero

Al bajar `N → N-1`, se retiran las mejoras y elecciones concedidas exactamente en `N`: mejoras de característica (4, 6, 8, 12, 14, 16), maestrías nuevas (4, 10, 16), segundo estilo (7) y beneficio épico (19). La subclase Campeón y los rasgos por nivel se recalculan desde el motor oficial existente. Se incluyen descripciones de los hitos que dejan de aplicarse.

Se reducen los máximos de Segundo aliento, Acción súbita e Indomable y se eliminan los contadores que todavía no estaban desbloqueados. Si el nivel inferior no admite cierto número de ataques por acción, se retira únicamente el rastreador de turno incompatible. El historial y demás registros de combate permanecen.

**Limitación conocida:** las elecciones de mejoras y maestrías de niveles superiores se eliminan de la ficha al bajar. Si el jugador vuelve a subir, deberá seleccionarlas nuevamente; no se conserva un historial oculto de opciones descartadas.

## 3. Detalle del Mago

Los niveles accesibles en la interfaz actual son 1–3. Al bajar de 3 a 2 se eliminan los dos conjuros obtenidos en la última subida, los dos concedidos por Evocación y los rasgos de subclase; las ranuras de nivel 2 desaparecen y el total de ranuras de nivel 1 se ajusta de cuatro a tres. De 2 a 1 desaparecen la pericia de Erudito y los dos conjuros de esa subida, y se ajustan las ranuras de tres a dos.

La lista de conjuros preparados de progresión se recorta al nuevo total, conservando los anteriores posibles y completando con conjuros presentes en el libro si hace falta. La selección manual sin límite se preserva excepto los conjuros concedidos por **ese** nivel que se pierde. Se eliminan también de esa selección porque la subida los agregó automáticamente. Si se quieren volver a aprender manualmente, se pueden marcar desde el catálogo.

Los rombos persisten por identidad ordinal dentro de cada nivel de ranura; se mantienen los estados de las ranuras supervivientes y se descartan los de las ranuras eliminadas. Se conserva el estado gastado o disponible de Recuperación arcana. No se restablecen ranuras ni otros recursos.

## 4. Información mostrada antes de confirmar

- Rasgos y elecciones perdidos con explicación funcional.
- Cambios de PG máximos y actuales, dados de golpe, bonificador de competencia, habilidades, tiradas de salvación, características, CA e iniciativa si varían.
- En Mago: conjuros retirados, preparación, cantidades de ranuras por nivel, disponibles y, si corresponde, ataque mágico y CD.
- En Guerrero: contadores de recursos y seguimiento de turno incompatible.
- Información que se conserva, aviso de guardado manual y confirmación mediante casilla.

## 5. Contrato de ampliación a clases futuras

La próxima clase debe implementar un adaptador puro `preview<Class>LevelDown(input, state)` que devuelva:

- `className`, `fromLevel`, `toLevel`.
- `lost`, una lista de capacidades/elecciones que dejarán de aplicarse.
- `changes`, una lista de valores anteriores y nuevos.
- `preserved`, explicación de los datos que se mantienen.
- `snapshot`, nuevo personaje y estado validados para confirmar conjuntamente.

La página de clase pasará esta información a `LevelDownDialog` mediante `CharacterHeader.onLevelDown`. El diálogo compartido no debe importar módulos específicos de clase.

## 6. Pruebas realizadas y pendientes

- **Ejecución local de 12 pruebas nuevas** con comprobador de aserciones Node: 12/12. Incluye los 19 descensos posibles del Guerrero, eliminaciones en los niveles 4, 7 y 19, recursos, daño, marcadores, Mago 3→2 y 2→1, conjuros, ranuras y cancelación sin mutación.
- **TypeScript estricto del motor:** superado con `tsc 5.8.3`.
- **Chequeo TypeScript aislado de las páginas Guerrero/Mago, cabecera y diálogo:** superado con declaraciones temporales de React/Next, sin dependencias de Next instaladas. No equivale a una compilación real del framework.
- **Pendiente en entorno del usuario:** `pnpm lint`, `pnpm test`, `pnpm build`, pruebas visuales y guardado/recuperación reales con PostgreSQL.

**Prueba manual mínima:** cargar un Guerrero de nivel 4 y un Mago de nivel 3; abrir el retroceso, verificar la lista de pérdidas, cancelar, comprobar que nada cambia, reabrir, confirmar y actualizar guardado; volver al menú y recuperar cada personaje. Verificar que un nivel 1 tiene deshabilitada la bajada.

## 7. Alternativas consideradas

- **Reiniciar siempre la sesión:** rechazado porque descartaba daño, historial y recursos sin necesidad.
- **Modificar directamente el nivel sin validación:** rechazado por riesgo de opciones ilegales, errores de persistencia y ranuras incompatibles.
- **Mantener una ventana por clase:** rechazado porque reproduciría la fragmentación de hojas que se corrigió en la fase 49–50.
- **Deshacer con un historial de todas las elecciones:** no incluido en esta fase; requeriría un modelo de revisiones y una política de restauración diferentes.

## 8. Referencia reglamentaria

*Player’s Handbook* 2024 aportado para el proyecto: progresión del Guerrero y Campeón (pp. 91–96), Mago y Evocación (pp. 165–169 y 174). Los textos del programa son resúmenes originales: no se reproducen descripciones extensas del libro. Retroceder de nivel es una **herramienta de edición de ficha**, no una acción que las reglas establezcan como procedimiento ordinario de juego.

## 9. Próxima actualización prevista

**52:** avanzar la progresión interactiva del Mago hasta niveles 4 y 5, utilizando el mismo marco visual compartido de subida, y ampliar los conjuros disponibles hasta nivel 3.
