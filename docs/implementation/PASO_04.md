# Paso 04: Puntos de golpe y clase de armadura

## Objetivo
Añadir al motor cálculos deterministas y puros de PG máximos del Guerrero y CA convencional de D&D 2024.

## Fuentes y reglas
- Manual del Jugador 2024, capítulo 2, progresión: en niveles posteriores el Guerrero suma el resultado del d10 o 6 fijo, más modificador de Constitución, mínimo 1 por nivel.
- Capítulo 3, Guerrero: dado de golpe d10; al nivel 1 se parte de 10 + modificador de Constitución.
- Capítulo 1, CA: una sola fórmula base de CA a la vez.
- Capítulo 6, tabla de armaduras: armaduras ligeras, medias, pesadas, escudo (+2 con entrenamiento), desventaja de Sigilo y requisito de Fuerza de algunas armaduras pesadas.

## Archivos
- `packages/rules-engine/src/defense.ts`: funciones `calculateFighterHitPoints` y `calculateArmorClass`, catálogo `ARMORS`.
- `packages/rules-engine/tests/defense.test.ts`: 21 comprobaciones automáticas.
- `packages/rules-engine/src/index.ts`: añade exportación, conservando las anteriores.

## Limitaciones conscientes
- El cálculo de PG solo implementa Guerrero monoclase. Multiclase y otras clases se incorporarán después.
- Los valores de PG actuales no se alteran; son estado persistente independiente.
- El motor de CA no elige automáticamente entre varias fórmulas. Quien construya la hoja deberá presentar la elección legal al jugador.
- La bonificación `additionalBonus` solo debe contener modificadores compatibles previamente resueltos. No sumar aquí todos los efectos sin clasificarlos.
- La falta de requisito de Fuerza de armadura pesada se devuelve como advertencia; su penalización de velocidad se gestionará en un módulo posterior.
- La falta de entrenamiento con armadura y sus penalizaciones de juego quedan pendientes de integración con las competencias.
- Los requisitos de armadura son datos mecánicos, no textos copiados del manual.

## Instalación en Windows
Combinar carpetas `packages/` y `docs/` del ZIP con el proyecto existente. Reemplazar solo `packages/rules-engine/src/index.ts`.

Ejecutar desde la raíz:

```powershell
pnpm test
pnpm build
```

Si pasa:

```powershell
git add packages/rules-engine docs/implementation/PASO_04.md
git commit -m "feat: calcular puntos de golpe y clase de armadura"
git push
```

## Siguiente paso
Recursos y descansos del Guerrero (Segundo aliento y Acción súbita), manteniendo la distinción entre valores máximos calculados y usos actuales persistidos.
