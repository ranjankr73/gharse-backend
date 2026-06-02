import crypto from "crypto";

export const generateOTP = (length: number): string => {
    return Array.from({ length }, () =>
        crypto.randomInt(0, 10).toString(),
    ).join("");
};
