# Actualización 41.2 · Monedero interactivo y tiradas rápidas de armas equipadas

**Fecha:** 13 de noviembre de 2026  
**Estado:** implementación preparada; validación final en el entorno del desarrollador pendiente.  
**Antecedente:** actualizaciones 41 y 41.1. Esta mejora no sustituye el módulo de combate futuro.

## 1. Requisito y objetivos

La persona responsable del proyecto solicita dos ajustes sobre la hoja ya implementada:

1. El contador de monedas debe permitir introducir **variaciones con signo**, por ejemplo `+5` o `-3`, y utilizar botones de incremento/decremento de una unidad, siguiendo la interacción de los puntos de golpe. Se añade la denominación **platino**, situada por delante de oro, plata y cobre.
2. La sección **«Ataques y armas» de Principal** debe mostrar **solamente** las armas equipadas, tanto convencionales como mágicas. Cada una debe ofrecer su bonificador al ataque y su fórmula de daño, con botones independientes **«Tirar ataque»** y **«Tirar daño»**. No se registran impactos ni se simula un combate.

Se conserva el boceto de Equipo fijado en la actualización 41.1: inventario izquierda, objetos equipados y mágicos derecha y monedero a todo lo ancho en la parte inferior.

## 2. Diseño de monedas

### 2.1. Fuente única de verdad

Se mantiene `InventoryState.coinsCopper: number` como saldo único persistido. No se crean cuatro contadores de saldo ni cuatro estados React. La descomposición es una **proyección del valor**; no contabiliza las piezas físicas por separado, sino su equivalencia monetaria.

Conversión utilizada: 1 **platino** = 10 **oro** = 100 **plata** = 1.000 **cobre**; 1 oro = 10 plata = 100 cobre. Las abreviaturas de interfaz son `ppt`, `po`, `pp` y `pc` para distinguir platino de plata en español. La versión inglesa utiliza `PP`, `GP`, `SP`, `CP`. Se excluye el electro de esta entrega porque el usuario solicitó explícitamente estas cuatro denominaciones.

Fuente externa para el criterio monetario: [D&D Beyond, Basic Rules 2024, Equipment, Coin Values](https://www.dndbeyond.com/sources/dnd/br-2024/equipment). Consultado en la preparación de esta actualización.

### 2.2. Acción persistente

Se añade al tipo existente `InventoryAction`:

```ts
{ type: 'adjust_coins', deltaCopper: number }
```

El calculador puro `coinAdjustment(denomination, change)` transforma un entero con signo de una moneda concreta a cobre; `applyInventoryAction()` aplica una operación atómica y comprueba que el saldo nunca sea negativo ni supere el máximo del inventario. `coinBreakdown()` muestra el saldo normalizado en las cuatro denominaciones.

Los botones ▲/▼ alteran una moneda por pulsación. El campo permite `+N` y `-N`, confirmados con Intro o al perder el foco. Las operaciones aceptadas pasan por **el mismo callback `onInventoryAction()`**, quedan en el historial y pueden deshacerse mediante el control existente. Los cambios siguen requiriendo «Actualizar guardado» para llegar a PostgreSQL.

**Alternativa descartada:** cuatro estados independientes por denominación. Habría obligado a decidir si las compras cambian piezas físicas automáticamente y generado riesgo de incoherencia con el inventario previo. La proyección en cobre preserva los guardados y el cálculo de las compras.

## 3. Diseño de armas y tiradas

### 3.1. Visibilidad según equipamiento

El nuevo selector puro `equippedWeaponChoices(inventory)` filtra el catálogo preexistente `ownedWeaponChoices`:

- Armas mundanas: aparecen exclusivamente si están marcadas mediante la operación `equip_weapon` de la actualización 41.1 y aún pertenecen al inventario.
- Armas mágicas: aparecen como instancia individual únicamente si `magic_wear` está activo para ella. Su modificador mágico no se transfiere a otras armas idénticas.
- El panel de ataques avanzado conserva su catálogo y sus opciones completas. El filtrado se aplica **solo a la vista simplificada de Principal**.

Al marcar o desmarcar un arma en Equipo, la lista de Principal se recalcula a partir de `inventory` sin persistir otra colección.

### 3.2. Bonificadores

Cada tarjeta invoca `calculateOwnedWeaponAttack()` para obtener las reglas existentes: característica, competencia de Guerrero, estilo de combate, modificador de arma mágica, dados de arma, tipo de daño, crítico mejorado del Campeón, penalización por arma pesada y condiciones presentes que no necesitan información táctica adicional.

En «Opciones de uso del arma», cuando corresponde, el jugador puede elegir Fuerza o Destreza para Sutileza, dos manos para Versátil, modalidad arrojadiza y si sostiene otra arma para el estilo Duelo. Si una circunstancia depende de la distancia, de la visibilidad del adversario, de la otra mano, del objetivo o de la situación de combate, **el jugador debe confirmarla**. Se mantiene el acceso al módulo avanzado.

### 3.3. Lanzamiento

- «Tirar ataque»: usa `rollD20()` con el bonificador del perfil y una circunstancia elegida por el jugador. Muestra uno o dos dados, el seleccionado, el modificador y el total. El modo básico del perfil incorpora condiciones reconocidas; ventaja y desventaja opuestas se cancelan.
- «Tirar daño»: genera los dados específicos del arma con `rollDie()` y resuelve `resolveWeaponDamage()`, función del motor compartida con `resolveWeaponAttack()`. Respeta crítico (doble de dados, modificador una vez), el estilo de combate a dos manos (resultados 1 o 2 de los dados del arma cuentan como 3), daños fijos y bonificaciones mágicas.
- El jugador puede señalar manualmente daño crítico si el ataque se resolvió fuera de la página. Si acaba de producirse un crítico con la tirada de ataque de la tarjeta, la duplicación se activa automáticamente.
- Las tiradas **no** consumen munición, modifican PG ni registran un ataque en el diario de combate. El DM sigue decidiendo si un ataque impacta. Un 1 natural en un ataque sigue siendo fallo.

Los resultados de tiradas son estado efímero de interfaz; si cambian las estadísticas o el arma utilizada se invalidan visualmente.

**Alternativa descartada:** utilizar una segunda fórmula local para el daño. Para evitar discrepancias, se extrajo la resolución de dados a `resolveWeaponDamage()` y el motor original de ataques la utiliza igualmente.

## 4. Archivos incluidos

1. `packages/rules-engine/src/inventory.ts`: denominaciones, descomposición, cambio firmado y acción persistente.
2. `packages/rules-engine/src/attacks.ts`: selección de equipadas y resolución reutilizable de daño.
3. `apps/web/src/components/EquipmentPanel.tsx`: monedero interactivo con cuatro denominaciones.
4. `apps/web/src/components/PrincipalOverview.tsx`: reemplazo del listado de armas poseídas por las equipadas y sus tiradas.
5. `apps/web/src/components/PrincipalEquippedAttacks.tsx`: tarjetas con estadísticas, opciones de uso y tiradas manuales.
6. `apps/web/src/app/globals.css`: estilos y adaptación responsive.
7. `packages/rules-engine/tests/currency-equipped-rolls.test.ts`: pruebas de monedas, persistencia, equipamiento y daño.
8. Este documento.

## 5. Compatibilidad y riesgos

- **No se modifica** el esquema de Prisma, el formato de guardado (`schemaVersion: 2`) ni las rutas API.
- Las compras y ventas preexistentes siguen usando el saldo en cobre; los cambios manuales se añaden al mismo historial.
- El diario limita el número de operaciones a 200. Cambiar cada moneda repetidamente con flechas ocupa entradas; documentar una futura compactación del diario si el uso real alcanza ese límite, sin eliminar el historial de forma silenciosa.
- El monedero muestra **equivalencias**, no cuenta cuántas monedas físicas de cada tipo transporta el personaje. Si se necesitase gestión física de monedas, haría falta una decisión de diseño y posible migración futura.
- Los ataques rápidos **no** resuelven estados posicionales, efectos sobre enemigos, gasto de recursos, maestrías activas en el objetivo, ataques adicionales ni el recurso de turno. Están deliberadamente fuera del alcance de esta entrega.
- Se sigue exigiendo que una instancia mágica de arma esté marcada como «llevar puesta» para aparecer en Principal; el inventario original continúa disponible.

## 6. Pruebas y estado de verificación

**Verificado en el entorno de preparación:**

- Chequeo estricto de TypeScript del motor y de los tres componentes web implicados.
- Pruebas directas de `coinBreakdown`, `coinAdjustment`, saldos negativos, compra integrada y cálculo de perfiles de ataque y daño.
- Serialización/deserialización de un guardado v2 con monedas ajustadas y arma equipada.
- Renderizado de servidor aislado de Equipo con cuatro denominaciones y Principal con únicamente el espadón equipado, botones de ataque y daño presentes.

**Pendiente en el entorno del usuario:** `pnpm lint`, `pnpm test`, `pnpm build`, renderizado interactivo en navegador, cambios de moneda mediante botones/campos, tiradas con ventaja/desventaja, críticos de Campeón, arma versátil, armas mágicas, deshacer, guardar y recuperar los dos personajes previos. No dar por cerrada la fase antes de estas comprobaciones.

## 7. Instalación y registro en Git

Extraer el ZIP desde la raíz del repositorio, fusionando carpetas sin eliminar las existentes. Después ejecutar:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Preparar **solo los ocho archivos de esta entrega** con `git add -- <rutas explícitas>`, comprobar `git diff --cached --name-only`, confirmar la revisión y crear un commit `feat: actualizacion 41.2 - monedero y ataques con armas equipadas`. Subir con `git push -u origin HEAD`. Anotar en este documento la fecha, el hash del commit, la rama y los resultados reales de las pruebas.

## 8. Próxima fase

La fase 42 mantiene el plan: pestaña **Personaje**, con historia, apariencia, notas, retrato y persistencia, una vez validada esta entrega.
