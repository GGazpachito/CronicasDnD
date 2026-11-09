# Paso 23 · Fase 4.11: armaduras y escudos mágicos (+1, +2 y +3)

## Objetivo

Extender el inventario mágico unificado de la fase 4.10 con versiones mejoradas de las armaduras y escudos, sin duplicar la CA ni romper los personajes guardados en el formato v2.

## Reglas verificadas (D&D 2024, SRD 5.2.1)

- **Armadura +1, +2, +3:** una armadura ligera, media o pesada concreta, con bonificación de +1, +2 o +3 a la CA **mientras se lleva puesta**. La mejora se suma a la fórmula de ESA armadura, no a la de otra armadura que pudiera poseerse. Rarezas: rara (+1), muy rara (+2) y legendaria (+3). Sin vinculación.
- **Escudo +1, +2, +3:** bonificación mágica a CA de +1, +2 o +3 **además del +2 normal del escudo** cuando se empuña y se tiene competencia. Rarezas: poco común (+1), rara (+2), muy rara (+3). Sin vinculación.
- Solo una armadura física y un escudo pueden estar equipados a la vez. Equipar una pieza mágica reemplaza la equivalente mundana. Equipar una pieza mundana desactiva la mágica correspondiente.
- El estilo de combate Defensa se aplica una sola vez cuando se lleva armadura, incluida la mágica.
- Los anillos y capas de protección previamente implementados conservan sus bonificadores adicionales. Armaduras y escudos +1/+2/+3 **no** suman bonificaciones a salvaciones ni otorgan resistencias genéricas.

Fuente principal: SRD 5.2.1, sección *Magic Items*, entradas *Armor, +1, +2, or +3* y *Shield, +1, +2, or +3*. Puede consultarse en https://www.fantasygrounds.com/library/5e/dd-srd-5-2-1/magic-items y https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf.

## Diseño de datos

Se conservan `InventoryAction`, `InventoryState.magicItems` y el diario de inventario existente. Se agregan dos plantillas a `MAGIC_WARD_CATALOG`:

- `armor_enhancement`: requiere `armorId` del catálogo `ARMORS` y `enhancement` entero 1, 2 o 3.
- `shield_enhancement`: requiere `enhancement` entero 1, 2 o 3.

La acción `magic_grant` admite ambos parámetros para estas variantes. `magic_wear` equipa el objeto y retira la pieza mundana de su lugar. `equip_armor` y `equip_shield` normales desactivan la pieza mágica si corresponde.

`equippedArmor(inventory)` y `hasEquippedShield(inventory)` derivan el equipo *efectivo* para la hoja de personaje. La hoja no cuenta una segunda armadura o segundo escudo. Los bonificadores mágicos se aplican con el sistema de modificadores existente (`collectMagicWardBonuses`).

Se comprueba que no haya dos armaduras mágicas equipadas ni dos escudos mágicos empuñados; para cambiar de uno mágico a otro hay que quitar el anterior. Las mejoras no requieren ni admiten vinculación.

**Los objetos mágicos son concedidos por el director de juego y no poseen precio de compra/venta automatizado.** Las variantes están contenidas en el mismo inventario que las demás piezas y se muestran en el listado general.

## Ejemplos

| Personaje | CA |
|---|---:|
| Guerrero con cota de malla y estilo Defensa | 17 |
| Placas +1 con Defensa, sin escudo | 20 |
| Placas +3 con Defensa, sin escudo | 22 |
| Cota de malla, Defensa y escudo +1 | 20 |
| Placas +3, Defensa y escudo +2 | 26 |

## Archivos de esta actualización

1. `packages/rules-engine/src/magic-wards.ts`: plantillas, validación y bonificadores.
2. `packages/rules-engine/src/inventory.ts`: acciones, equipamiento exclusivo y selectores efectivos.
3. `packages/rules-engine/src/guided.ts`: cálculo de la hoja con equipo efectivo.
4. `apps/web/src/components/MagicWardsPanel.tsx`: selección de armadura y mejora, equipar/retirar.
5. `apps/web/src/app/page.tsx`: valores efectivos, lista de inventario y aclaraciones en la interfaz.
6. `packages/rules-engine/tests/magic-armor.test.ts`: 24 pruebas de catálogo, CA, validación y persistencia.
7. `docs/implementation/PASO_23.md`: documentación de instalación y reglas.

## Compatibilidad

El guardado conserva la versión `schemaVersion: 2` y las mismas columnas Prisma. No se necesitan migraciones ni regeneración del esquema. Los personajes previos y los objetos mágicos de la fase 4.10 se cargan sin transformaciones adicionales. El modelo de personaje y las operaciones siguen siendo deterministas y se validan al reconstruir el inventario.

## Instalar en Windows

1. Descargar `actualizacion-web-17.zip`, descomprimir en una ubicación temporal.
2. Copiar **solamente** las carpetas `apps`, `packages` y `docs` que vienen dentro del ZIP a la raíz de `dnd-character-builder`. Aceptar combinación y reemplazo de esos archivos.
3. Desde la raíz del monorepo, con Docker Desktop iniciado, ejecutar:

```powershell
docker compose up -d
pnpm test
pnpm build
pnpm dev
```

4. Abrir http://localhost:3000 y entrar en **Objetos mágicos del inventario**.
5. Añadir una armadura mágica +1 y equiparla; comprobar que sustituye a la armadura anterior y que la CA refleja esa fórmula base.
6. Equipar un escudo mágico +2; comprobar que suma **+4** a la CA (bono normal del escudo +2 y magia +2).
7. Quitar objetos, cambiar a equipo normal y volver a probar la CA. Confirmar que un personaje guardado anteriormente sigue abriéndose.
8. Guardar un personaje con objetos mágicos, recargarlo y comprobar que su estado se conserva.

## Comprobaciones locales

- El motor se ha validado con TypeScript en modo estricto.
- 404 comprobaciones de aserciones correctas con un ejecutor local compatible, incluidas las pruebas anteriores y 24 nuevas.
- Las pantallas TSX modificadas pasan la comprobación sintáctica de TypeScript.
- **Pendiente del ordenador del usuario:** ejecutar `pnpm test` (Vitest oficial), `pnpm build` (Next.js completo) y la prueba manual con PostgreSQL. Estas tareas no se han ejecutado en el entorno de empaquetado.

## GitHub

Una vez verificadas las pruebas y la compilación:

```powershell
git status
git add apps/web/src/app/page.tsx apps/web/src/components/MagicWardsPanel.tsx packages/rules-engine/src packages/rules-engine/tests docs/implementation/PASO_23.md
git commit -m "feat: incorporar armaduras y escudos magicos"
git push
```

## Pendiente

Armaduras y escudos especiales con otras propiedades, fabricación, comercio, vínculos más complejos y verificación automática de acciones de combate completas. La interfaz considera el marcado de «equipado» una decisión manual del usuario: la acción de ponerse/quitarse armadura o escudo durante los turnos no está simulada aún.
