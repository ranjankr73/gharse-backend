export class AppError extends Error {
    statusCode: number;
    errorCode: string;

    isOperational: boolean;
    expose: boolean;

    details?: Record<string, unknown>;
    cause?: unknown;

    timestamp: string;

    constructor({
        message,
        statusCode = 500,
        errorCode = "INTERNAL SERVER ERROR",
        isOperational = true,
        expose = false,
        details,
        cause,
    }: {
        message: string;
        statusCode?: number;
        errorCode?: string;
        isOperational?: boolean;
        expose?: boolean;
        details?: Record<string, unknown>;
        cause?: unknown;
    }) {
        super(message);

        this.statusCode = statusCode;
        this.errorCode = errorCode;

        this.isOperational = isOperational;
        this.expose = expose;

        this.details = details;
        this.cause = cause;

        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }
}
