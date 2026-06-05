import { defineConfig } from "drizzle-kit";
import path from "path";
import { buildDatabaseUrl } from "./src/connection";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? buildDatabaseUrl(),
  },
});
