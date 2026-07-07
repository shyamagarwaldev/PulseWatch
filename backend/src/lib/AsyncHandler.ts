import type { NextFunction, Request, Response } from "express";
import type { AsyncHandlerPropsType } from "../types";

export function AsyncHandler(requestHandler: AsyncHandlerPropsType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
}
