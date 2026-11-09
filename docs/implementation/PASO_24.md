# Paso 24 · Fase 4.12: armas mágicas +1, +2 y +3

## Objetivo

Añadir armas mágicas del SRD 5.2.1 al **inventario unificado**, aplicar la mejora **solo al arma concreta utilizada** y registrar su identidad en el historial de ataques, manteniendo los personajes de versiones anteriores.

## Fundamento de reglas

- **Weapon, +1, +2, or +3 (SRD 5.2.1 / D&D 2024)**: cualquier arma simple o marcial. Concede un bonificador igual a la mejora a las tiradas de ataque y de daño realizadas con dicha arma. No requiere vinculación. Rareza: poco común (+1), rara (+2), muy rara (+3).
- El bonificador a daño es fijo: **no se multiplica al conseguir un golpe crítico**. Los críticos duplican los dados de daño pertinentes, no el modificador fijo.
- **Graze (Rozar)** de la maestría mantiene su regla: daño por fallo igual al modificador de característica empleado para atacar; no incluye el bonus mágico a daño.
- No se ha incluido munición mágica +1/+2/+3 ni el conjuro *Arma mágica*. Son entidades con reglas de duración/consumo que se implementarán por separado.

Fuente de referencia abierta: [D&D Beyond, Basic Rules 2024, Magic Items A–Z](https://www.dndbeyond.com/sources/dnd/br-2024/magic-items-a-z), entrada «Weapon, +1, +2, or +3». Estructura de datos propia, sin copiar texto descriptivo completo.

## Diseño implementado

- `packages/rules-engine/src/magic-wards.ts`: variante catalogada `weapon_enhancement`, parametrizada por `weaponId` y `enhancement` 1/2/3. Validación estricta de tipos; no admite armadura, daño de anillo ni vinculación. Identidades únicas `ward-N`.
- `packages/rules-engine/src/inventory.ts`: acción `magic_grant` extendida para armas mágicas. La UI reserva un `instanceId` explícito para nuevas concesiones, sin reutilizar IDs de objetos eliminados; los diarios anteriores sin ese campo siguen funcionando. El objeto está en `magicItems` del inventario; la propiedad `worn` significa **arma preparada** para el panel de ataques. La concesión es independiente del inventario mundano y no consume oro.
- `packages/rules-engine/src/attacks.ts`: `ownedWeaponChoices` enumera armas mundanas y **cada instancia mágica preparada** por separado. `calculateOwnedWeaponAttack` aplica +N a `attackBonus` y `damageModifier` una vez, conservando todos los demás cálculos normales (ventaja, propiedades, maestrías, estilo, críticos, munición).
- `packages/rules-engine/src/combat.ts`: `recordWeaponAttack` valida que la instancia mágica aún existe, está preparada y coincide en tipo y mejora. Registra `magicWeaponInstanceId` y `magicEnhancement` como **campos opcionales**. `validateCombatState` acepta registros antiguos sin ellos.
- `apps/web/src/components/MagicWardsPanel.tsx`: concesión, selección de arma y mejora, preparación y retirada desde el inventario unificado.
- `apps/web/src/components/AttacksPanel.tsx`: selección independiente de arma común o mágica; información de mejora aplicada. Usa `hasEquippedShield` para impedir armas a dos manos con escudo normal **o mágico**.
- `apps/web/src/components/CombatPanel.tsx`: historial con mejora +N e ID de instancia.
- `apps/web/src/app/page.tsx`: inventario muestra qué arma concreta y qué mejora tiene cada entrada mágica.

## Compatibilidad y persistencia

- El formato **schemaVersion 2** sigue intacto. No se modifica la base de datos ni se requieren migraciones de Prisma.
- Los guardados antiguos sin `weapon_enhancement`, sin `weaponId` en los objetos y sin campos mágicos en el historial se leen y validan como antes.
- Los objetos nuevos y el historial se guardan en el JSON existente de la hoja y del estado de partida.
- No se presume que el usuario posea la versión mundana del arma mágica.

## Instalación

1. Copiar las carpetas `apps`, `packages`, `docs` del ZIP en la raíz del proyecto, fusionando y reemplazando **solo** sus archivos.
2. Iniciar Docker Desktop y ejecutar `docker compose up -d` si hace falta.
3. Ejecutar `pnpm test`, `pnpm build`, `pnpm dev`.
4. En «Objetos mágicos del inventario» conceder, por ejemplo, un **espada larga +2**, marcar «Arma preparada» y usarla desde «Ataques con armas».
5. Registrar un ataque y comprobar el historial en «Registro y efectos temporales»; guardar y volver a cargar el personaje.

## Casos manuales recomendados

1. Con Fuerza +3 y competencia +2, el espadón mundano impacta con **+5** y daña **2d6+3**; el espadón +2 impacta con **+7** y daña **2d6+5**.
2. Crítico de espadón +2: **4d6+5**, sin duplicar el +2.
3. Fallo con Rozar: causa **3** por maestría (con Fuerza +3), no 5.
4. Dos copias mágicas del mismo tipo con distintas mejoras aparecen separadas. Las armas mundanas mantienen sus valores.
5. Un arma que se guarda o retira desaparece de la selección de ataques.
6. Una ballesta +1 sigue consumiendo **virotes normales** al confirmar; la munición mágica todavía no está implementada.
7. No se permite atacar a dos manos con escudo mágico equipado.
8. Guardar, cargar y verificar que persisten la identidad del arma mágica y el historial anterior.

## Calidad y límites

- **430 comprobaciones locales sin fallos**, incluidas **26 nuevas** de armas mágicas. Ejecución mediante adaptador local de pruebas; no equivale al `vitest run` real.
- Motor TypeScript comprobado en modo estricto. Interfaz TSX revisada sintácticamente.
- Los objetos de ataque no producen efectos adicionales por sí mismos. No existe un inventario de enemigos ni control completo de turnos.
- El motor no registra aún ataques especiales por magia, munición encantada, ataques sin arma ni maestrías totalmente automatizadas; el DM resuelve sus efectos contextuales.
