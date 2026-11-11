# Corrección de progresión: bloqueo al subir de nivel 6 a 7

## Problema

El nivel se consolidaba solamente después de validar la elección del segundo estilo y el estado completo de combate. Si fallaba una de estas condiciones, el selector permanecía en el nivel 6; sin el nivel actualizado, PostgreSQL guardaba correctamente el 6, aunque otras elecciones de la interfaz parecieran preparadas para el 7.

Las versiones anteriores arreglaban casos de prueba de progresión, pero no ofrecían al usuario una vía clara de recuperación cuando su sesión real era incompatible. Esta corrección NO afirma resolver todas las posibles causas de inconsistencia sin diagnosticar el guardado del usuario.

## Cambios

1. `apps/web/src/app/page.tsx`: la elección del segundo estilo aparece junto al indicador del nivel 6; el usuario elige libremente entre estilos distintos del inicial. Se valida la hoja del nivel siguiente antes de intervenir sobre la sesión.
2. Si el estado de combate se puede sincronizar, el programa pide permiso y trata de conservar PG perdidos, recursos e historial, tal y como hacía la actualización anterior.
3. Si la hoja nueva es válida pero el estado de combate impide la progresión, muestra **la causa real** y un botón de recuperación explícito.
4. El botón de recuperación requiere confirmación y genera **una sesión de combate nueva**, perdiendo los PG actuales, recursos gastados, condiciones, turnos y el historial de la sesión en pantalla. **No cambia el personaje existente en PostgreSQL** hasta que se pulsa Actualizar guardado. Si estos datos son importantes, cancelar y mantener el guardado previo.
5. `packages/rules-engine/src/level-up.ts`: la recuperación es una función pura, separada del camino normal, que valida el nivel consecutivo, la identidad y las elecciones antes de crear una instantánea nueva de nivel 7.

## Instalación

Copiar las carpetas `apps`, `packages` y `docs` de este ZIP dentro de la raíz del proyecto. Reemplazar solo los archivos incluidos. No requiere instalación de dependencias, cambios en Prisma ni migraciones. No modifica `packages/rules-engine/package.json`; sigue siendo `vitest run --maxWorkers=2`.

```
pnpm test
pnpm build
pnpm dev
```

## Prueba recomendada

1. Cargar el Guerrero de nivel 6 y comprobar el indicador.
2. En Identidad, seleccionar un segundo estilo diferente del primero, **justo debajo del selector**.
3. Pulsar `→`. Si el estado es coherente, pasa a 7 y conserva la sesión.
4. Si el estado no es coherente, leer el mensaje de error. Si se desea conservar la sesión, NO utilizar recuperación: consultar el mensaje.
5. Si se acepta perder la sesión en pantalla, utilizar `Subir a nivel 7 con una sesión de combate nueva` y confirmar. Debe mostrar 7 y permitir guardar.
6. Pulsar `Actualizar guardado`; cargar nuevamente y verificar el nivel.
7. En nivel 7, seleccionar la mejora de nivel 8 antes de avanzar y repetir con 8→9.

## Validación del artefacto

- 569 comprobaciones locales de aserciones: 0 fallos.
- TypeScript estricto en todos los módulos de motor y la pantalla corregida con stubs locales de React: sin errores.
- Se requiere ejecución real de Vitest y compilación completa de Next.js en el ordenador del usuario; no se ha ejecutado Next.js con dependencias completas aquí.
