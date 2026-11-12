# Corrección 40.1 · Detalle de velocidad del beneficio épico

**Fecha:** 12 de noviembre de 2026.  
**Alcance:** corrección localizada de la actualización 40, sin cambios en reglas, persistencia, interfaz global ni dependencias.

## Incidencia

Al ejecutar `pnpm test` en Windows con Vitest 5.1.0, se detectó 1 fallo de 718 pruebas (`tests/traits.test.ts`, caso «incluye únicamente la elección épica vigente y su mejora sin duplicarla»). Las otras 717 pruebas pasaron.

El test comprobaba con `toContain('Velocidad total calculada: 60 pies.')` un **elemento exacto** del array `details`. El código original introducía esa frase y «La acción adicional se resuelve manualmente.» dentro de **una misma cadena**. La expectativa no coincidía con la estructura del resultado aunque la velocidad calculada fuera correcta.

## Análisis

El motor base (`guided.ts`) determina una velocidad inicial de 30 pies para el personaje humano y agrega 30 pies cuando se elige el beneficio épico de Velocidad a nivel 19. La proyección `traits.ts` toma `result.origin.speedFeet`, por lo que el cálculo esperado de 60 pies estaba bien. La incidencia era exclusivamente de formato/estructura de la descripción.

## Solución

En `packages/rules-engine/src/traits.ts`, separar los mensajes en dos elementos del array `details`:

1. `Velocidad total calculada: ${result.origin.speedFeet} pies.`
2. `La acción adicional se resuelve manualmente.`

Esto mantiene la velocidad dinámica, facilita la presentación por líneas en la pestaña Rasgos y permite que la prueba existente verifique la frase exacta sin debilitar su aserción. No se modifica `tests/traits.test.ts`.

## Validación

- Evidencia previa comunicada por el autor: **717 pruebas superadas, 1 fallida**.
- Prueba que debe repetirse: `pnpm --filter @dnd/rules-engine test -- traits.test.ts` o `pnpm test`.
- Pruebas completas posteriores: `pnpm lint`, `pnpm test`, `pnpm build`.
- Revisar en un Guerrero humano de nivel 19 con beneficio épico de Velocidad que Rasgos muestre la velocidad total y la nota manual por separado.
- Estado de cierre: **pendiente de la validación local del autor**.

## Control de versiones

Solo se incluyen estos archivos en la corrección:

- `packages/rules-engine/src/traits.ts` (modificado).
- `docs/implementation/PASO_40_1_CORRECCION_PRUEBA_VELOCIDAD.md` (nuevo).

No hacer `git add -A`. Si la actualización 40 aún no se ha subido, incorporar esta corrección al mismo commit; si ya se subió, realizar commit separado `fix: correccion 40.1 - detalle de velocidad epica`.
