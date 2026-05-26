import { defineConfig } from "prisma/config";
import config from "./src/config/env.config";

export default defineConfig({
  schema: "prisma/",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: config.POSTGRES_URI,
  },
});
