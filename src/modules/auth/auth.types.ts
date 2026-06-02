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
    role: "CUSTOMER" | "PARTNER" | "RIDER";
}

export type LoginInput = EmailPasswordCredentials & ClientInfo;

export interface AuthenticatedUser {
    id: string;
    name: string;
    email: string;
    role: string;
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
    role: "CUSTOMER" | "PARTNER" | "RIDER";
}
