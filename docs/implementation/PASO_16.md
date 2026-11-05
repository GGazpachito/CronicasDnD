# Paso 16 · Registro de ataques, consumo de munición y efectos temporales (fase 4.4)

## Objetivo

Convertir la consulta de ataques del Guerrero en un **registro confirmado** de acciones realizadas durante la partida, con consumo de munición y recordatorios temporales. Mantener la base de datos, las operaciones de inventario y el estado de partida de las actualizaciones 13–15.

Referencias: *Player's Handbook* 2024, capítulos 1 y 6 (ataques, propiedad Munición, equipo y combate); SRD 5.2.1 como fuente complementaria. El módulo no reproduce textos editoriales del manual.

## Qué se implementa

1. **Confirmar ataque** se añade al panel «Ataques con armas» después de calcular la tirada. «Calcular tirada» sigue siendo una consulta pura.
2. Al confirmar, el motor `recordWeaponAttack()` incorpora un registro con ronda manual, arma, resultado del d20, bonificador total, impacto (o desconocido), crítico y daño introducido. **No reduce PG de enemigos** ni simula su ficha.
3. Las armas que usan munición gastan **una unidad por disparo, tanto si impacta como si falla**: flecha, virote, bala de arma de fuego, aguja o bala de honda. No se puede confirmar sin munición. Se utiliza la operación de inventario `remove`, cuya procedencia se sigue conservando.
4. El inventario admite los **38 identificadores de armas** del catálogo y las municiones anteriores, para que puedan añadirse como botín. Las armas sin precio previamente validado siguen sin poder comprarse desde la interfaz. Los nuevos precios normalizados de 1 virote, 1 bala de arma de fuego y 1 aguja son 5, 30 y 2 piezas de cobre; las balas de honda se añaden como botín porque su precio por unidad es inferior a una pieza de cobre y el sistema actual solo admite monedas enteras.
5. **Registro de combate:** hasta 100 ataques recientes. Cada ataque recibe ID correlativo y contador de ronda. El contador de ronda solo cambia cuando el jugador pulsa «Avanzar ronda».
6. **Efectos temporales manuales:** nombre y notas, duración de 1 a 100 rondas o hasta retirarlos. Al avanzar ronda, disminuye el contador y desaparecen los que se agotan. **Estos efectos son recordatorios; no aplican condiciones, bonos, concentración ni mecánicas a terceros.** Se permiten hasta 30 activos.
7. Al terminar un descanso largo, se conservan los ataques ya registrados, se eliminan las notas con duración por rondas y se mantienen las notas marcadas como «hasta retirarlo». Los descansos cortos no incrementan el contador de rondas; corresponde al director retirar los efectos que hayan terminado.
8. Se añade `combat` dentro del `AdventureState`. **No hay migración SQL**: se sigue utilizando la columna JSON de Prisma y `schemaVersion: 2`. Los personajes guardados antes de esta actualización (v1/v2) se cargan creando un historial vacío; no se pierden PG, recursos, monedas ni elecciones.

### Límites conscientes del MVP

- **Registro y gasto, no simulador de combate.** No se afectan los PG de enemigos ni se gestionan turnos, acciones disponibles, salvaciones, iniciativa de enemigos, reacciones o concentración.
- Arrojar una jabalina o un arma similar **no descuenta automáticamente esa arma**; su ubicación y recuperación dependen de la mesa.
- No se recupera automáticamente la munición utilizada después de un combate. El director decide si se recupera; el jugador puede añadirla como botín.
- Los efectos temporales no otorgan bonificadores automáticos, ni siquiera si se llaman «Bendición», «Envenenado» o similares.
- **Guardado manual**: hay que pulsar «Actualizar guardado» tras registrar ataques, consumir proyectiles, añadir efectos o avanzar rondas.
- El diario de inventario mantiene su límite actual de **200 operaciones**. Un disparo con munición consume una operación; una vez alcanzado el límite debe ampliarse el sistema de persistencia antes de seguir registrando disparos. El historial de ataque conserva solo los últimos 100, sin borrar el gasto de munición realizado.
- No se introduce autenticación. La API permanece limitada a desarrollo local.

## Archivos incluidos

```text
packages/rules-engine/src/combat.ts               NUEVO
packages/rules-engine/src/inventory.ts
packages/rules-engine/src/adventure.ts
packages/rules-engine/src/index.ts
packages/rules-engine/tests/combat.test.ts         NUEVO
apps/web/src/components/CombatPanel.tsx            NUEVO
apps/web/src/components/AttacksPanel.tsx
apps/web/src/app/page.tsx
apps/web/src/app/globals.css
docs/implementation/PASO_16.md                      NUEVO
```

## Instalación en Windows

1. Asegúrate de haber subido la actualización 15 a GitHub. En la raíz del proyecto ejecuta `git status` y comprueba que no tienes modificaciones sin guardar.
2. Descarga y descomprime `actualizacion-web-10.zip`.
3. Copia **solo** las carpetas `apps`, `packages` y `docs` del ZIP dentro de `dnd-character-builder`, combinándolas con las existentes y reemplazando los archivos que coincidan. **No borres otras carpetas**.
4. No toques `.env`, `apps/web/.env.local`, `node_modules`, el volumen de Docker ni las migraciones de Prisma.
5. Con PostgreSQL iniciado, ejecuta desde PowerShell:

```powershell
pnpm test
pnpm build
pnpm dev
```

Abre `http://localhost:3000`. Encontrarás el panel «Registro y efectos temporales» debajo de «Ataques con armas».

**No es necesario** ejecutar `pnpm db:migrate` ni `prisma migrate reset`.

## Pruebas manuales de aceptación

1. Guerrero con arco largo y al menos dos flechas: calcula un ataque, pulsa **Confirmar ataque**, comprueba que desaparece una flecha y se añade una entrada al historial.
2. Repite con un ataque fallido: también debe descontar una flecha.
3. Comprueba que pulsar solo **Calcular tirada** no descuenta munición ni añade registros.
4. Gasta todas las flechas disponibles: sin munición no debe permitir confirmar nuevos disparos.
5. Añade como botín una **ballesta ligera** y un **virote**, y comprueba el consumo de un virote al confirmar un disparo.
6. Ataca con espada corta: la entrada se registra, pero no consume munición.
7. Registra un efecto durante 2 rondas, avanza una ronda y comprueba que queda 1; avanza otra y comprueba que desaparece.
8. Registra un efecto «hasta retirarlo»: debe permanecer tras avanzar ronda y poder quitarse manualmente.
9. Guarda el personaje con un ataque y un efecto, cierra el navegador, abre de nuevo el guardado: comprueba el historial, el efecto, la ronda y el número de flechas restantes.
10. Recupera un personaje guardado durante la actualización 14 o 15: debe abrir con el historial vacío sin perder PG, equipo ni recursos.
11. Comprueba que los tests anteriores no se han roto.

## Comprobaciones realizadas para generar el paquete

- Verificación estricta de tipos TypeScript del motor: superada.
- Verificación estática de TypeScript de los componentes de la pantalla con declaraciones de React de prueba: superada.
- **255/255 casos del motor** ejecutados en un verificador local compatible con las aserciones empleadas por los tests, incluidos 15 casos nuevos de combate: superados. Este verificador **no equivale a Vitest**.
- La ejecución oficial de Vitest, Next.js y conexión PostgreSQL deben realizarse en el equipo del usuario con los comandos anteriores.

## Subir a GitHub

```powershell
git add packages/rules-engine/src/combat.ts packages/rules-engine/src/inventory.ts packages/rules-engine/src/adventure.ts packages/rules-engine/src/index.ts packages/rules-engine/tests/combat.test.ts apps/web/src/components/CombatPanel.tsx apps/web/src/components/AttacksPanel.tsx apps/web/src/app/page.tsx apps/web/src/app/globals.css docs/implementation/PASO_16.md
git commit -m "feat: registrar ataques municion y efectos temporales"
git push
```
