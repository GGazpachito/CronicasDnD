# Paso 15 · Ataques con armas del Guerrero (fase 4.3)

## Objetivo

Dar uso durante la partida a las armas del inventario, sin introducir un combate virtual ni alterar las criaturas del director. **Manual del Jugador 2024**, pp. 12, 25–28, 91, 96, 209–210, 213–215; SRD 5.2.1 como fuente complementaria.

## Alcance implementado

- Catálogo mecánico de las **38 armas** del Manual del Jugador, con daño, tipo, alcance, Sutileza, Ligera, Pesada, Versátil, Arrojadiza, munición, Carga y maestría. El panel muestra únicamente armas presentes en el inventario del personaje.
- Bonificador de ataque por Fuerza o Destreza, más competencia del Guerrero, con la elección de característica en armas con Sutileza.
- **Tiro con arco:** +2 a ataques con armas a distancia; no por arrojar una jabalina, que es un arma cuerpo a cuerpo.
- **Duelo:** +2 al daño de un arma cuerpo a cuerpo sujetada con una mano sin otra arma. Un escudo no cuenta como otra arma.
- **Combate con armas arrojadizas:** +2 al daño cuando el arma tiene Arrojadiza y se usa en un ataque a distancia.
- **Combate con dos armas:** permite añadir el modificador positivo al ataque adicional habilitado por Ligera; sin el estilo, solo se conserva un modificador negativo. El jugador debe confirmar que realizó el ataque adicional válido con otra arma.
- **Combate con arma a dos manos:** en el cálculo de daño, los dados del arma que muestran 1 o 2 se tratan como 3 al empuñarla con dos manos y cumplir sus requisitos. Los dados de otras fuentes no se gestionan.
- Desventaja por arma Pesada sin Fuerza 13 (cuerpo a cuerpo) o Destreza 13 (a distancia), por distancia superior al alcance normal y por atacar a distancia con un enemigo activo a 5 pies. Ventaja y desventaja se cancelan. Se respeta el alcance máximo.
- Tiradas manuales de d20, CA opcional del objetivo y resultados manuales de dados de daño. Resultados naturales de 1 y 20, y **19–20 crítico con Campeón de nivel 3**. Los dados de daño del arma se duplican al crítico, pero no el modificador plano.
- Maestrías: solo aparecen como activas cuando el Guerrero seleccionó ese tipo de arma. **Rozar (Graze)** calcula daño posible tras fallar y **Derribar (Topple)** calcula la CD; las demás generan una explicación mecánica breve para la mesa sin alterar enemigos ni simular turnos.
- Verificación de incompatibilidad del escudo con un arma a dos manos en el panel. Se señala la munición faltante para armas que requieren flechas. No se consume automáticamente munición.
- Funciones puras: `calculateWeaponAttack`, `resolveWeaponAttack`, `adjustGreatWeaponDice`, `ownedWeapons`. No modifican el inventario, la hoja ni el estado de la partida.

## Instalación en Windows

1. Conserva un commit de la versión anterior y comprueba `git status`.
2. Descarga `actualizacion-web-09.zip`, descomprímelo en una carpeta temporal y combina las carpetas `apps`, `packages` y `docs` con el proyecto **sin borrar otras carpetas**. Acepta reemplazar `page.tsx`, `globals.css`, `guided.ts` e `index.ts`.
3. No borres `.env`, `apps/web/.env.local`, `node_modules` ni los volúmenes de Docker. **No hay migraciones Prisma nuevas**.
4. Con Docker Desktop ejecutándose, usa desde la raíz del repositorio:

```powershell
pnpm test
pnpm build
pnpm dev
```

5. Abre `http://localhost:3000`; aparecerá el bloque **Ataques con armas**, debajo de «Jugar con tu personaje».

## Pruebas manuales de aceptación

1. Guerrero 1, Fuerza 16 y espadón: **+5 para impactar, 2d6+3** de daño cortante.
2. Guerrero 1, Destreza 14 y arco largo con Tiro con arco: **+6 para impactar y 1d8+2** de daño perforante (si posee un arco y flechas).
3. Jabalina arrojada (30/120 pies): se usa Fuerza; Tiro con arco **no** aporta +2, pero Combate con armas arrojadizas aporta **+2 al daño**.
4. Mayal y Duelo: **1d8+5** con Fuerza 16; si sujetas otra arma, vuelve a **1d8+3**.
5. Daga o espada corta usando Sutileza y Destreza 14: **+4 para impactar**.
6. Espadón con Guerrero Campeón nivel 3: 19 natural es crítico y requiere **4d6** de daño.
7. Con maestría en Espadón, un ataque fallido muestra **Rozar: 3 puntos**; si no domina ese arma, no ofrece Rozar.
8. Elige armadura y equipa escudo: el panel debe impedir emplear un espadón a dos manos.
9. Introduce una CA del enemigo y un d20; el panel debe mostrar el resultado sin descontar PG a ningún personaje.
10. Guarda, cierra y recupera el personaje: los datos previos de inventario, recursos y estado de partida deben seguir intactos.

## Limitaciones deliberadas

- **No se guardan en PostgreSQL las simulaciones de ataque**, solo la hoja de personaje, inventario y estado de partida que ya se guardaban. El panel no gasta munición ni consume acciones.
- No se ejecutan ataques extra, efectos sobre criaturas, salvaciones de enemigos, distancia dinámica ni condiciones. En especial, Tajo, Empujar, Debilitar, Ralentizar, Mella y Hostigar requieren confirmación del director.
- Los efectos de Ataque salvaje, todas las reacciones de estilos de combate, ataques desarmados, equipamiento de armas en manos y posibles objetos mágicos se ampliarán en fases posteriores.
- Algunas armas del catálogo de combate aún no están disponibles como objetos comerciables en el inventario reducido; solo aparecen si su identificador existe como objeto poseído.
- La API sigue limitada a desarrollo local, sin autenticación. No publiques esta versión en Internet.

## Cambios de archivo

```text
packages/rules-engine/src/attacks.ts                 NUEVO
packages/rules-engine/src/guided.ts
packages/rules-engine/src/index.ts
packages/rules-engine/tests/attacks.test.ts           NUEVO
apps/web/src/components/AttacksPanel.tsx             NUEVO
apps/web/src/app/page.tsx
apps/web/src/app/globals.css
docs/implementation/PASO_15.md                        NUEVO
```

## Subir a GitHub

```powershell
git add packages/rules-engine/src/attacks.ts packages/rules-engine/src/guided.ts packages/rules-engine/src/index.ts packages/rules-engine/tests/attacks.test.ts apps/web/src/components/AttacksPanel.tsx apps/web/src/app/page.tsx apps/web/src/app/globals.css docs/implementation/PASO_15.md
git commit -m "feat: implementar ataques con armas del Guerrero"
git push
```
