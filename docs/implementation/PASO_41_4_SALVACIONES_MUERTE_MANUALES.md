# Actualización 41.4. Marcadores manuales de salvaciones de muerte

**Proyecto:** Hoja y editor de personaje de D&D 2024 (5.5)
**Fecha:** 13 de noviembre de 2026
**Estado:** implementación preparada y comprobada parcialmente; pendiente de verificación local integral del usuario.
**Base:** actualización 41.3 (armas compactas, ventaja compartida e inspiración visual).

## 1. Requisito

El usuario solicita seis controles visuales en la pestaña Principal: tres marcadores de salvación de muerte **superada** y tres de salvación de muerte **fallida**. Cada uno debe poder activarse y desactivarse individualmente mediante un clic. La fase no debe automatizar tiradas, estabilización o muerte.

## 2. Decisiones de interfaz

- Mantener la tarjeta existente «Salvaciones de muerte» en el bloque inferior de Principal.
- Disponer dos grupos de tres botones circulares: «Éxitos», en verde, y «Fallos», en rojo.
- Un círculo sin marca representa un resultado pendiente. Un círculo seleccionado muestra una marca visible, sin depender únicamente del color.
- Actualizar el indicador de grupo (`0/3` a `3/3`) tras cada clic.
- Implementar cada marca con un botón real, `aria-pressed` y `aria-label` descriptivo; ofrecer estados `hover`, foco visible y `disabled`.
- La tarjeta indica expresamente que no ejecuta reglas y que los cambios se guardan con «Actualizar guardado».

## 3. Decisión sobre el estado y la persistencia

La implementación anterior ya incluye una estructura de reglas de muerte bajo `adventure.survival.death`, utilizada por el módulo completo de Supervivencia. **No se modifican sus contadores**, porque la solicitud trata de marcas manuales, sin efectos automáticos. Además, ese módulo valida reglas como la necesidad de estar a 0 PG y reinicia contadores al estabilizarse o morir, incompatibles con seis casillas libremente modificables.

Se añade un campo **opcional** en el mismo estado persistente de partida, sin inventar otra sesión independiente:

```ts
manualDeathMarks?: {
  successes: readonly [boolean, boolean, boolean];
  failures: readonly [boolean, boolean, boolean];
}
```

La ausencia del campo equivale visualmente a seis marcas vacías. La operación pura `setManualDeathSaveMark(state, sheet, kind, index, selected)` crea un estado nuevo e independiente del recibido y valida el estado, el índice (0 a 2), la categoría y el valor booleano.

**Compatibilidad:** los guardados antiguos de esquema v2 sin `manualDeathMarks` siguen siendo válidos; el campo opcional se serializa dentro de `adventure`, que ya se conserva en la columna JSON de personajes. No requiere migración SQL ni incremento de `schemaVersion`.

**Separación de responsabilidades:** marcar tres fallos **no** declara automáticamente muerto al personaje. Marcar tres éxitos **no** lo estabiliza. El módulo de Supervivencia mantiene su funcionamiento previo; ambos conjuntos de datos son independientes hasta que se diseñe una integración deliberada en fases posteriores.

## 4. Archivos incluidos

1. `apps/web/src/components/PrincipalOverview.tsx`: sustituye el resumen numérico antiguo por dos grupos interactivos de tres marcas. Usa `onAdventureChange` para actualizar el estado único recibido desde `page.tsx`.
2. `apps/web/src/app/globals.css`: círculos y estilos de selección, foco, accesibilidad y tamaños adaptables.
3. `packages/rules-engine/src/adventure.ts`: incorpora tipo, validación de campo opcional y operación pura de cambio manual.
4. `packages/rules-engine/tests/manual-death-marks.test.ts`: pruebas de alternancia, independencia, compatibilidad, persistencia e inputs inválidos.
5. `docs/implementation/PASO_41_4_SALVACIONES_MUERTE_MANUALES.md`: esta memoria.

## 5. Validación realizada durante la preparación

- **Comprobación de TypeScript estricto del motor:** superada con `tsc 5.8.3` del entorno de preparación.
- **Comprobación de TypeScript estricto del componente web:** superada.
- **Compilación de motor y componente a JavaScript:** superada.
- **Seis verificaciones de comportamiento ejecutadas directamente:** alternancia independiente, coexistencia de seis marcas, preservación de estado original, serialización y recuperación del guardado v2, compatibilidad retroactiva, conservación de las marcas al recibir daño y rechazo de entradas inválidas.
- **Renderizado aislado de React:** se han comprobado seis botones descriptivos, estado inicial vacío, marcadores seleccionados tras restaurar el personaje y texto de alcance manual.

**Pendiente en el equipo del usuario:** `pnpm lint`, `pnpm test`, `pnpm build`, inspección responsive en navegador, guardado manual y recuperación en PostgreSQL. No afirmar que estas pruebas se hayan completado hasta recibir su resultado.

## 6. Pruebas manuales de aceptación

1. Cargar un personaje guardado o crear uno nuevo. Deben verse tres círculos de «Éxitos» y tres de «Fallos», todos sin marcar si el campo era inexistente.
2. Marcar el segundo éxito y el tercer fallo. Deben aparecer `1/3` en ambos grupos, sin seleccionar los otros círculos.
3. Volver a pulsarlos. Ambas marcas deben desaparecer y los contadores regresar a `0/3`.
4. Marcar los tres fallos y después los tres éxitos. No deben modificarse los PG ni los contadores del módulo de Supervivencia; no debe generarse un estado de muerte/estabilización.
5. Guardar el personaje desde «Mis personajes», recargarlo y comprobar que las seis marcas conservan su selección.
6. Abrir un personaje guardado antes de esta fase y confirmar que se carga sin errores.
7. Verificar foco por teclado, etiquetas para lectores de pantalla y visualización en móvil.

## 7. Riesgos y límites conocidos

- La coexistencia de `manualDeathMarks` y `survival.death` es una separación **intencionada**. La interfaz la presenta como manual para evitar atribuirle reglas que no ejecuta.
- Al modificar cualquiera de los seis círculos, la actualización está en memoria hasta que el usuario pulse «Actualizar guardado»; no se incorporó guardado automático.
- Si la partida está desincronizada y `PrincipalOverview` no recibe un estado utilizable, las marcas se muestran deshabilitadas para evitar modificaciones de un estado inválido.
- Una futura integración con combate/agonía debe decidir si los controles pasarán a representar el registro oficial o seguirán siendo anotaciones. No vincular ambas fuentes por coincidencia de nombre sin migración explícita de datos.

## 8. Instalación y control de versiones

Descomprimir el ZIP dentro de la raíz `DndEditor`, conservando rutas relativas y sustituyendo **únicamente** los archivos incluidos. No borrar carpetas ni reinstalar la base de datos.

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Preparar exclusivamente los cinco archivos de esta revisión:

```powershell
git add -- "apps/web/src/components/PrincipalOverview.tsx" "apps/web/src/app/globals.css" "packages/rules-engine/src/adventure.ts" "packages/rules-engine/tests/manual-death-marks.test.ts" "docs/implementation/PASO_41_4_SALVACIONES_MUERTE_MANUALES.md"
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: actualizacion 41.4 - marcadores manuales de salvaciones de muerte"
git push -u origin HEAD
git status
```

**Trazabilidad TFG:** registrar fecha, resultados de comandos, pruebas en navegador y hash de commit una vez verificados por el usuario. La fase es una mejora de experiencia de usuario; no constituye implementación de nuevas reglas de combate.
