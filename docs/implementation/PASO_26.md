# Paso 26. Turnos del personaje, economía de acciones y límite de workers

## Objetivo

Introducir un seguimiento **del turno del propio personaje**, separado de las rondas
que controla el DM, sin simular criaturas inexistentes ni cambiar el esquema SQL.
El prototipo sigue limitado a Guerrero niveles 1–3.

Fuente: *Player's Handbook 2024*, capítulo 1 («Your Turn», «Movement and Position»),
y capítulo 6 («Mastery Properties»: Nick, Cleave, Sap, Slow, Vex).

## Archivos incluidos

- `packages/rules-engine/src/turns.ts`: tracker puro y validado; inicio, fin, gastos,
  movimiento, Correr, Acción súbita y ataques adicionales.
- `packages/rules-engine/src/combat.ts`: extensión opcional de `CombatState`,
  cronología de maestrías y consumo de acción al confirmar ataques.
- `packages/rules-engine/src/mastery-effects.ts`: campo opcional `sourceTurn`
  para nuevos recordatorios, conservando los anteriores.
- `packages/rules-engine/src/adventure.ts`: Segundo aliento gasta acción adicional
  durante el turno activo; Acción súbita añade un espacio adicional al gastarse.
- `packages/rules-engine/src/index.ts`: exportaciones del nuevo motor.
- `apps/web/src/components/TurnPanel.tsx`: controles de turno y movimiento.
- `apps/web/src/components/AttacksPanel.tsx`: selector de tipo de ataque;
  daño corregido para el ataque secundario de Tajo.
- `apps/web/src/components/CombatPanel.tsx`: mensajes y registro actualizado.
- `apps/web/src/app/page.tsx`: sincronización con el estado persistente.
- `apps/web/src/app/globals.css`: estilos de la pantalla.
- `packages/rules-engine/tests/turns.test.ts`: pruebas nuevas y regresiones.
- `packages/rules-engine/package.json`: **límite de workers de Vitest**.

## Cómo jugar con el gestor

1. En «Tu turno de combate», pulsar **Iniciar mi turno**.
2. La hoja dispone de una acción y una acción adicional. La reacción se
   recupera al **iniciar** el siguiente turno, no al terminar el actual.
3. Los botones de acción genérica y Correr gastan una acción. Correr añade
   a la reserva de movimiento la velocidad efectiva del personaje.
4. El movimiento se registra en pies **de coste**, incluidos los incrementos
   por terreno difícil. Sin mapa no se deducen los costes del terreno.
5. Para atacar, utilizar «Ataques con armas» y elegir la modalidad de gasto:
   acción Atacar, extra Ligera con acción adicional, extra Ligera con Mella,
   extra Tajo o reacción. El registro comprueba usos y límites.
6. **Mella** requiere previamente una acción Atacar y el ataque extra de Ligera
   con arma cuya maestría sea Nick. El extra Ligera de Mella y el extra Ligera
   de acción adicional comparten el límite por turno.
7. **Tajo** requiere un impacto previo con arma con Cleave y otra criatura
   distinta. El sistema **no conoce distancias ni geometría**: el DM verifica
   la segunda criatura a 5 pies de la primera y dentro del alcance. En el
   daño adicional no se suma modificador **positivo** de característica;
   la mejora mágica del arma sí permanece. No se pueden registrar dos extras
   de Tajo durante el mismo turno propio.
8. Desde «Jugar con tu personaje», gastar Acción súbita cuando sea apropiado
   concede una segunda acción en el turno activo. Segundo aliento consume
   la acción adicional durante el turno.
9. Pulsar **Terminar mi turno**. Las maestrías creadas con turno identificado:
   * Sap y Slow caducan al **empezar** tu siguiente turno.
   * Vex caduca al **terminar** tu siguiente turno, a menos que lo hayas
     consumido antes al atacar a ese mismo objetivo.
   * Topple y Push se mantienen como recordatorios para el DM.
   * Efectos de guardados antiguos, sin `sourceTurn`, se retiran manualmente.
10. Al acabar la ronda de iniciativa, pulsar **Avanzar ronda** en
    «Registro y efectos temporales». Esta operación necesita que el turno
    propio esté terminado y sigue siendo manual.
11. Pulsar «Actualizar guardado» en «Mis personajes» para persistir.

## Compatibilidad

`CombatState.turn` y `MasteryPendingEffect.sourceTurn` son **opcionales**.
La columna JSON de PostgreSQL y `schemaVersion: 2` permanecen sin cambios.
No ejecutar migraciones de Prisma ni reiniciar/eliminar el volumen de Docker.

El motor conserva el antiguo modo de registrar ataques cuando el seguimiento
no se ha activado; así no se rechazan guardados o flujos de versiones anteriores.
Las pruebas antiguas que verifican el formato inicial de combate permanecen
inalteradas.

## Importante: 22 workers

Se modifica el script de **`packages/rules-engine/package.json`**:

```json
"test": "vitest run --maxWorkers=2 --minWorkers=1"
```

El proyecto ejecuta `pnpm test` desde la raíz, que delega en el paquete de
reglas. Con esta opción, Vitest utiliza **como máximo dos workers**, en lugar
 de 22. No son 22 pruebas fallidas: son ejecutores paralelos. No es necesario
 cambiar hardware, Docker ni PostgreSQL.

## Instalación

Copiar carpetas `apps`, `packages` y `docs` del ZIP sobre el proyecto,
reemplazando los archivos incluidos. Es **esencial** reemplazar también
`packages/rules-engine/package.json` para que el límite de workers se aplique.

Desde la raíz:

```powershell
docker compose up -d
pnpm test
pnpm build
pnpm dev
```

La prueba `pnpm test` debe invocar `vitest run --maxWorkers=2 --minWorkers=1`.
Comprobar los comandos contra la terminal si aparece de nuevo un número alto.

## Límites expresos

- Solo se controla el turno del jugador; no hay enemigos, iniciativa general,
  órdenes de iniciativa, ataques de oportunidad automáticos ni posiciones.
- Los botones genéricos no identifican todas las acciones especiales; los
  requisitos de las dotes y ataques adicionales se siguen contrastando en mesa.
- El sistema de reacción se limita a **una reacción** hasta el comienzo del
  próximo turno, sin reconocer automáticamente los disparadores.
- El sistema no calcula terreno difícil ni el coste de levantarse de Derribado.
- Solo se controla el límite de Tajo en el turno propio; efectos que ocurran
  en turnos de otras criaturas pueden requerir intervención manual del DM.
- La ejecución completa de Vitest y `next build` requiere instalar las
  dependencias del repositorio en el entorno Windows.

## Verificación durante el desarrollo

- TypeScript estricto del motor: correcto.
- TypeScript estricto de `page.tsx`, `TurnPanel.tsx`, `CombatPanel.tsx` y
  `AttacksPanel.tsx`, con declaraciones locales de React: correcto.
- Ejecutable local de aserciones sobre todas las pruebas del motor, incluidas
  las nuevas: sin fallos. **No equivale a Vitest real ni a Next build**.
- El ZIP se verifica antes de distribuirlo.
