import prisma from "../db";
import bcrypt from "bcrypt";
import { AsyncHandler } from "../utils/AsyncHandler";
import { BadRequestError, UnauthorisedRequestError } from "../utils/ApiError";
import { UserSignInSchema, UserSignUpSchema } from "../schemas/users.schema";
import { handleZodError } from "../utils/ZodError";
import CreateToken from "../utils/CreateToken";
import { ApiResponse } from "../utils/ApiResponse";
import jwt from "jsonwebtoken";
import type { UserJwtPayload } from "../types/auth";

export const signup = AsyncHandler(async (req, res) => {
  const { data, error, success } = UserSignUpSchema.safeParse(req.body);
  if (!success) {
    throw handleZodError(error);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
    },
  });

  res.status(201).json(
    new ApiResponse({
      message: "user created succesfully",
      statusCode: 201,
    }),
  );
});

export const signin = AsyncHandler(async (req, res) => {
  const { data, error, success } = UserSignInSchema.safeParse(req.body);
  if (!success) {
    throw handleZodError(error);
  }
  const user = await prisma.user.findUnique({
    where: {
      username: data.username,
    },
  });
  if (!user) {
    throw new BadRequestError("Invalid username or password");
  }

  if (!(await bcrypt.compare(data.password, user.password))) {
    throw new BadRequestError("Invalid username or password");
  }

  const accessToken = CreateToken(user.id, 60 * 60 * 24 * 1000);
  const refreshToken = CreateToken(user.id, 7 * 60 * 60 * 24 * 1000);

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      username: true,
    },
    data: {
      refresh_token: refreshToken,
    },
  });

  res
    .cookie("accessToken", accessToken, {
      maxAge: 60 * 60 * 24 * 1000,
      httpOnly: true,
      // secure: true,
    })
    .cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    })
    .status(200)
    .json(
      new ApiResponse({
        data: updatedUser,
        statusCode: 200,
        message: "succesfully sign in",
      }),
    );
});

export const refresh = AsyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) throw new BadRequestError("User is Logged Out");

  const verifiedToken = jwt.verify(
    refreshToken,
    process.env.TOKEN_SECRET!,
  ) as UserJwtPayload;

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: verifiedToken.id,
    },
  });

  if (!user.refresh_token) {
    throw new UnauthorisedRequestError("User is not logged in");
  }

  if (user.refresh_token !== refreshToken) {
    throw new UnauthorisedRequestError("invalid refresh token");
  }
  const accessToken = CreateToken(verifiedToken.id, 60 * 60 * 24);
  res
    .cookie("accessToken", accessToken, {
      maxAge: 60 * 60 * 24 * 1000,
      httpOnly: true,
      // secure: true,
    })
    .status(200)
    .json(
      new ApiResponse({
        statusCode: 200,
        message: "succesfully refreshed the token",
      }),
    );
});

export const logout = AsyncHandler(async (req, res) => {
  const id = req.userInfo.id;

  await prisma.user.update({
    where: {
      id,
    },
    data: {
      refresh_token: null,
    },
  });
  res
    .clearCookie("refreshToken")
    .clearCookie("accessToken")
    .status(200)
    .json(
      new ApiResponse({
        message: "user successfully logout",
        statusCode: 200,
      }),
    );
});
