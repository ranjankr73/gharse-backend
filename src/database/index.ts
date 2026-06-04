import { prisma } from "./postgresql.js";

export const connectDatabases = async () => {
    await prisma.$connect();

    console.log("✅ PostgreSQL connected");
};
