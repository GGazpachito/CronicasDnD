# Paso 33 · Guerrero 2024: niveles 16 y 17

## Objetivo

Extender el **Guerrero/Campeón** del nivel 15 a los niveles **16 y 17** sin rehacer personajes nuevos ni la base de datos.

Fuente de reglas: **Manual del Jugador 2024**, tabla *Fighter Features* y texto de **Action Surge** e **Indomitable** (cap. 3, Guerrero). La interfaz y el motor siguen siendo parciales: las dotes generales alternativas a Mejora de característica están pendientes.

## Reglas implementadas

| Nivel | Rasgo | Mecánica |
|---|---|---|
| 16 | Mejora de característica | Nueva elección independiente, +2 o +1/+1, sin superar 20 |
| 16 | Maestría de armas | Se desbloquea la **sexta** arma dominada, diferente de las cinco anteriores |
| 17 | Bonificador de competencia | +6 |
| 17 | Acción súbita | **2 usos**, se recuperan ambos en descanso corto o largo |
| 17 | Indomable | **3 usos**, solo se recuperan en descanso largo |

La Acción súbita **solo puede utilizarse una vez por turno**, incluso teniendo dos usos disponibles. Al subir de 16 a 17, se añade un nuevo uso de Acción súbita y uno de Indomable, conservando el gasto previo. Segundo aliento sigue teniendo 4 usos. El Guerrero mantiene **3 ataques por acción Atacar** hasta nivel 19; el cuarto se obtiene en nivel 20, fuera del alcance de esta fase.

## UI y flujo

1. Con Guerrero 15, en **Características** elegir la **sexta mejora (nivel 16)**.
2. En **Equipo** elegir la **sexta maestría** de armas, distinta de las anteriores.
3. Subir con la flecha a nivel **16**. La nueva maestría se aplica al panel de ataques.
4. Subir con la flecha a nivel **17**. Revisar competencia +6, Acción súbita 2/2 e Indomable 3/3 en **Jugar con tu personaje**.
5. Guardar en **Mis personajes > Actualizar guardado** y cargar para comprobar persistencia.

La pantalla **Jugar con tu personaje** muestra ahora el máximo de Acción súbita de forma independiente del máximo de Indomable (se corrigió un error de presentación de la versión anterior).

## Integración y datos

- `src/progression.ts`, `guided.ts`, `sheet.ts`: niveles y mejora independiente de nivel 16.
- `src/martial.ts`, `attacks.ts`: validación de seis maestrías desde nivel 16, también en el cálculo de ataque.
- `src/resources.ts`: máximos 4/2/3 desde nivel 17, descansos y transiciones.
- `src/adventure.ts`, `level-up.ts`: estado y subida consecutiva 15 → 16 → 17.
- `src/origin-magic.ts`: acepta niveles 16 y 17 en la proyección del linaje élfico.
- `apps/web/src/app/page.tsx`: selector 1–17, elecciones y carga de guardados nuevos.
- `apps/web/src/components/PlayPanel.tsx`: presentación de los máximos de cada recurso.

Persistencia: se conserva la **versión 2** del snapshot JSON en PostgreSQL, sin migración Prisma. Se mantiene `packages/rules-engine/package.json` con `vitest run --maxWorkers=2` y **sin** `--minWorkers`.

## Pruebas incluidas

- `progression-16-17.test.ts`: mejoras, límites, maestrías, recursos, descansos, uso por turno, transiciones y guardado.
- `level-stepper.test.ts`, `progression-14-15.test.ts`: actualizaciones del nuevo nivel máximo.
- Todas las pruebas previas permanecen intactas; no se elimina ningún sistema anterior.

## Ejecutar en Windows

```powershell
docker compose up -d
pnpm test
pnpm build
pnpm dev
```

Antes de subir a GitHub, confirmar la ejecución oficial de Vitest y la compilación Next.js en Windows. El verificador local de desarrollo no sustituye estos comandos.

## Limitaciones aún pendientes

- No están implementadas las dotes generales alternativas para nivel 16.
- No existe una simulación completa de criaturas enemigas, turnos y condiciones ajenas.
- Los personajes históricos incompatibles con versiones anteriores no se migran en esta fase.
- El siguiente bloque prevé niveles 18 y 19, incluido el rasgo del Campeón de nivel 18 y la dote de beneficio épico del nivel 19, cuyo catálogo debe añadirse con validaciones específicas.
