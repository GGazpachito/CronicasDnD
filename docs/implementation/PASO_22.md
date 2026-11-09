# PASO 22: Inventario mágico unificado (fase 4.10)

## Qué hace

En la fase 4.9, los objetos mágicos defensivos estaban en `adventure.magicWards`, separado del inventario. Esta actualización introduce objetos mágicos **individuales** en `InventoryState.magicItems` y los integra en el mismo historial `GuidedFighterInput.inventoryActions` que las compras, hallazgos y equipamiento. El panel de edición y la vista previa de inventario usan este mismo origen de datos.

Los objetos mágicos se conceden por el director de juego sin precio de tienda. No se ejecutan scripts ni efectos arbitrarios introducidos por el usuario. Cada objeto puede estar guardado o puesto, y los que requieren vinculación deben marcarse vinculados de forma explícita. Se mantienen las restricciones del catálogo de máximo tres objetos vinculados, doce objetos registrados y no vincular copias del mismo tipo.

### Objetos disponibles

| Objeto | Requiere vinculación | Efecto automático al llevarlo puesto |
| --- | --- | --- |
| Anillo de resistencia | No en 2024 | Resistencia a un tipo permitido de daño |
| Broche de protección | Sí | Resistencia a daño de fuerza |
| Amuleto antivenenos | Sí | Inmunidad a daño de veneno |
| Capa de protección | Sí | +1 CA y +1 a las seis tiradas de salvación |
| Anillo de protección | Sí | +1 CA y +1 a las seis tiradas de salvación |

La capa y el anillo de protección se aplican mediante el sistema declarativo de `numeric_modifier`, tanto a `armor_class` como a `saving_throws.{ability}`, por lo que sus valores aparecen también en la resolución de ataques recibidos y la salvación de Constitución para mantener concentración. Dos fuentes diferentes de +1 son acumulables. Una resistencia repetida no se divide dos veces.

## Compatibilidad

- No cambies `schemaVersion` (sigue en **2**) ni ejecutes migraciones SQL. Se utiliza la columna JSON de elecciones existente.
- Las nuevas partidas guardan sus objetos mágicos como acciones `magic_grant`, `magic_wear`, `magic_attune`, `magic_remove` dentro de `input.inventoryActions`.
- El motor sigue **leyendo** `adventure.magicWards` antiguo para no romper datos ni pruebas de las fases anteriores.
- Al abrir desde la interfaz un personaje guardado antes de esta fase, `loadSavedSnapshot` transforma su registro antiguo al nuevo historial y limpia el registro de partida heredado para no duplicar la bonificación. Esta migración se completa en memoria; debes pulsar **Actualizar guardado** para persistirla en PostgreSQL.
- No se toca el historial de ataques, la munición, los PG, los recursos ni las condiciones.
- El cambio de paquete inicial reinicia el historial de inventario como antes; por tanto, también borraría los objetos mágicos si no se guarda el personaje con el paquete elegido.

## Archivos modificados

- `packages/rules-engine/src/inventory.ts`: `magicItems`, acciones unificadas, conversión de legado
- `packages/rules-engine/src/magic-wards.ts`: capa y anillo de protección, bonificadores de CA y salvación
- `packages/rules-engine/src/guided.ts`: declaración de bonificadores en el motor de hoja
- `packages/rules-engine/src/damage-defenses.ts`: toma los efectos mágicos del inventario, sin eliminar el soporte legado
- `packages/rules-engine/tests/magic-inventory.test.ts`: nuevas pruebas de integración, migración y seguridad
- `apps/web/src/components/MagicWardsPanel.tsx`: editor del inventario único
- `apps/web/src/app/page.tsx`: conecta el historial, migra objetos antiguos y muestra objetos mágicos en la vista de inventario
- `docs/implementation/PASO_22.md`: este documento

## Cómo instalar

1. Realiza un commit de seguridad o una copia del proyecto antes de actualizar.
2. Descomprime **`actualizacion-web-16.zip`** y copia `apps`, `packages`, `docs` encima de los directorios homónimos en el proyecto.
3. Inicia Docker Desktop y PostgreSQL cuando vayas a probar el guardado: `docker compose up -d`.
4. Comprueba el motor con `pnpm test`, la aplicación con `pnpm build`, y ejecuta `pnpm dev`.
5. Abre el personaje, despliega **Objetos mágicos del inventario**, concede una capa, marca **Puesto** y **Vinculado**. La CA y las seis salvaciones deben aumentar en 1.
6. Desvincula la capa. La CA y salvaciones deben recuperar sus valores anteriores sin perder el objeto.
7. Añade el Anillo de resistencia al fuego, márcalo puesto y confirma que 9 puntos de daño de fuego se reducen a 4 en **Ataques recibidos**.
8. Prueba abrir un guardado de la fase 4.9 que tuviera un objeto mágico: debe aparecer en el inventario unificado y mantener su estado anterior.
9. Pulsa **Actualizar guardado**, recarga la página y vuelve a recuperar al personaje para confirmar persistencia en PostgreSQL.

## Comprobación de código

- TypeScript estricto del motor: aprobado.
- Ejecutador local de pruebas de regresión: **380 comprobaciones, cero fallos**.
- Análisis sintáctico de `page.tsx` y `MagicWardsPanel.tsx`: aprobado.
- No hay `node_modules` del proyecto ni Node.js 24 en el contenedor de preparación, por lo que **Vitest oficial, Next.js build y PostgreSQL** se deben validar en el equipo Windows con los comandos anteriores.

## Subir a GitHub

```powershell
git status
git add packages/rules-engine/src packages/rules-engine/tests apps/web/src/app/page.tsx apps/web/src/components/MagicWardsPanel.tsx docs/implementation/PASO_22.md
git commit -m "feat: unificar inventario y defensas magicas"
git push
```

## Limitaciones

- No se compran/venden objetos mágicos ni se implementan precios de comercio mágico.
- El broche no automatiza inmunidad al conjuro *Proyectil mágico*, ni el amuleto la inmunidad a la condición Envenenado.
- No están implementadas todavía **Armadura +1**, **Escudo +1** ni sus variantes: deben poder sustituir o mejorar el equipo base y no se deben fingir como una capa.
- La vinculación se registra después de que ocurra en la partida; no la concede la aplicación automáticamente con un descanso.
- El control del inventario está limitado actualmente al Guerrero niveles 1 a 3.

## Procedencia

Los efectos mecánicos se han contrastado con el **SRD 5.2.1**, publicado por Wizards of the Coast LLC bajo licencia CC BY 4.0 (https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), y con las entradas públicas de capa y anillo de protección de D&D 2024. No se han reproducido descripciones extensas de obras protegidas ni ilustraciones.
