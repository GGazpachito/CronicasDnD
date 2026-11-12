# D&D Character Builder · Crónicas

Aplicación web para crear y gestionar personajes de D&D con prioridad en las reglas revisadas de 2024. El objetivo es una **hoja de personaje digital**: automatiza cálculos derivados, conserva elecciones y recursos, y deja las decisiones de la partida al jugador y al director de juego.

## Estado del desarrollo

- MVP centrado en el Guerrero y la subclase Campeón, con progresión programada hasta nivel 20.
- Motor de reglas independiente en TypeScript.
- Creación guiada, hoja calculada, inventario, equipo y varios módulos de partida y combate preexistentes.
- Persistencia local en PostgreSQL/Prisma mediante la API de Next.js (requiere configuración del entorno).
- **Actualización 36:** estructura de seis pestañas y cabecera común. Las pestañas Rasgos, Equipo, Hechizos y Personaje están en transición; Combate muestra «Coming Soon». Los controles anteriores siguen disponibles en Principal.

Las capacidades deben verificarse con tests y una demostración de los flujos; el repositorio no se presenta como un producto público terminado.

## Requisitos

- Node.js 24 o superior.
- pnpm, según el workspace y su archivo de bloqueo.
- Docker Desktop o un PostgreSQL local equivalente para el guardado y la carga.
- Git.

## Primera ejecución

Desde la **raíz** del monorepositorio:

```bash
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:generate
pnpm dev
```

Abrir `http://localhost:3000`.

Configurar previamente las variables de entorno según los archivos `.env*.example` disponibles. `prisma.config.ts` espera `DATABASE_URL` en la raíz para aplicar migraciones. No incorporar credenciales reales al repositorio.

## Comprobaciones

```bash
pnpm test
pnpm build
pnpm lint
```

Estos comandos son los controles mínimos de regresión y deben ejecutarse antes de confirmar cada actualización; no se presuponen superados por el mero hecho de entregar cambios de código.

## Estructura

- `apps/web`: interfaz Next.js y API de personajes.
- `packages/rules-engine`: cálculos, progresión, ataques, inventario y estado de juego.
- `packages/game-data`: catálogo y esquemas de contenido autorizado.
- `packages/database`: esquema y migraciones de Prisma.
- `packages/shared`: tipos reutilizables.
- `docs`: especificación, arquitectura, decisiones y registro de implementaciones.

Consultar `docs/implementation/PASO_36_REDIESENO_PESTANAS.md` para la descripción detallada de la entrega 36 y sus comprobaciones pendientes.
