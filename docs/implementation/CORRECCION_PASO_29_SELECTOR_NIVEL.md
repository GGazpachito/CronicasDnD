# Corrección del paso 29: indicador de nivel con flechas

## Motivo

La cuadrícula de nueve botones se reemplaza por un indicador del nivel actual con **flecha izquierda**, **número central** y **flecha derecha**. El cambio responde a problemas de selección perceptibles en niveles 7, 8 y 9 y evita la posibilidad de intentar saltar varios niveles al hacer clic en un botón distante.

## Comportamiento

- La flecha derecha intenta subir **un nivel**; queda deshabilitada en nivel 9.
- La flecha izquierda baja **un nivel**; queda deshabilitada en nivel 1.
- No se concede un nivel si la hoja no es válida o faltan elecciones obligatorias. En ese caso se presenta el motivo **junto al indicador**.
- Para entrar en nivel 7 hay que elegir antes **Equipo → Segundo estilo de combate del Campeón**.
- Para entrar en niveles 4, 6 u 8 deben ser válidas las elecciones de mejora de característica; la cuarta maestría es necesaria al alcanzar nivel 4.
- Una subida válida conserva PG, recursos gastados, combate, inventario e historial, como en la actualización 29.
- Una bajada elimina el estado de combate asociado al nivel superior. **Si había sesión activa, pide confirmación antes de hacerlo.** El código anterior ya reiniciaba ese estado al bajar de nivel; ahora lo hace explícito en la interfaz. Conviene guardar una copia antes de bajar.
- Los guardados existentes de niveles 1 a 9 siguen siendo compatibles. Sin cambios en Prisma ni esquema de datos.

## Archivos

- `apps/web/src/app/page.tsx`: sustituye cuadrícula de botones, muestra mensajes concretos y añade confirmación al bajar con sesión activa.
- `apps/web/src/app/globals.css`: nueva presentación accesible y adaptable a móvil.
- `packages/rules-engine/src/progression.ts`: función pura `adjacentFighterLevel` para calcular el nivel contiguo con límites 1–9.
- `packages/rules-engine/tests/level-stepper.test.ts`: pruebas de límites, avance y retroceso, elecciones de nivel 7 y progresión real 6→7→8→9.

## Verificación en Windows

Desde la raíz del proyecto:

```powershell
pnpm test
pnpm build
pnpm dev
```

1. Abre **Identidad**: debe aparecer `←  [ NIVEL ACTUAL · 6 ]  →`, no una cuadrícula de nueve botones.
2. En nivel 6, pulsa la flecha derecha **sin** seleccionar el segundo estilo: se verá un mensaje que explica la elección pendiente, sin cambiar de nivel.
3. En **Equipo**, escoge un segundo estilo de Campeón diferente del primero. Vuelve a **Identidad** y pulsa la flecha derecha: nivel 7.
4. En nivel 7, elige la mejora de nivel 8 en **Características** y vuelve al indicador para subir a 8. Después sube a 9.
5. Comprueba que la flecha derecha está deshabilitada en 9 y que al bajar un nivel con sesión activa aparece confirmación.
6. Comprueba el guardado/carga de un Guerrero de nivel 9 y el seguimiento correcto de su nivel.

El comando de Vitest de la actualización 29 permanece `vitest run --maxWorkers=2`.
