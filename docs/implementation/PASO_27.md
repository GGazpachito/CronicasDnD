# Paso 27 · Progresión del Guerrero hasta nivel 5

**Alcance:** extensión incremental de los niveles 1–3 a los niveles 1–5 del Guerrero 2024, manteniendo al Campeón como única subclase disponible.

## Reglas normalizadas

Fuentes del usuario: *Player's Handbook 2024*, tabla del Guerrero y descripciones de rasgos (pág. impresa 91; PDF pág. 91); origen élfico (pág. impresa 189–190). Solo se almacenan identificadores y consecuencias mecánicas, no textos extensos del manual.

- **Nivel 4:** mejora de característica (dote Ability Score Improvement) **+2 a una característica o +1 a dos distintas**, máximo 20; cuarto tipo de arma dominada; Segundo aliento pasa de dos a tres usos.
- **Nivel 5:** competencia **+3**; **Ataque adicional**, dos ataques al utilizar la acción Atacar; **Desplazamiento táctico** al activar Segundo aliento: movimiento de hasta la mitad de la velocidad sin provocar ataques de oportunidad. Movimiento especial explicado en UI, controlado por el DM.
- Se mantienen PG del d10 del Guerrero, incremento fijo 6 por nivel después del primero, y efectos retroactivos de cambios de Constitución.
- Los linajes élficos reciben el conjuro de nivel 2 correspondiente al nivel 5.

## Comportamiento de la interfaz

1. En **Características**, elegir la mejora de nivel 4 antes de subir.
2. En **Equipo**, elegir la cuarta maestría con antelación (sin repetir las tres existentes).
3. En **Identidad**, pulsar el siguiente nivel **de uno en uno**. No se permiten saltos ascendentes.
4. Cada incremento valida la nueva hoja y aplica una transición **explícita** al estado persistido. Se preservan PG perdidos, PG temporales, usos gastados, dados de golpe gastados, condiciones, turnos, historial y concentración. El incremento de PG máximos añade a los actuales exactamente la diferencia positiva.
5. En **Ataques con armas**, una vez iniciada una acción Atacar, los Guerreros de nivel 5 pueden seleccionar **Ataque adicional** para confirmar un segundo ataque sin gastar otra acción. Se impide un tercer ataque de la misma acción. Las limitaciones situacionales como Carga y alcance se siguen comprobando con el DM.
6. En **Jugar con tu personaje**, Segundo aliento muestra los máximos correctos y Desplazamiento táctico aparece como recordatorio para nivel 5.
7. En **Mis personajes**, actualizar el guardado después de subir. Si se reduce el nivel manualmente se restablece el estado de juego: **guardar una copia antes de bajar**.

## Compatibilidad

- Continúa el **schemaVersion 2** con `level4Improvement` opcional en `GuidedFighterInput` y el contador opcional `attackActionAttacksUsed` en el turno. Los estados de turno anteriores se normalizan asignando 1 si ya constaba una acción Atacar, 0 si no.
- La cuarta maestría se exige únicamente a partir del nivel 4.
- Sin migraciones Prisma ni modificaciones del esquema PostgreSQL.
- La configuración de Vitest sigue siendo `vitest run --maxWorkers=2` (Vitest 5 no reconoce `--minWorkers`).

## Limitaciones explícitas

- **Solo** está implementada la dote general de mejora de característica de nivel 4. Otras dotes generales y sus prerrequisitos se añadirán después.
- El seguimiento de Desplazamiento táctico es un recordatorio: la distancia, el movimiento y los ataques de oportunidad se confirman en la mesa.
- El motor no simula enemigos, posiciones o todas las restricciones de la propiedad Carga al combinar armas y acciones.
- No se implementan niveles 6–20, subclases adicionales ni multiclase.
- Cambiar la selección de mejora después de subir puede desincronizar los máximos de PG. El panel ofrece reiniciar el estado; no lo hace silenciosamente.

## Pruebas y revisión

- `pnpm test` y `pnpm build` en Windows, desde la raíz del repositorio. La ejecución oficial debe verificarse allí.
- Regresión local: **505 comprobaciones** mediante adaptador compatible de aserciones, **0 fallos**; TypeScript estricto del motor y comprobación local de tipos de la interfaz con declaraciones auxiliares.
- Casos: elección nivel 4, cuarto dominio, ASI y límites, recursos, subida secuencial, PG, guardado v2, conjuros élficos, Ataque adicional y turno antiguo.

## Archivos

`packages/rules-engine/src/progression.ts`, `guided.ts`, `sheet.ts`, `resources.ts`, `martial.ts`, `attacks.ts`, `turns.ts`, `combat.ts`, `adventure.ts`, `origin-magic.ts`, `index.ts`, `packages/rules-engine/tests/progression.test.ts`, `apps/web/src/app/page.tsx`, `apps/web/src/components/AttacksPanel.tsx`, `TurnPanel.tsx`, `PlayPanel.tsx`, `packages/rules-engine/package.json`.
