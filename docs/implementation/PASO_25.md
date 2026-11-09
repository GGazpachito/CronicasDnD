# Paso 25. Maestrías de armas D&D 2024 y seguimiento de objetivos

## Objetivo

Pasar de la descripción de propiedades de Maestría de Armas a interpretar los resultados
confirmados y registrar recordatorios por objetivo, sin simular criaturas ni turnos que
no existen en el proyecto.

Fuente de reglas: *Player's Handbook 2024*, capítulo 6, «Mastery Properties»,
página 213 del PDF suministrado.
La lista de armas y su propiedad proviene de la tabla de armas de la página siguiente.

## Archivos

- `packages/rules-engine/src/mastery-effects.ts`: evaluación pura y validación de efectos.
- `packages/rules-engine/src/combat.ts`: registro, consumo de Hostigar y eliminación manual.
- `packages/rules-engine/src/index.ts`: exportación del motor.
- `apps/web/src/components/AttacksPanel.tsx`: objetivo, tamaño, confirmación de daño y vista previa.
- `apps/web/src/components/CombatPanel.tsx`: efectos pendientes y acción «Resuelto / caducado».
- `apps/web/src/app/page.tsx`: integración de contexto con el motor y el estado persistente.
- `packages/rules-engine/tests/mastery-effects.test.ts`: regresión de las ocho propiedades.

## Comportamientos

| Maestría | Automatización / límite |
|---|---|
| Rozar (Graze) | El motor ya calculaba el daño al fallar. Se explica expresamente que no incluye mejora mágica. |
| Mella (Nick) | Indica que el ataque extra de Ligera puede formar parte de la acción Atacar. El límite de una vez por turno lo verifica el DM. |
| Tajo (Cleave) | Aviso del segundo objetivo a 5 pies y restricción una vez por turno. No se inventa geometría ni se ejecuta un segundo ataque. |
| Empujar (Push) | Comprueba el tamaño Grande o menor si se suministra. La posición física queda en manos del DM. |
| Debilitar (Sap) | Si impacta a criatura identificada, crea recordatorio de desventaja de su próximo ataque. |
| Ralentizar (Slow) | Si impacta y **causa daño**, crea recordatorio de reducción de velocidad de 10 pies. No acumula varias instancias sobre el mismo objetivo. |
| Derribar (Topple) | Registra salvación pendiente de Constitución con la CD calculada. No presupone fallo ni aplica Derribado a un enemigo no modelado. |
| Hostigar (Vex) | Si impacta y causa daño, crea un efecto por objetivo. Contra ese mismo objetivo, el siguiente ataque recibe una fuente automática de ventaja, compatible con las reglas de cancelación. Al confirmar ese ataque, se consume Hostigar, aunque falle. |

La fuente de daño real se marca explícitamente: no basta con impactar para activar
Hostigar/Ralentizar. Si no se han introducido dados de daño, ambas propiedades esperan.
Una maestría sobre criaturas no se aplica a un objetivo marcado como objeto inanimado.

## Persistencia y compatibilidad

Se mantienen `schemaVersion: 2` y la columna JSON de PostgreSQL.
`CombatState.masteryEffects` es **opcional** y se valida con límites de IDs, nombres,
longitud y cantidad. `CombatAttackEntry.targetName` y `masteryNote` también son opcionales.
Los guardados antiguos y los métodos anteriores de `recordWeaponAttack` siguen funcionando.
No hay migración de Prisma ni cambios en tablas.

## Límites expresos

- El contador de rondas **no identifica el inicio ni el fin del turno de un combatiente**.
  Los efectos pendientes se retiran manualmente al resolverse o caducar.
  La ventaja de Hostigar podría quedar obsoleta si no se retira a tiempo.
- No hay fichas de enemigos: no se calculan sus PG, posiciones, salvaciones, velocidad
  ni ataques, y no se aplican estados automáticos a terceros.
- Mella y Tajo todavía necesitan comprobar «una vez por turno», acciones y objetivos
  con el director de juego.
- El usuario debe dar nombres distintos a enemigos distintos, por ejemplo «Goblin 1»
  y «Goblin 2», si quiere registrar Hostigar con precisión.
- El historial conserva hasta 100 ataques y 30 efectos de maestría pendientes.

## Instalación

1. Copiar las carpetas `apps`, `packages` y `docs` del ZIP dentro de la raíz del monorepo.
2. Confirmar que `apps/web/src/components/AttacksPanel.tsx` contiene el tipo
   `WeaponAttackProfile`, y **no** el antiguo `ReturnType<typeof calculateWeaponAttack>`.
3. Ejecutar desde la raíz: `pnpm test` y `pnpm build`.
4. Si desea guardar y recuperar personajes, iniciar Docker Desktop y `docker compose up -d`;
   después `pnpm dev`.
5. En la pantalla, indicar objetivo y tamaño, resolver tirada, confirmar, inspeccionar
   el historial y gestionar los efectos pendientes. Finalmente pulsar «Actualizar guardado».

## Comprobaciones manuales recomendadas

1. Elegir maestría Hostigar con espada corta, apuntar a «Goblin 1», impactar y causar daño.
   Debe quedar una ventaja pendiente contra «Goblin 1» y no contra «Goblin 2».
2. Confirmar un segundo ataque contra «Goblin 1»: debe consumir la ventaja, aunque falle.
3. Hacer Ralentizar con daño real y verificar que aparece una reducción única de 10 pies.
4. Comprobar Empujar contra una criatura Enorme: no se debe aplicar.
5. Comprobar Derribar: debe mostrarse CD de salvación, pero sin derribar automáticamente.
6. Guardar y cargar: se deben conservar objetivos, notas y maestrías pendientes.
7. Marcar «Resuelto / caducado» y comprobar que desaparece el efecto.

### Verificación en entorno de creación

- Motor: TypeScript estricto.
- UI: TypeScript estricto sobre las pantallas afectadas con declaraciones de React de
  comprobación local; no equivale a compilar Next.js real.
- Pruebas: ejecutor de aserciones compatible con el conjunto existente; Vitest oficial
  y compilación Next.js se ejecutarán en Windows con `pnpm test` y `pnpm build`.
