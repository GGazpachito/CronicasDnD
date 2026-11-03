# D&D Character Builder

Aplicación web para crear y gestionar personajes de D&D, empezando por reglas abiertas de 2024.

## Requisitos

- Node.js 24 LTS
- pnpm
- Git

## Primera ejecución

```bash
pnpm install
pnpm dev
```

Abrir http://localhost:3000.

## Comprobaciones

```bash
pnpm test
pnpm build
```

## Estructura

- `apps/web`: interfaz Next.js.
- `packages/rules-engine`: motor de reglas independiente.
- `packages/game-data`: esquemas y contenido autorizado.
- `packages/database`: futuro módulo de persistencia PostgreSQL/Prisma.
- `packages/shared`: tipos reutilizables.
- `docs`: requisitos, arquitectura, reglas, licencias y decisiones.

**Estado:** esqueleto inicial sin autenticación, base de datos ni contenido oficial. No es un producto desplegado.
