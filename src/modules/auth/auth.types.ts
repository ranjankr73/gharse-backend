export interface RegisterInput {
    fullName: string;
    email: string;
    password: string;
    role: "CUSTOMER" | "PARTNER" | "RIDER";
    ipAddress: string;
    userAgent: string;
}

export interface RegisterResponse {
    user: {
        id: string;
        fullName: string;
        email: string;
        role: string;
    };
    accessToken: string;
    refreshToken: string;
}
