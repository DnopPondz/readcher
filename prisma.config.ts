import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env automatically. Use Node's built-in loader
// instead of adding dotenv; a missing .env is fine (CI, production env vars).
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Fallback keeps `prisma generate` working without a database configured.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
});
