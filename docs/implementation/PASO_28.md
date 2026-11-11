# Paso 28 · Guerrero 2024 niveles 6 y 7

## Alcance

La progresión guiada del **Guerrero Campeón** admite niveles **1–7**, conservando guardados anteriores. En esta entrega se implementan únicamente las novedades de nivel 6 y 7. El resto de clases, subclases y dotes generales alternativas siguen pendientes.

Reglas contrastadas con el *Player's Handbook 2024* aportado al proyecto: tabla del Guerrero, pág. impresa 92 (PDF pág. 91) y rasgos del Campeón, pág. impresa 96 (PDF pág. 95). Se emplean identificadores y reglas estructuradas, no transcripciones extensas del manual.

## Mecánicas implementadas

- **Nivel 6:** segunda elección independiente de la dote **Mejora de característica**, de +2 a una característica o +1/+1 a dos diferentes, hasta un máximo de 20. Se aplica después de la mejora de nivel 4 y de las bonificaciones de origen. Se recalculan los modificadores, las salvaciones, los ataques y los PG retroactivos de Constitución.
- **Nivel 7 (Campeón):** **Estilo de combate adicional**. Se debe seleccionar explícitamente un segundo estilo **diferente** del inicial. Es una opción independiente que se registra en el personaje. Las bonificaciones aplicables a CA y ataques se acumulan cuando sus condiciones se cumplen (por ejemplo, Defensa + Tiro con arco), pero no es posible elegir el mismo estilo dos veces.
- Continúan vigentes **cuatro maestrías de arma**, **tres usos máximos de Segundo aliento**, **competencia +3**, **Acción súbita** y **dos ataques por acción Atacar** de nivel 5.
- El motor de ataques acepta el estilo inicial y el adicional en niveles 7 y posteriores, aplicando cada efecto contextual individualmente y rechazando estilos repetidos.
- Se preservan los recursos consumidos, el historial de ataques, las condiciones, la munición, el inventario y las propiedades del equipo durante las transiciones de nivel.

## Instalación

1. Copiar las carpetas `apps`, `packages` y `docs` del ZIP sobre la raíz de `dnd-character-builder`.
2. Comprobar que la actualización 27 y su corrección de Ataque adicional ya están instaladas.
3. Desde la raíz del proyecto, ejecutar `pnpm test`, `pnpm build` y `pnpm dev`.
4. No requiere migraciones de Prisma ni modificaciones de la base de datos. La versión JSON del guardado permanece en `schemaVersion: 2`.

El script de Vitest **no se modifica**: `packages/rules-engine/package.json` conserva `vitest run --maxWorkers=2` y no incluye `--minWorkers`, que no es compatible con la instalación de Vitest del usuario.

## Probar la interfaz

1. Abrir un Guerrero de nivel 5, entrar en **Características** y elegir la mejora de nivel 6; en **Identidad**, pulsar **Nivel 6**.
2. Comprobar características, competencia +3, PG máximos y dos ataques por acción Atacar.
3. En **Equipo**, elegir el segundo estilo de combate del Campeón (obligatoriamente diferente al inicial). En **Identidad**, pulsar **Nivel 7**.
4. Verificar, por ejemplo, que **Defensa + Tiro con arco** concede +1 CA con armadura y +2 ataque con armas a distancia. La CA se calcula desde equipo y modificadores existentes; no se duplican defensas.
5. Guardar el personaje, volver a cargarlo y verificar nivel, elecciones, inventario y estado de combate.
6. Comprobar que un Guerrero 7 puede registrar dos ataques con la misma acción Atacar, manteniendo el comportamiento corregido de la actualización 27.

## Pruebas automáticas

`packages/rules-engine/tests/progression-6-7.test.ts` incorpora comprobaciones de:

- compatibilidad 1–5; mejora independiente de nivel 6; máximo 20; +1/+1; atributos y PG;
- selección explícita y no duplicada del segundo estilo; combinación de estilos ofensivos y defensivos;
- Ataque adicional en nivel 7; maestrías; recursos; hechizos de linaje sin cambios;
- subida 5→6→7, historial, estados y recursos conservados, guardado v2, rechazo de saltos de nivel.

La comprobación local utiliza un ejecutor de aserciones compatible con las pruebas; **no sustituye** la ejecución oficial de Vitest y Next.js en el entorno del proyecto. Además se comprueba TypeScript estricto del motor y de las pantallas modificadas con declaraciones auxiliares.

## Limitaciones deliberadas

- Solo se ofrece **Mejora de característica** en nivel 6. Elegir otra dote general exige un catálogo con requisitos y efectos que todavía no existe.
- Los efectos de estilos que requieren reacción, sentidos especiales, posiciones o estadísticas de enemigos siguen siendo manuales.
- El selector no concede automáticamente un segundo estilo: hay que elegirlo antes de entrar en nivel 7.
- Esta fase termina en nivel 7. El siguiente tramo empezará con nivel 8 (mejora) y nivel 9 (Indomable / Dominio táctico).
