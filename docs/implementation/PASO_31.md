# Paso 31 · Guerrero, niveles 12 y 13 (D&D 2024)

## Alcance

- **Nivel 12:** cuarta elección independiente de la dote *Mejora de característica*: +2 a una característica o +1 a dos distintas, límite 20 por este método. Se acumula a las de nivel 4, 6 y 8, con recálculo de PG máximos si cambia Constitución. Las dotes generales alternativas siguen pendientes de catalogar.
- **Nivel 13:** competencia +5, dos usos de **Indomable** por descanso largo y **Ataques estudiados**.
- **Ataques estudiados:** al confirmar un fallo de tirada de ataque contra una criatura identificada, se registra ventaja para la **siguiente** tirada de ataque contra esa criatura antes del final del siguiente turno propio. El siguiente ataque contra ese objetivo consume el efecto incluso si falla; si también falla, registra uno nuevo. Una ventaja no se acumula con otra, y las fuentes de desventaja la cancelan.
- Sin CA del objetivo, la resolución del impacto queda indeterminada y no se registra Ataques estudiados. La regla no afecta a objetos inanimados ni a otras criaturas.
- Los efectos temporizados con un turno activo caducan al terminar el siguiente turno. Sin seguimiento de turnos, se retiran manualmente en «Registro y efectos temporales».
- La implementación de Ataques estudiados se aplica por ahora al módulo de **ataques con armas**. Las tiradas de ataque de conjuros y golpes desarmados aún no disponen del registro correspondiente.

### Fuentes de reglas

Manual del Jugador 2024, capítulo 3 (Guerrero, página impresa 91-92, PDF página 91). Tabla del Guerrero: nivel 12 mejora de característica, nivel 13 competencia +5, Indomable dos usos y Ataques estudiados. Se conservan las elecciones y mecanismos que ya existían en la actualización 30.

## Archivos modificados

- `packages/rules-engine/src/progression.ts`: nivel máximo 13 y cuarta mejora.
- `packages/rules-engine/src/guided.ts`, `sheet.ts`: validación, cálculos de nivel 12-13 y rasgos únicos.
- `packages/rules-engine/src/resources.ts`, `adventure.ts`: segundo uso de Indomable y transiciones conservadoras.
- `packages/rules-engine/src/combat.ts`: seguimiento validado de objetivos estudiados, consumo, caducidad, limpieza y persistencia dentro del JSON de combate.
- `packages/rules-engine/src/attacks.ts`, `level-up.ts`, `origin-magic.ts`: compatibilidad de niveles 12-13.
- `apps/web/src/app/page.tsx`: selector con flechas hasta nivel 13 y elección de nivel 12.
- `apps/web/src/components/{AttacksPanel,CombatPanel,PlayPanel}.tsx`: ventaja automática, listado de objetivos estudiados y máximos de Indomable.
- `packages/rules-engine/tests/progression-12-13.test.ts`: regresión de niveles, ataques, eventos y guardado.
- `packages/rules-engine/tests/{level-stepper,progression-10-11}.test.ts`: ajuste de límite de navegación (antes 11, ahora 13).
- `packages/rules-engine/package.json`: mantiene `vitest run --maxWorkers=2` sin `--minWorkers`.

## Instalación

Descomprimir `actualizacion-web-25.zip` y copiar **apps**, **packages** y **docs** dentro de la raíz `DndEditor`, combinando las carpetas. No es necesario migrar Prisma, ya que los nuevos campos se guardan en JSON como propiedades opcionales de la misma versión 2 de instantánea.

En Windows, desde la raíz del proyecto:

```powershell
docker compose up -d
pnpm test
pnpm build
pnpm dev
```

Para verificar, crear o cargar un personaje de nivel 11, escoger la mejora del nivel 12 en **Características**, subir a 12 y 13 mediante la flecha y guardar mediante **Actualizar guardado**. Al recuperar debe conservar el nivel 13, los dos usos de Indomable y las elecciones. Para probar Ataques estudiados, iniciar turno, indicar la CA y el nombre de una criatura, confirmar un fallo y comprobar que el siguiente ataque contra el mismo nombre tiene ventaja; atacar a otra criatura no consume esa ventaja. Al finalizar el siguiente turno, el efecto debe desaparecer.

## Verificación local y limitaciones

- Motor de reglas y tests: comprobación estricta de tipos con TypeScript.
- Pantallas modificadas: comprobación estricta de tipos con una declaración local mínima para React; no sustituye al build real de Next.js.
- Regresión ejecutada localmente con un adaptador de aserciones compatible con Vitest. **La ejecución real de Vitest y Next.js debe confirmarse en Windows**.
- No se modifican las tablas ni la conexión de PostgreSQL. Tampoco se recuperan guardados de personajes antiguos incompatibles que existieran antes del último creador.
- No se implementan todavía dotes generales alternativas, ataques de conjuros, enemigos con turno propio ni los rasgos de nivel 14 en adelante.
