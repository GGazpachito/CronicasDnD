# CRÓNICAS · Editor de personajes compatible con 5E

CRÓNICAS es una aplicación web en desarrollo para crear, actualizar y gestionar personajes de juego de rol con reglas de quinta edición revisadas en 2024. Su objetivo es funcionar como una **hoja de personaje digital**: calcula los valores derivados y permite realizar tiradas, mientras que las decisiones narrativas, las acciones y el desarrollo de la partida siguen en manos de los jugadores y de quien dirige la mesa.

## Estado actual

- Guerrero y subclase Campeón: progresión de niveles 1 a 20.
- Mago y subclase Evocador: progresión de niveles 1 a 20.
- Brujo y Patrón Infernal: progresión implementada hasta nivel 14.
- Hoja de personaje compartida, equipo, conjuros, tiradas, recursos, guardado y carga de personajes.
- Bestiario y fichas de compañeros con datos reutilizables.
- Motor de reglas en TypeScript separado de la interfaz Next.js.
- Persistencia local con PostgreSQL y Prisma.

La actualización 84 realizó una auditoría para limitar el **catálogo activo del programa base al SRD 5.2.1**. El diseño de futuros módulos ampliables se documenta en [`docs/architecture/ARQUITECTURA_MODULAR_SRD.md`](docs/architecture/ARQUITECTURA_MODULAR_SRD.md); la activación de módulos por usuario **aún no está implementada**.

El proyecto no es un servicio público de producción terminado. En concreto, la API de guardado utiliza una base de datos local y no se ofrece como una plataforma multiusuario con autenticación o controles de acceso completos.

## Requisitos

- Node.js 24 o superior.
- pnpm (el repositorio incluye el archivo de bloqueo).
- Docker Desktop o una instalación local de PostgreSQL.
- Git.

## Desarrollo local

Desde la raíz del repositorio:

```bash
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:generate
pnpm dev
```

Abrir `http://localhost:3000`. Crear los archivos de entorno a partir de `.env.example` y `apps/web/.env.local.example`. La configuración local de Prisma requiere `DATABASE_URL` en la raíz. **No subir claves, credenciales ni archivos `.env` reales a GitHub.** Las contraseñas de los ejemplos corresponden únicamente a una base de datos de desarrollo local.

## Comprobaciones

```bash
pnpm test
pnpm build
pnpm lint
```

## Organización

- `apps/web`: interfaz Next.js y API de personajes.
- `packages/rules-engine`: reglas, cálculos, progresión y sesiones.
- `packages/game-data`: esquemas para datos de juego.
- `packages/database`: Prisma y migraciones.
- `packages/shared`: tipos compartidos.
- `docs`: decisiones, arquitectura y evolución del proyecto.

## Atribuciones y derechos

Parte del contenido de reglas utilizado por CRÓNICAS procede del **System Reference Document 5.2.1 (SRD 5.2.1)**, que Wizards of the Coast LLC publica bajo **Creative Commons Atribución 4.0 Internacional (CC-BY-4.0)**. La atribución íntegra requerida y la explicación de las adaptaciones están en [`NOTICE.md`](NOTICE.md) y son accesibles también desde la página **Atribuciones y licencias** de la aplicación (`/atribuciones`).

La licencia CC-BY-4.0 se aplica al **material del SRD**, no automáticamente a todo el código, los recursos visuales o las dependencias de CRÓNICAS. Por ahora, el código propio **no se ofrece bajo una licencia general de software de código abierto**: publicar el repositorio para consulta no concede por sí mismo permisos generales de reproducción, modificación o redistribución. Una licencia de software separada puede acordarse y añadirse posteriormente.

Este proyecto es independiente y no está afiliado ni respaldado por Wizards of the Coast. La arquitectura modular prevista no constituye una autorización para distribuir material procedente de libros comerciales ajenos al SRD.

## Estado de la documentación

La auditoría de contenido está descrita en [`docs/implementation/PASO_84_AUDITORIA_SRD_Y_ARQUITECTURA_MODULAR.md`](docs/implementation/PASO_84_AUDITORIA_SRD_Y_ARQUITECTURA_MODULAR.md). Las notas de implementación registran los avances y las limitaciones conocidos para su posible utilización en la memoria del TFG.
