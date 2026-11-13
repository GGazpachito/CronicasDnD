# Actualización 41 · Pestaña Equipo e inventario

**Proyecto:** editor y hoja digital de personaje para D&D 2024 (5.5)  
**Fecha de preparación:** 13/11/2026  
**Estado:** implementación preparada; pendiente de pruebas completas y aceptación en el equipo del desarrollador.  
**Alcance:** interfaz de Equipo, proyección de lectura y comprobaciones asociadas. Sin cambios de base de datos ni formato de guardado.

## 1. Contexto

La actualización 36 creó las seis pestañas; la 37 rediseñó Principal; las 38, 39 y 39.1 añadieron tiradas manuales y controles de partida; la 40 reorganizó Rasgos. Hasta ahora la pestaña **Equipo** seguía siendo un marcador provisional. La compra, venta, hallazgos y equipamiento funcionaban en el asistente de creación, y los objetos mágicos tenían un módulo independiente en las herramientas heredadas de Principal.

Esta fase **no implementa un segundo inventario**: convierte en interfaz principal las funciones existentes y mantiene su historial persistente `GuidedFighterInput.inventoryActions`.

## 2. Objetivos y criterios de aceptación

1. Mostrar saldo, total de unidades comunes, objetos mágicos y capacidad de vinculación.
2. Consultar objetos comunes con nombre, cantidad, categoría y procedencia de las unidades.
3. Buscar y filtrar entre armas, armaduras/escudos, munición y equipo de aventura sin alterar los objetos.
4. Equipar y retirar armaduras y escudos que se posean; recalcular la CA a través del motor existente.
5. Comprar, vender, registrar botín y descartar unidades con los precios y reglas del catálogo validado. No comprar o vender artículos sin precio normalizado.
6. Gestionar objetos mágicos en la pestaña Equipo con dos decisiones independientes: «puesto/preparado» y «vinculado». Respetar el límite de tres vinculaciones y las reglas de sustitución de armadura/escudo ya implementadas.
7. Poder deshacer una operación y reiniciar todo el inventario **solo tras confirmación explícita**.
8. Preservar el asistente antiguo y la gestión de ataques sin duplicar los sistemas de cálculo.
9. Mantener personajes anteriores y el guardado manual en PostgreSQL.
10. Ser utilizable con teclado y pantallas reducidas.

## 3. Diseño e implementación

### 3.1. Fuente de verdad

- Estado primario: `inventoryEdits.actions` en `apps/web/src/app/page.tsx`.
- Estado derivado: `replayInventory(starting, initialArmor, activeActions)`, validado por el motor; `calculateGuidedFighter(input)` produce `result.inventory` y la hoja actualizada.
- La nueva vista recibe `output.result?.inventory`, `activeActions.length` y el callback `transact`. **No crea ningún array ni contador de objetos independiente.**
- La proyección inmutable `inventoryOverview(state)` calcula exclusivamente datos de presentación (categorías, totales, etiquetas de procedencia, estado de equipamiento y vinculación). Ninguna acción modifica el argumento recibido.
- Los filtros, búsqueda, selector de compra y mensajes de confirmación son estado de interfaz, no datos persistentes.

### 3.2. Categorías y equipamiento

- `weapons`: identificadores conocidos en `WEAPONS`.
- `armor`: armaduras del catálogo `ARMORS` y el escudo.
- `ammunition`: flechas, virotes, balas, agujas y balas de honda.
- `gear`: resto del inventario.

Se conservan las cantidades y su trazabilidad (`class`, `background`, `purchase`, `loot`). El selector de armadura envía `equip_armor`, y el de escudo `equip_shield` a `applyInventoryAction` a través de `transact`. Las armas mundanas no reciben una casilla de «equipada» inventada: se eligen al realizar tiradas de ataque en su módulo existente.

### 3.3. Compras y movimientos

- `buy`: descuenta el importe total del saldo en cobre, tras validar el coste y la cantidad.
- `sell`: retira unidades y devuelve el importe de venta calculado por el motor.
- `add`: registra botín sin inventar un valor monetario.
- `remove`: descarta o consume unidades existentes, incluida la retirada del equipamiento cuando procede.
- Las validaciones de fondo (cantidades 1–1000, fondos suficientes, posesión y límites de historial) pertenecen a `inventory.ts` y no se reproducen de forma independiente.
- El formulario deshabilita operaciones evidentemente imposibles para ofrecer retroalimentación previa, pero el motor sigue siendo quien decide la validez definitiva.
- «Deshacer» retira la última acción registrada y vuelve a reproducir el diario. «Reiniciar» requiere confirmación y descarta **todas** las acciones posteriores al equipo inicial, incluidos objetos mágicos. No restaura monedas de partidas anteriores ni ejecuta operaciones sobre PostgreSQL por su cuenta.

### 3.4. Objetos mágicos

`MagicWardsPanel` se **traslada** de las herramientas heredadas de Principal a Equipo, manteniendo un único montaje del componente y sus mecanismos actuales:

- Concesión manual de objetos por parte del DM, sin precios de compra.
- Control «llevado/equipado/preparado» independiente de «vinculado» cuando sea necesario.
- Límite de tres objetos vinculados, validación de variantes y sustitución de armadura o escudo mundano.
- Aplicación declarativa de bonificadores de CA, salvaciones, resistencias y armas mágicas por el motor existente.

La proyección de Equipo considera un objeto **activo** cuando está puesto y no requiere vinculación, o cuando está puesto y ya está vinculado. Un objeto guardado o no vinculado no se presenta como activo.

**No se crea automatización de descanso, activación de conjuros ni uso de objetos fuera de los casos ya implementados.**

### 3.5. Persistencia y compatibilidad

- Sin cambios en `schema.prisma`, migraciones o rutas `/api/characters`.
- Sin alteraciones de `CharacterSnapshot`, `schemaVersion` ni de la estructura `inventoryActions`.
- Tras cualquier cambio, la persona debe utilizar «Actualizar guardado» en «Mis personajes». No hay autosave silencioso.
- No se inicializa ni reinicia PostgreSQL al instalar la fase.
- Se conserva la edición de Equipo en el asistente original como vía de compatibilidad; ambas interfaces operan sobre el mismo historial.

## 4. Archivos modificados y creados

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `apps/web/src/app/page.tsx` | Modificado | Sustituye marcador Equipo; integra el panel nuevo y reubica el módulo mágico, conserva `transact`. |
| `apps/web/src/app/globals.css` | Modificado | Diseño adaptable de inventario, filtros, saldo y acciones. |
| `apps/web/src/components/EquipmentPanel.tsx` | Nuevo | UI de lectura, filtrado y gestión de equipo, sin cálculos de reglas duplicados. |
| `packages/rules-engine/src/inventory-view.ts` | Nuevo | Proyección pura de consulta sobre `InventoryState`. |
| `packages/rules-engine/tests/inventory-view.test.ts` | Nuevo | Pruebas de categorías, procedencia, equipamiento, objetos mágicos e importes. |
| `docs/implementation/PASO_41_EQUIPO_INVENTARIO.md` | Nuevo | Registro técnico de esta actualización. |

## 5. Decisiones arquitectónicas y alternativas

1. **Un solo diario frente a dos inventarios independientes.** Se reutiliza `transact` y `inventoryActions` para impedir divergencias entre Principal, Equipo y los datos guardados.
2. **Migrar `MagicWardsPanel` frente a copiar su lógica.** Una única implementación mantiene validación de vinculación, variantes y efectos. La refactorización estética interna del módulo mágico se reserva para una fase específica si es necesaria.
3. **Proyección pura frente a nuevos campos persistentes.** `inventory-view.ts` calcula categorías y contadores, sin modificar instantáneas guardadas.
4. **Reiniciar con confirmación frente a reiniciar silenciosamente.** La acción elimina todo el historial visible de operaciones; debe ser voluntaria e informada.
5. **Precios cerrados frente a comercio arbitrario.** La versión actual no soporta un catálogo de objetos personalizados ni precios editables. Los objetos sin precio se registran como botín.

## 6. Verificaciones realizadas durante la preparación

- Comprobación estática **TypeScript 5.8.3** de `EquipmentPanel.tsx` y sus dependencias, con `strict`: superada.
- Comprobación estática **TypeScript 5.8.3** de `page.tsx` y sus dependencias, con `strict`: superada en el entorno de preparación.
- Comprobación estática del motor `inventory-view.ts`, con `strict`: superada.
- Seis escenarios ejecutados directamente contra el motor: clasificación, procedencia, escudo, activación/vinculación, artículos sin precio e inmutabilidad: superados.
- Renderizado aislado con React 19.3.1 y React DOM: correcto tanto sin objetos mágicos como con uno concedido.

**No confundir estas comprobaciones con la suite completa.** Vitest, ESLint y `next build` integrados deben ejecutarse y verificarse en el equipo del desarrollador (TypeScript 5.9.3 / ESLint 9.39.1), además de las pruebas visuales en el navegador. El estado definitivo del hito dependerá de esos resultados.

## 7. Pruebas manuales que deben realizarse

1. Cargar **uno de los dos personajes ya guardados** y comprobar que aparecen sus objetos, saldo y estados mágicos.
2. Equipar/retirar armaduras y escudos: verificar cambio de CA en Principal y Equipo, sin duplicar bonificadores.
3. Añadir 2 unidades como botín, vender o descartar 1, y comprobar cantidad y procedencia.
4. Comprar un objeto con saldo suficiente, observar el descuento y deshacer la transacción.
5. Seleccionar un objeto sin precio y confirmar que las acciones Comprar/Vender quedan deshabilitadas.
6. Conceder un objeto mágico, marcar «puesto» y luego «vinculado» (si procede), verificar los estados y que el límite de tres continúa funcionando.
7. Cambiar entre Principal, Rasgos y Equipo; confirmar que los objetos no desaparecen ni cambian por el mero hecho de navegar.
8. Guardar con «Actualizar guardado», recargar el navegador y abrir de nuevo el personaje: comprobar persistencia exacta de inventario y vínculos.
9. En un personaje nuevo, confirmar con «Reiniciar inventario» que se descartan operaciones y que no se toca PostgreSQL hasta guardar.
10. Comprobar accesibilidad básica (Tab/Enter) y anchuras de pantalla pequeñas.

## 8. Comandos de verificación y publicación

Desde la raíz del repositorio:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Solo cuando las comprobaciones y la navegación básica sean correctas, preparar únicamente los seis archivos de esta fase:

```powershell
git add -- "apps/web/src/app/page.tsx" "apps/web/src/app/globals.css" "apps/web/src/components/EquipmentPanel.tsx" "packages/rules-engine/src/inventory-view.ts" "packages/rules-engine/tests/inventory-view.test.ts" "docs/implementation/PASO_41_EQUIPO_INVENTARIO.md"
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: actualizacion 41 - pestana de equipo e inventario"
git push -u origin HEAD
git status
```

No utilizar `git add -A`; comprobar siempre el listado de archivos preparados y no subir archivos de entorno ni ZIP temporales.

## 9. Limitaciones y riesgos abiertos

- El catálogo de inventario es todavía reducido y no permite objetos arbitrarios o homebrew.
- Los paquetes de aventurero se conservan como un único objeto.
- Las monedas se actualizan mediante transacciones; no hay editor libre de denominaciones monetarias.
- El etiquetado «objeto activo» es orientativo; no ejecuta acciones ni turnos automáticamente.
- La vinculación se marca manualmente, tras realizar las acciones reglamentarias en mesa.
- El valor de `inventoryActions` está limitado por el motor; muchos movimientos pueden alcanzar el máximo de operaciones y requerir una fase futura de compactación/migración validada.
- En cambios que invalidan el estado de partida, los controles del nuevo panel se deshabilitan hasta que se revise la sincronización de la hoja.
- Antes de usar este ZIP, la base local debe estar efectivamente actualizada hasta la corrección **40.1**.

## 10. Registro del hito

| Campo | Valor |
|---|---|
| ID | ACT-41 |
| Tema | Equipo e inventario |
| Dependencias | Actualización 40.1 instalada |
| Motor de combate | No modificado |
| Esquema PostgreSQL | No modificado |
| Versión de guardado | No modificada |
| Suite completa | Pendiente de ejecutar localmente |
| Commit | Pendiente de realizar tras validación |
| Estado final | Pendiente de confirmación del desarrollador |
