import { defineConfig } from "drizzle-kit";
// Removed import of dbSchema as DrizzleKit expects a file path for schema

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts", // Changed to shared/schema.ts
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
