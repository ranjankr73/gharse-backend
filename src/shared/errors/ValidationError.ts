import { AppError } from "./AppError.js";

export class ValidationError extends AppError {
    constructor(details?: Record<string, unknown>) {
        super({
            message: "Validation failed",
            statusCode: 400,
            errorCode: "VALIDATION_ERROR",
            expose: true,
            details: details,
        });
    }
}
