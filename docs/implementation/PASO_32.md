# Paso 32. Guerrero 14–15 (PHB 2024)

## Alcance

Esta actualización parte de la **actualización 31** y añade **niveles 14 y 15** al Guerrero del creador guiado, con subclase **Campeón**. Mantiene la selección de nivel mediante flechas y la persistencia existente, sin migraciones SQL.

Referencia de reglas: Manual del Jugador D&D 2024, tabla del Guerrero (página impresa 92) y subclase Campeón (página impresa 96).

### Guerrero 14: Mejora de característica

- Una **quinta elección independiente** después de las mejoras de nivel 4, 6, 8 y 12. Puede ser +2 en una característica o +1 en dos distintas.
- El motor impide aplicar esta elección antes del nivel 14, exige realizarla al subir y rechaza incrementos que eleven una característica por encima de 20.
- Recalcula bonificadores, PG máximos (si mejora Constitución), ataques, habilidades y salvaciones.
- **Limitación:** el Guerrero también puede escoger una dote general alternativa para la que cumpla los requisitos; ese catálogo sigue pendiente. Esta actualización solo automatiza *Mejora de característica*.

### Campeón 15: Crítico superior

- En el nivel 15 los ataques con armas del Campeón hacen crítico con un resultado natural de **18, 19 o 20** en el d20, en lugar del 19–20 anterior.
- El módulo `attacks.ts` calcula `criticalMinimum:18` en nivel 15 y mantiene el valor 19 en niveles 3–14. Personajes sin Campeón conservan umbral 20.
- El crítico duplica **dados** de daño del arma, sin duplicar modificadores fijos ni bonificadores de armas mágicas +1/+2/+3.
- En reglas oficiales también aplica a **golpes desarmados**, pero el prototipo todavía no dispone de un módulo completo de ataques desarmados. Esto queda pendiente y no se simula.

### Valores que se mantienen

- Bonificador de competencia: **+5** en niveles 14 y 15.
- Segundo aliento: **4 usos máximos**.
- Indomable: **2 usos máximos**, recuperados en descanso largo.
- Maestrías de armas: **5**.
- Acción Atacar: **3 ataques**, como desde nivel 11.
- Ataques estudiados, Dominio táctico, Guerrero heroico y los efectos de objetos mágicos permanecen activos.

## Archivos incluidos

| Archivo | Función |
| --- | --- |
| `packages/rules-engine/src/progression.ts` | Validación y aplicación de la mejora de nivel 14; límite del selector en 15 |
| `packages/rules-engine/src/guided.ts` | Nueva elección persistible y cálculo acumulativo de atributos |
| `packages/rules-engine/src/sheet.ts` | Nuevos niveles, rasgos sin duplicados y presentación de la hoja |
| `packages/rules-engine/src/attacks.ts` | Umbral crítico 18–20 del Campeón de nivel 15 |
| `packages/rules-engine/src/resources.ts` | Acepta estados de nivel 14–15 con recursos existentes |
| `packages/rules-engine/src/adventure.ts` | Transiciones de estado de partida hasta nivel 15 |
| `packages/rules-engine/src/level-up.ts` | Validación de progresión paso a paso hasta 15 |
| `packages/rules-engine/src/origin-magic.ts` | Conjuros de origen compatibles con niveles 14–15 |
| `apps/web/src/app/page.tsx` | Quinta mejora, estado React, carga, selector, etiquetas y resumen |
| `packages/rules-engine/tests/progression-14-15.test.ts` | 19 nuevas pruebas de regresión |
| `packages/rules-engine/tests/level-stepper.test.ts` | Extiende máximo del indicador del 13 al 15 |
| `packages/rules-engine/tests/progression-12-13.test.ts` | Actualiza la expectativa obsoleta del máximo 13 |
| `packages/rules-engine/package.json` | Conserva `vitest run --maxWorkers=2`, sin `--minWorkers` |

## Instalación y comprobación

1. Descomprimir `actualizacion-web-26.zip` sobre la **actualización 31** instalada, fusionando las carpetas `apps`, `packages` y `docs`.
2. En la raíz del proyecto: `pnpm test`.
3. Compilar: `pnpm build`.
4. Iniciar PostgreSQL con `docker compose up -d` cuando se quiera guardar y cargar.
5. Arrancar la interfaz: `pnpm dev`.
6. Crear un Guerrero/Campeón nuevo o cargar uno compatible de nivel 13. En **Características**, elegir la mejora del nivel 14 antes de pulsar la flecha derecha.
7. Confirmar **Nivel 14**, guardar, recargar y comprobar que se mantiene. Volver a pulsar la flecha derecha y confirmar **Nivel 15**.
8. En **Ataques con armas**, verificar que aparece **Crítico natural 18–20** y que un 18 natural se considera crítico.
9. Confirmar que la hoja muestra una sola vez **Mejora de característica (nivel 14)** y **Crítico superior**.

## Pruebas del paquete

La revisión local realizó **600 aserciones correctas y 0 fallidas** mediante un ejecutor de compatibilidad, no la ejecución oficial de Vitest. El motor y la pantalla principal superaron la comprobación estricta de TypeScript usando declaraciones temporales de React; no equivale a una compilación de Next.js completa. La prueba definitiva de `pnpm test` y `pnpm build` corresponde al entorno del usuario.

## Compatibilidad y límites

- Se conserva el formato de guardado **schemaVersion 2** y el estado actual de PostgreSQL. No hay migraciones de Prisma.
- Los guardados anteriores no se convierten automáticamente si tienen una estructura incompatible: esta fase se centra en personajes nuevos, como se acordó.
- No se añade multiclase, dotes generales alternativas, subclases adicionales ni sistema de golpes desarmados.
- El siguiente bloque previsto es **niveles 16 y 17**: mejora de característica y aumento de Acción súbita e Indomable.
