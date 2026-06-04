import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import config from "../config/env.config.js";

const adapter = new PrismaPg({ connectionString: config.POSTGRES_URI });

export const prisma = new PrismaClient({ adapter });
