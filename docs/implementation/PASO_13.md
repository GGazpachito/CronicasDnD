# Paso 13 · Persistencia local en PostgreSQL con Prisma 7

## Objetivo

Guardar, listar, recuperar, actualizar y eliminar **varios personajes Guerrero 1–3** con sus elecciones completas y acciones de inventario. No se guardan las estadísticas calculadas: se reconstruyen con `calculateGuidedFighter` a partir de la selección persistida.

Este paso no añade autenticación y **solo funciona en desarrollo local**. No expongas el servidor ni abras el acceso a la base de datos a otras redes. La aplicación se inicia en `127.0.0.1`, las rutas API comprueban localhost y están desactivadas fuera de `NODE_ENV=development`.

## Requisitos

- Windows, Node.js 24, pnpm y VS Code (ya configurados en el proyecto).
- **PostgreSQL**. La vía más sencilla para seguir estos comandos es **Docker Desktop** con `docker compose`. Si prefieres una instalación de PostgreSQL nativa, crea la base de datos y adapta ambas variables `DATABASE_URL` en consecuencia. **No necesitas Docker si ya tienes PostgreSQL en funcionamiento**.
- La base de datos de `compose.yaml` escucha **solo en `127.0.0.1:5433`**, no en el puerto 5432 habitual.

## Instalación (PowerShell, raíz del proyecto)

1. Copia las carpetas y archivos del ZIP sin borrar otros contenidos. Haz antes un commit de tus cambios existentes.
2. Si utilizas Docker Desktop, inicia Docker y ejecuta:

```powershell
docker compose up -d
docker compose ps
```

3. Crea tus archivos de configuración locales **sin subirlos a Git**:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path apps/web/.env.local)) { Copy-Item apps/web/.env.local.example apps/web/.env.local }
```

4. Instala dependencias, genera el cliente Prisma y crea el esquema SQL:

```powershell
pnpm install
pnpm db:generate
pnpm db:migrate
```

`pnpm db:migrate` crea `packages/database/prisma/migrations/...` en el primer arranque. Conserva esa carpeta y súbela a Git con el resto del código. **No uses `prisma migrate reset`**; elimina datos.

5. Comprueba el proyecto y abre la web:

```powershell
pnpm test
pnpm build
pnpm dev
```

Abre **http://localhost:3000**. La aplicación ahora incluye un panel **Mis personajes** antes de los pasos de creación.

> Si `pnpm db:migrate` dice que no conecta, revisa primero `docker compose ps` y que las URL de ambos archivos `.env` coincidan. No ejecutes comandos de reseteo ni borres volúmenes.

## Qué guarda exactamente

- Nombre, nivel 1–3, especie, linaje, trasfondo, valores asignados y aumentos, competencias elegidas.
- Dote humana, elecciones de dotes, conjuros de origen, atributo mágico.
- Estilo, maestrías, equipamiento inicial de clase y trasfondo.
- **Diario de operaciones del inventario**, incluidas compras, ventas, botín, retiradas, equipamiento de armadura y escudo. El motor reconstruye las cantidades, las monedas y la CA.
- `schemaVersion = 1`, `rulesVersion = phb-2024-srd-5.2.1` y `revision` para detectar conflictos al sobrescribir.

**No se guardan aún** los PG actuales ni los usos gastados de Segundo aliento y Acción súbita, porque la interfaz todavía no tiene controles de estado de partida. Esos campos se añadirán en una fase posterior. Tampoco se ha implementado una base de datos normalizada para el catálogo completo de reglas. En este primer hito almacenamos un **snapshot JSON validado de las elecciones**, asociado a una fila relacional.

## Uso de Mis personajes

- **Guardar como nuevo**: crea otro personaje, sin sobrescribir los existentes.
- **Cargar elegido**: sustituye la edición actual por el personaje guardado. Pide confirmación.
- **Actualizar guardado**: modifica exclusivamente el personaje previamente cargado o creado, si el seleccionado coincide y el número de revisión sigue siendo el mismo.
- **Eliminar**: elimina el personaje seleccionado después de pedir confirmación.
- **Los cambios NO se guardan automáticamente**: usa Actualizar guardado antes de cerrar la pestaña.

## Pruebas manuales

1. Guarda un Guerrero con nombre distinto mediante Guardar como nuevo.
2. Cierra el navegador y vuelve a abrir `localhost:3000`: la fila sigue apareciendo.
3. Carga el personaje y comprueba especie, trasfondo, características, dotes, estilo y maestrías.
4. Compra un escudo, equípalo, guarda y recarga. Debe mantenerse en el inventario y la CA debe reflejarlo.
5. Modifica su nombre, pulsa Actualizar guardado y recarga para comprobarlo.
6. Guarda otro Guerrero distinto: ambos deben poder recuperarse por separado.
7. Selecciona el primero, pulsa Eliminar y verifica que desaparece de la lista.
8. Introduce una selección inválida y comprueba que Guardar queda desactivado.
9. En caso de conflicto de revisión (dos pestañas con el mismo personaje), la segunda escritura debe ser rechazada, no pisar la primera.

## Estructura técnica

- `packages/database/prisma/schema.prisma`: tabla `Character` con `selection Json` y número de revisión.
- `prisma.config.ts`: configuración de Prisma 7 y ruta de migraciones.
- `apps/web/src/lib/prisma.ts`: cliente PostgreSQL de servidor con adaptador `@prisma/adapter-pg`.
- `apps/web/src/lib/characters-api.ts`: control de acceso local y validación de tamaño del JSON.
- `apps/web/src/app/api/characters/route.ts`: listar y crear.
- `apps/web/src/app/api/characters/[id]/route.ts`: leer, actualizar con control de versión y borrar.
- `packages/rules-engine/src/persistence.ts`: validación y serialización de elecciones (sin efectos secundarios).
- `apps/web/src/components/SaveLoadPanel.tsx`: controles de guardado.

## Limitaciones y evolución

Este prototipo es solo para **uso personal en localhost**. No se debe desplegar con las rutas actuales en Vercel ni abrirse a Internet. El siguiente trabajo después de validar el guardado será el **estado persistente de partida** (PG actuales y recursos), y posteriormente **autenticación**, usuarios propietarios y aislamiento de sus personajes. Cuando el modelo sea estable ampliaremos la normalización de contenidos para clases, dotes y homebrew.

## Registro en Git

```powershell
git add .gitignore package.json pnpm-lock.yaml prisma.config.ts compose.yaml .env.example apps/web/.env.local.example apps/web/package.json apps/web/src packages/database/prisma packages/rules-engine docs/implementation/PASO_13.md
git commit -m "feat: guardar personajes en PostgreSQL con Prisma"
git push
```

**Nunca añadas** `.env` ni `apps/web/.env.local` al repositorio. Comprueba `git status` antes de hacer commit.
