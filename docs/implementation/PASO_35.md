# PASO 35 — Guerrero nivel 20: Tres ataques adicionales

## Objetivo

Completar el recorrido de niveles **1 a 20** del Guerrero (subclase **Campeón**) dentro del alcance actual del prototipo, manteniendo los cálculos de personajes, el estado de combate, el inventario y el formato de guardado v2.

Fuente de reglas: *Player's Handbook* (2024), tabla de rasgos del Guerrero y característica de nivel 20 **Three Extra Attacks** (capítulo 3, apartado Fighter, página impresa 91). Nivel 20: **cuatro** ataques por cada acción **Atacar**. El bonificador por competencia se mantiene en **+6**. Los recursos siguen con los máximos de nivel 17 (Segundo aliento 4, Acción súbita 2, Indomable 3).

## Cambios del motor

- `progression.ts`: la flecha permite `19 → 20`; en 20 ya no avanza.
- `guided.ts`, `sheet.ts`, `resources.ts`, `attacks.ts`, `origin-magic.ts`: los cálculos admiten nivel 20. No se añade una mejora de característica, maestría ni beneficio épico nuevo en ese nivel.
- `sheet.ts`: nuevo identificador de rasgo `three_extra_attacks` **una sola vez**.
- `turns.ts`: máximo absoluto de cuatro ataques en una acción Atacar. El sugeridor de modalidad ofrece automáticamente el segundo, tercer y cuarto ataque; después propone una nueva acción, que solo podrá efectuarse si queda una disponible.
- `combat.ts`: `recordWeaponAttack` permite un máximo de cuatro ataques **solo** para nivel 20. Las armas mágicas y maestrías siguen resolviéndose en cada golpe.
- `adventure.ts`: bloquea guardar/cargar un contador de ataques incompatible con el nivel de la hoja, aunque el contador sea válido en otros niveles; permite `19 → 20` manteniendo el daño, recursos gastados y el estado de partida.
- `level-up.ts`: admite la transición consecutiva `19 → 20` y consolida el nivel de la hoja y del estado de partida en la misma instantánea validada.

## Cambios visuales

- `page.tsx`: indicador con flechas hasta nivel 20 y descripción del nuevo rasgo, sin alterar la presentación previa.
- `AttacksPanel.tsx`: muestra `0/4`, `1/4`, `2/4`, `3/4` y `4/4` y selecciona automáticamente **Ataque adicional** hasta consumir los cuatro.
- `TurnPanel.tsx`: indica el número correcto de ataques de la acción Atacar.

## Acción súbita y restricciones

Acción súbita puede otorgar una segunda acción Atacar, permitiendo **cuatro + cuatro = ocho** ataques con dos acciones Atacar en el mismo turno. No concede una tercera acción. Los ataques extra por Ligera/Mella o Tajo tienen **requisitos y límites separados**, por lo que no se incluyen en el contador de cuatro ataques de cada acción Atacar. Las interacciones con enemigos, distancias y ataques de oportunidad siguen sujetas al DM.

## Guardado y base de datos

El formato de guardado sigue siendo `schemaVersion: 2`; no se modifica el esquema de Prisma ni es necesaria ninguna migración. Se conserva el nivel 20 y el estado de turno válido al serializar y recargar.

**Aclaración de alcance:** al completar nivel 20 no se han incorporado aún las demás subclases del Guerrero, el catálogo completo de dotes generales/épicas ni los golpes desarmados. El recorrido 1–20 es funcional con la subclase y las opciones actualmente implementadas, no una cobertura íntegra de todas las elecciones del PHB.

## Instalación

1. Copia las carpetas `apps`, `packages` y `docs` de este ZIP en la raíz de `DndEditor`, fusionando y reemplazando los archivos indicados.
2. Ejecuta `docker compose up -d` si quieres guardar o cargar personajes.
3. Ejecuta `pnpm test`, `pnpm build` y, por último, `pnpm dev`.
4. Confirma que `packages/rules-engine/package.json` sigue usando `vitest run --maxWorkers=2`. Esta actualización no lo reemplaza: conserva el archivo ya instalado.

## Escenarios manuales

1. Crea o carga un Campeón de nivel 19, con su beneficio épico elegido, y pulsa la flecha derecha. Debe mostrar **20**.
2. Comienza un turno y confirma cuatro ataques consecutivos con un arma que poseas: debe contar `1/4 → 4/4` con **solo una acción** consumida.
3. Un quinto ataque adicional debe ser rechazado; el desplegable puede mostrar Acción Atacar, pero sin Acción súbita no habrá acciones disponibles.
4. Con otro turno nuevo, gasta Acción súbita y confirma dos acciones Atacar, cada una con cuatro ataques: **ocho** golpes y **dos** acciones gastadas.
5. Comprueba que cada ataque aparece en el historial una única vez, incluidas maestrías y munición cuando corresponda.
6. Guarda, recarga y confirma que permanecen nivel 20, los PG actuales, los recursos gastados y el contador de ataques del turno.
7. Comprueba que un Guerrero de nivel 19 conserva el límite de **tres** ataques por acción y que `20 → 21` está bloqueado.

## Pruebas técnicas

- `tests/progression-20.test.ts`: selector, rasgos sin duplicados, recursos, beneficio épico, límites por nivel, cuatro golpes, Acción súbita, historial, guardado y transición 19→20.
- Pruebas de navegación anteriores actualizadas al nuevo límite (20).
- Prueba de regresión del nivel 11 actualizada para diferenciar el máximo absoluto de cuatro de su límite propio de tres por acción.
- Verificado localmente con TypeScript estricto en el motor y el conjunto de pruebas y una comprobación de tipos de TSX usando declaraciones locales de React. **La ejecución oficial de Vitest y la compilación de Next.js quedan pendientes de ejecutarse en tu ordenador.**
