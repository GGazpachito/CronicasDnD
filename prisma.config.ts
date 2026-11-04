import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "packages/database/prisma/schema.prisma",
  migrations: { path: "packages/database/prisma/migrations" },
  // `prisma generate` no necesita abrir una conexion.
  // `prisma migrate dev` si necesita DATABASE_URL en el .env de la raiz.
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://sin-uso:sin-uso@127.0.0.1:5433/sin_uso" },
});
