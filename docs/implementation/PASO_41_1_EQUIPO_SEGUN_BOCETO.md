# Actualización 41.1: distribución de Equipo según boceto y equipamiento por casillas

**Fecha:** 13/11/2026  
**Estado:** implementado; verificación de ESLint, suite Vitest y compilación Next.js pendiente en el entorno del autor.  
**Origen:** ajuste solicitado tras la actualización 41. Referencia: dibujo aportado por el autor con Inventario (izquierda), Objetos equipados (derecha superior), Objetos mágicos (derecha inferior) y contador Oro/Plata/Cobre inferior.

## Objetivo y requisitos

- Reorganizar la pestaña **Equipo** en dos columnas en escritorio, siguiendo la referencia visual suministrada.
- Inventario en la columna izquierda, con buscador, filtros y cada objeto con nombre y cantidad.
- Todas las armas, armaduras y escudos **poseídos** incluyen casilla de equipamiento; los objetos no equipables carecen de ella.
- Módulo **Objetos equipados** en la esquina superior derecha, actualizado automáticamente. Debe incluir armas, armaduras y escudos mundanos y los equivalentes mágicos que estén marcados como llevados/equipados.
- Módulo **Objetos mágicos** debajo, reutilizando el panel de la fase 41 con su distinción entre equipar y vincularse.
- Contador de **oro / plata / cobre** a lo ancho bajo ambas columnas. Los saldos se derivan de las piezas de cobre del inventario, no se almacenan por duplicado.
- Conservar operaciones de compra, venta, botín, deshacer y reinicio. Para respetar el boceto, se mueven a un desplegable **dentro del Inventario**.
- Conservar compatibilidad con los personajes guardados y los cálculos actuales de combate, equipamiento, CA y objetos mágicos.

## Decisiones técnicas y justificación

### Una sola fuente de verdad

Las casillas ejecutan `InventoryAction` sobre el diario `inventoryActions` ya existente. Al reproducir ese diario se obtiene `InventoryState`. La lista de equipados es una proyección de solo lectura calculada mediante `equippedInventory(state)`.

El esquema original ya poseía las operaciones `equip_armor`, `equip_shield`, `magic_wear` y `magic_attune`. Se incorpora la operación `equip_weapon` (`weaponId` y `equipped`) para registrar la selección de **armas mundanas**. El estado derivado `equipped.weapons` se inicia como un array vacío. Al retirar la última unidad de un arma, se limpia automáticamente su marca de equipamiento. Si se intenta marcar un arma que el personaje no posee, la operación falla.

La selección de armas ordinarias **no modifica** sus estadísticas de ataque ni prohíbe usar otras armas poseídas en el módulo de ataques. No se han implementado restricciones de manos, desenvainado o peso porque correspondería a una automatización activa que aún no se ha diseñado. Actualmente «equipar arma» significa **marcarla como preparada o seleccionada en la hoja**. Se permiten varias armas marcadas, sin cantidad máxima arbitraria. Las armas mágicas continúan utilizando `magic_wear` y sus identidades de instancia.

La armadura sigue siendo exclusiva (una sola armadura normal o mágica) y el escudo solo se considera equipado cuando su operación de equipamiento esté activa. Las piezas mágicas de armadura y escudo desactivan sus equivalentes normales mediante las reglas preexistentes.

### Guardados anteriores

No se requieren cambios de Prisma, migraciones ni nueva versión del esquema JSON. El sistema conserva la versión **2** de guardado, almacenando las nuevas operaciones en el array `inventoryActions`. Los diarios antiguos que no contengan `equip_weapon` continúan produciendo un `equipped.weapons` vacío. Los datos del personaje, sus monedas y los objetos permanecen sin alteraciones.

### Interfaz y accesibilidad

Los elementos equipables emplean `input type="checkbox"`, estado controlado y una etiqueta accesible individual. Las casillas reflejan el estado derivado del motor; el módulo de equipados se actualiza al registrarse la acción. Los mensajes de error y éxito se presentan fuera del desplegable de comercio, para que también sean visibles al pulsar una casilla.

En pantallas pequeñas la rejilla se transforma en una sola columna y el contador de monedas mantiene sus tres denominaciones. El componente mágico original se conserva dentro de la columna derecha.

## Archivos modificados/creados

| Ruta | Motivo |
| --- | --- |
| `apps/web/src/components/EquipmentPanel.tsx` | Nuevo diseño y casillas conectadas al diario; vista de equipados y monedas |
| `apps/web/src/app/globals.css` | Rejilla adaptable, casillas, tarjetas y monedero |
| `packages/rules-engine/src/inventory.ts` | Acción `equip_weapon`, estado derivado y limpieza en retirada |
| `packages/rules-engine/src/inventory-view.ts` | Proyección de armas equipadas y resumen ordinario/mágico |
| `packages/rules-engine/tests/equipment-checks.test.ts` | Pruebas de casillas, validación, inventario, compatibilidad y guardado |
| `docs/implementation/PASO_41_1_EQUIPO_SEGUN_BOCETO.md` | Esta memoria |

## Comprobaciones realizadas en el entorno de preparación

- Chequeo estricto de TypeScript de `inventory.ts` e `inventory-view.ts`: **correcto** (compilador local 5.8.3).
- Chequeo estricto de TypeScript del componente `EquipmentPanel.tsx` y dependencias: **correcto** (compilador local 5.8.3).
- 15 comprobaciones directas mediante Node sobre módulos TypeScript compilados: **correctas**.
- Renderizado aislado con React del panel, inventario, lista de equipados, casillas, objetos mágicos y monedero: **correcto**.
- Suite completa de Vitest, ESLint de la aplicación, `pnpm build` y prueba interactiva en navegador: **pendientes del entorno local del autor**. Las nuevas pruebas de Vitest se incluyen, pero no se afirman ejecutadas de manera integral.

## Pruebas locales de aceptación

1. Ejecutar `pnpm lint`, `pnpm test` y `pnpm build` sin fallos.
2. Cargar un personaje guardado anterior a la fase 41.1 y abrir Equipo. Comprobar que el inventario y el saldo son los mismos.
3. Marcar un arma en el inventario y comprobar que aparece inmediatamente en **Objetos equipados**. Desmarcarla y verificar que desaparece.
4. Marcar una armadura diferente: la nueva debe reemplazar a la anterior. Marcar un escudo y comprobar el cambio en CA.
5. Vender o descartar la última unidad de un arma marcada y comprobar que desaparece del módulo de equipados.
6. Marcar un arma mágica desde Objetos mágicos; debe aparecer en Objetos equipados sin afectar a la casilla de su versión ordinaria.
7. Comprar y vender desde el desplegable, comprobar que varían tanto el inventario como el monedero.
8. Guardar con «Actualizar guardado», recargar la página y recuperar el personaje; verificar que se conserva la selección de armas.
9. Comprobar diseño de dos columnas en escritorio y de una columna en móvil.

## Riesgos y mejoras futuras

- El sistema de armas seleccionadas no diferencia manos ni modela el estado de desenfundado: queda explícitamente fuera de esta fase.
- La moneda se muestra como conversión exacta del saldo común en cobre. No se gestionan múltiples bolsas ni monedas físicas de diferentes denominaciones.
- Se mantiene el límite del historial de 200 operaciones heredado del motor. Una fase futura puede ofrecer compactación segura de acciones, previa prueba de compatibilidad.
- Si el usuario cancela el cambio de página sin pulsar «Actualizar guardado», las nuevas acciones no se guardan en PostgreSQL, comportamiento actual del producto.

**Commit:** pendiente de identificar tras la verificación y subida del autor.
