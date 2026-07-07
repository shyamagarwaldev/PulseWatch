import jwt from "jsonwebtoken";
import type { TokenType, UserJwtPayload } from "../types/auth";
export const CreateToken = (id: string, duration: number, type: TokenType) => {
  const token = jwt.sign({ id, type }, process.env.TOKEN_SECRET!, {
    expiresIn: duration,
  });

  return token;
};

export const VerifyToken = (token: string) => {
  return jwt.verify(token, process.env.TOKEN_SECRET!) as UserJwtPayload;
};
