import type { ApiErrorOptions, ErrorDetail } from "../types";

export class ApiError extends Error {
  statusCode: number;
  success: boolean;
  errors: ErrorDetail[];
  path: string;

  constructor({
    message = "Something Went Wrong",
    statusCode,
    stack,
    errors = [],
    path = "",
  }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.message = message;
    this.statusCode = statusCode || 500;
    this.success = false;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      if (typeof (Error as any).captureStackTrace === "function") {
        (Error as any).captureStackTrace(this, this.constructor);
      }
    }
    this.path = path;
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super({ message: `${resource} not found`, statusCode: 404 });
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super({ message, statusCode: 400 });
  }
}
export class UnauthorisedRequestError extends ApiError {
  constructor(message?: string) {
    super({
      message: `${message ? message : "Unauthorized"}`,
      statusCode: 401,
    });
  }
}

export class ServerError extends ApiError {
  constructor(message?: string) {
    super({
      message: `${message ? message : "Unexpected Server Error"}`,
      statusCode: 500,
    });
  }
}
