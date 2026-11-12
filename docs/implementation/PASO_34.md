# Paso 34 · Guerrero 2024: niveles 18 y 19

## Objetivo

Completar el tramo **18–19 del Guerrero/Campeón** en el creador de personajes nuevos, conectando rasgos de supervivencia y tres primeras dotes de beneficio épico con el motor, el combate, los descansos y la persistencia.

**Fuente de reglas:** *Manual del Jugador 2024*, capítulo 3 (Guerrero/Campeón, niveles 18 y 19) y capítulo 5 (dotes de beneficio épico). Se implementa una parte definida del contenido, no el catálogo completo de dotes.

## Reglas implementadas

| Nivel | Rasgo | Resultado |
|---|---|---|
| 18 | Superviviente: Desafiar a la muerte | Ventaja en salvaciones contra muerte; un 18–20 natural se trata como un 20 natural |
| 18 | Superviviente: Recuperación heroica | Al comenzar el turno propio, si tiene al menos 1 PG y está maltrecho (mitad de PG máximos o menos), recupera `5 + modificador de Constitución` PG |
| 19 | Beneficio épico | Se exige escoger una dote épica implementada, además de +1 a la característica elegida (máximo 30) |
| 19 | Pericia en combate | Convierte un ataque fallido en impacto una vez hasta el inicio del siguiente turno propio |
| 19 | Fortaleza | +40 PG máximos; al recuperar PG puede sumar modificador de Constitución una vez hasta el siguiente turno |
| 19 | Velocidad | +30 pies a la velocidad; permite Destrabarse con acción adicional y finalizar Agarrado |

La competencia continúa en +6 y se mantienen los **tres ataques por acción Atacar**. El cuarto ataque llegará con el nivel 20, que no está incluido en este ZIP.

## Interfaz

1. Crea o carga un Guerrero/Campeón nuevo de nivel 17.
2. En **Identidad**, avanza con la flecha a **18**. En **Muerte y concentración** se habilitan dos dados d20 de salvación contra muerte y sus resultados especiales.
3. Inicia un turno propio estando maltrecho y con PG positivos: **Superviviente** recupera PG automáticamente.
4. En **Características**, elige el **beneficio épico** y la característica que aumenta. Esta elección es obligatoria antes de pulsar la flecha hacia el nivel **19**.
5. **Pericia en combate**: en **Ataques con armas**, marca la conversión de fallo a impacto; el panel solicita dados de daño reales y lo registra en el historial.
6. **Fortaleza**: en **Jugar con tu personaje**, marca el bono de curación al utilizar curación, Segundo aliento o dados de golpe. Solo se permite una vez hasta el siguiente turno.
7. **Velocidad**: en **Tu turno de combate**, utiliza la acción adicional **Destrabarse** cuando corresponda; la aplicación retira las instancias Agarrado registradas.
8. Guarda el personaje en **Mis personajes** y comprueba que nivel 19, elección épica, PG y recursos persisten al cargarlo.

## Archivos e integración

- `packages/rules-engine/src/epic-boons.ts` (nuevo): selección y validación de tres dotes épicas.
- `src/guided.ts`, `sheet.ts`, `progression.ts`, `level-up.ts`: validación de nivel, mejora de característica, PG y rasgos únicos.
- `src/survival.ts`, `adventure.ts`: salvaciones contra muerte con ventaja y recuperación heroica, curaciones de Fortaleza.
- `src/combat.ts`, `attacks.ts`: conversión explícita de fallo a impacto, gasto y recuperación por turno, Destrabarse con Velocidad.
- `src/resources.ts`, `origin-magic.ts`: habilitación de niveles 18 y 19.
- `apps/web/src/app/page.tsx`, `SurvivalPanel.tsx`, `PlayPanel.tsx`, `AttacksPanel.tsx`, `TurnPanel.tsx`: selección, uso de rasgos y visualización.
- `tests/progression-18-19.test.ts` (nuevo): progresión, ventajas, límites de uso, curación, daño, estado e historial; pruebas previas de máximo nivel actualizadas.

**Guardado:** se mantiene el `schemaVersion: 2` del snapshot JSON en PostgreSQL; no se requiere migración de Prisma. Los guardados nuevos almacenan la elección épica y el uso de cada rasgo. No se realiza una migración especial de personajes históricos incompatibles.

## Pruebas

Desde la raíz del monorepo:

```powershell
docker compose up -d
pnpm test
pnpm build
pnpm dev
```

El comando de Vitest debe seguir siendo `vitest run --maxWorkers=2` (sin `--minWorkers`). Ejecuta también una prueba de guardado/carga de un Guerrero 19, un fallo convertido en impacto y una salvación contra muerte con 18 natural.

**Limitaciones declaradas:**

- El nivel 19 contempla **tres primeras dotes épicas**, no todas las dotes épicas ni las demás dotes para las que un Guerrero podría cumplir los requisitos.
- Pericia en combate funciona para los **ataques con armas** del panel actual; los ataques de conjuro y los golpes desarmados aún no están conectados.
- La aplicación no dispone de un gestor completo de monstruos, objetivos y turnos de enemigos. Las interacciones contextuales que dependan del DM se resuelven en mesa.
- La ventaja de Superviviente se registra mediante dos d20; la combinación con otras fuentes de ventaja/desventaja en tiradas de salvación contra muerte todavía requiere la valoración del director.
- No se automatiza aún el rasgo Superviviente como fuente opcional de la bonificación de curación de Fortaleza, ni el uso de Indomable en salvaciones contra muerte.
- El nivel 20 y el cuarto ataque por acción se implementarán en una actualización posterior.
