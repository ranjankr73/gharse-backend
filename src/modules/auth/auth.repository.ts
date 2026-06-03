import { AuthProvider, Role } from "../../../generated/prisma/enums.js";
import { prisma } from "../../database/postgresql.js";

export const findUserByEmail = async (email: string) => {
    return prisma.user.findUnique({
        where: {
            email,
        },
    });
};

export const createUser = async (data: {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    role: Role;
    authProvider: AuthProvider;
    providerId?: string;
    avatarUrl?: string;
}) => {
    return prisma.user.create({
        data,
    });
};

export const createSession = async (data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
}) => {
    return prisma.session.create({
        data,
    });
};

export const findUserByPhoneNumber = async (phoneNumber: string) => {
    return prisma.user.findUnique({
        where: {
            phone: phoneNumber,
        },
    });
};

export const findSessionById = async (id: string) => {
    return prisma.session.findUnique({
        where: {
            id,
        },
    });
};

export const revokeSession = async (id: string) => {
    return prisma.session.update({
        where: { id },
        data: {
            isRevoked: true,
            revokedAt: new Date(),
        },
    });
};

export const updateSession = async (
    id: string,
    data: {
        refreshTokenHash?: string;
        lastUsedAt?: Date;
        expiresAt?: Date;
        isRevoked?: boolean;
    },
) => {
    return prisma.session.update({
        where: { id },
        data,
    });
};
