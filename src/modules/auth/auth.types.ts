import { JwtPayload } from "jsonwebtoken";
import { Role } from "../../../generated/prisma/enums.js";

export interface EmailPasswordCredentials {
    email: string;
    password: string;
}

export interface ClientInfo {
    ipAddress: string;
    userAgent: string;
}
export interface RegisterInput extends EmailPasswordCredentials, ClientInfo {
    name: string;
    role: Exclude<Role, "ADMIN">;
}

export type LoginInput = EmailPasswordCredentials & ClientInfo;

export interface AuthenticatedUser {
    id: string;
    name: string;
    email: string;
    role: Role;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
    user: AuthenticatedUser;
}

export interface GoogleAuthInput extends ClientInfo {
    googleToken: string;
    role: Exclude<Role, "ADMIN">;
}

export interface OTPAuthInput extends ClientInfo {
    phoneNumber: string;
    otp: string;
    role: Exclude<Role, "ADMIN">;
}

export interface AuthTokenPayload extends JwtPayload {
    sub: string;
    role: Role;
    sessionId: string;
}

export interface SessionPayload {
    userId: string;
    role: Role;
    isRevoked: boolean;
}
