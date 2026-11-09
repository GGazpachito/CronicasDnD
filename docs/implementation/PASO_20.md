# Paso 20. Defensas automáticas y daño de varios tipos (PHB 2024)

## Objetivo

Resolver un ataque recibido con **varios componentes de daño** y aplicar por separado las defensas relevantes de cada tipo. Conectar esta resolución con el registro de combate y el motor ya existente de PG, concentración y salvaciones contra muerte. Mantener los guardados anteriores.

## Reglas implementadas

- El **Enano** tiene **resistencia al daño por veneno** (PHB 2024, capítulo 4, especie Enano, p. 188 impresa). La interfaz obtiene la especie del personaje cargado y activa esa defensa automáticamente.
- En un mismo impacto se pueden introducir **hasta cuatro componentes** de daño. Cada componente identifica su tipo, cantidad tirada y ajustes planos. El motor aplica sus resistencias, vulnerabilidades o inmunidades antes de sumar el daño resultante.
- La **resistencia** divide entre dos con redondeo hacia abajo; la **vulnerabilidad** duplica. Cuando coexisten, primero se aplica la resistencia y después la vulnerabilidad. La **inmunidad** reduce a cero.
- Dos fuentes de la misma resistencia o vulnerabilidad **no se acumulan**.
- Los ajustes se aplican **antes** de resistencia o vulnerabilidad.
- Todos los componentes de un mismo impacto generan **una sola aplicación de daño**, por lo que no se duplican las consecuencias sobre PG temporales, concentración y salvaciones contra muerte.
- El registro de ataques recibidos conserva el desglose por tipo, la mitigación y la fuente de la defensa.

## Fuentes declarativas

`collectDamageDefenses({ species, inventory, grants })` valida y reúne las defensas activas.

`grants` permite declarar resistencias, vulnerabilidades e inmunidades provenientes de otros rasgos u objetos. Las fuentes de tipo equipo requieren un objeto **poseído y equipado**. Este contrato está preparado para el futuro catálogo de objetos mágicos y contenido homebrew, pero **no contiene supuestos falsos**: la armadura corriente, los escudos corrientes y los estilos de combate del MVP **no conceden resistencia al daño**.

Las demás especies del prototipo, Humano y Elfo, no tienen resistencias al daño concedidas por su especie en el alcance actual.

Las defensas situacionales que todavía no conoce el catálogo se pueden introducir manualmente durante el ataque. Se suman a las defensas declaradas y no anulan la resistencia innata de un Enano.

## Cambios de código

- Nuevo: `packages/rules-engine/src/damage-defenses.ts`.
- Actualizado: `packages/rules-engine/src/incoming.ts`: argumento opcional `context` en `previewIncomingAttack` y `receiveIncomingAttack`, y campo opcional `additionalDamage` de hasta tres componentes además del principal.
- Actualizado: `packages/rules-engine/src/combat.ts`: campo opcional `damageParts` en el historial, con validación estricta y comprobación de totales.
- Actualizado: `packages/rules-engine/src/guided.ts`: las advertencias del Enano ya no indican que su resistencia al veneno esté pendiente.
- Actualizado: `packages/rules-engine/src/index.ts`: exporta las funciones del nuevo módulo.
- Actualizado: `apps/web/src/components/IncomingAttacksPanel.tsx`: vista previa, múltiples componentes y fuentes de defensa automática.
- Actualizado: `apps/web/src/app/page.tsx`: transmite la especie y el inventario a la resolución.
- Nuevo: `packages/rules-engine/tests/damage-defenses.test.ts`.

## Instalación en Windows

1. Conserva los cambios del proyecto en Git antes de copiar el ZIP.
2. Descomprime `actualizacion-web-14.zip`.
3. Copia las carpetas `packages`, `apps` y `docs` a la raíz de `dnd-character-builder` y acepta combinar/reemplazar los **archivos incluidos**.
4. Ejecuta los comandos desde la raíz:

```powershell
pnpm test
pnpm build
pnpm dev
```

5. Abre `http://localhost:3000` y el panel **Ataques recibidos**.

**No ejecutar `prisma migrate reset`, no borrar los volúmenes de Docker y no hace falta ninguna migración nueva.** La columna JSON utilizada hasta ahora se mantiene.

## Pruebas manuales

1. Con un Enano, ataque de **9 de Veneno** y sin mitigación manual: daño final **4**.
2. Con un Humano, el mismo ataque debe causar **9**.
3. Enano: primer componente **9 de Veneno** + segundo componente **5 de Fuego**: daño final **9** (`4 + 5`).
4. Enano con vulnerabilidad situacional al Veneno, daño 9: `floor(9 / 2) * 2 = 8`.
5. Inmunidad situacional: daño final 0.
6. Un ataque fallido registra 0 daño y no cambia PG ni concentración.
7. Un personaje con PG temporales los pierde antes que los PG normales.
8. Un ataque multicomponente contra un personaje concentrado genera **una** salvación de concentración, con CD basada en el daño final combinado.
9. Guarda el personaje, recarga la web y comprueba el desglose del historial.
10. Carga un personaje anterior: su historial antiguo sigue disponible.

## Pruebas automatizadas

La revisión local con compilación CommonJS y un **adaptador de aserciones** ejecutó **340 comprobaciones, 0 fallos**. Esto **no** sustituye `pnpm test` con Vitest ni `pnpm build` de Next.js en el equipo del usuario.

## Limitaciones transparentes

- El catálogo de defensas declarativas se ha preparado, pero **todavía no se han añadido los objetos mágicos** que conceden esas defensas ni un panel para administrarlos.
- No se interpreta automáticamente la resistencia de conjuros no implementados o de fuentes temporales descritas solo como texto libre.
- La aplicación no tira dados de daño; el jugador indica el daño resultante, incluidos los dados de críticos.
- En algunas reglas especiales (como reducciones globales de un impacto mixto), el reparto de ajustes entre componentes puede necesitar resolución manual del director de juego. Los ajustes numéricos del panel se aplican por componente.
- Los cambios del combate siguen requiriendo pulsar **Actualizar guardado**; no hay autoguardado.

## Guardar en GitHub

```powershell
git status
git add packages/rules-engine/src packages/rules-engine/tests apps/web/src/app/page.tsx apps/web/src/components/IncomingAttacksPanel.tsx docs/implementation/PASO_20.md
git commit -m "feat: aplicar defensas automaticas y dano multicomponente"
git push
```

## Siguiente paso

Incorporar un catálogo controlado de rasgos y objetos mágicos que otorguen defensas, con activación por equipamiento, así como mejoras para efectos de salvación y resistencias temporales.
