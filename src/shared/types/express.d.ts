import { Role } from "../../../generated/prisma/enums.ts";

declare global {
    namespace Express {
        interface AuthTokenPayload {
            sub: string;
            role: Role;
            sessionId: string;
        }

        interface Request {
            user?: AuthTokenPayload;
        }
    }
}

export {};
