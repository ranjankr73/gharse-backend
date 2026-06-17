import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import config from "../config/env.config.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: config.POSTGRES_URI });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (config.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
