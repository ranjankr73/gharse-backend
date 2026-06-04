import { AppError } from "./AppError.js";

export class UnauthorizedError extends AppError {
    constructor(details?: Record<string, unknown>){
        super({
            message: "Unauthorization failed",
            details
        })
    }
}