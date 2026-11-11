/**
 * Centralized Application Error class.
 * Ensures consistent error formatting, categorization, and handling across the app.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isOperational: boolean;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      isOperational?: boolean;
      originalError?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    
    this.code = options.code || 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode;
    
    // By default, if we explicitly throw an AppError, we assume it's operational
    // (i.e. we expect it might happen, like a validation error or a network timeout)
    this.isOperational = options.isOperational ?? true;
    this.originalError = options.originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert an unknown error object into a structured AppError
   */
  static fromUnknown(error: unknown, defaultMessage = 'An unexpected error occurred'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, {
        code: error.name || 'UNKNOWN_ERROR',
        isOperational: false, // Standard JS errors (TypeError, etc) are bugs, not operational
        originalError: error,
      });
    }

    if (typeof error === 'string') {
      return new AppError(error, { isOperational: false, originalError: error });
    }

    return new AppError(defaultMessage, { isOperational: false, originalError: error });
  }
}
