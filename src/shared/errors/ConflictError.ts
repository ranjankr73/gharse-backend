import { AppError } from "./AppError.js";

export class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super({
            message,
            statusCode: 409,
            errorCode: "CONFLICT",
            expose: true,
        });
    }
}
