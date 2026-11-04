# Base de datos · Fase 4.1

El esquema de PostgreSQL y Prisma 7 esta en `prisma/schema.prisma`.

Desde la raiz del monorepositorio:

```powershell
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Las migraciones SQL se generan en `prisma/migrations/` con `pnpm db:migrate` y deben versionarse.
El guardado actual usa un `selection` JSON validado; normalizaremos el catalogo en futuras fases.

No utilizar esta API local sin autenticacion en produccion.
