import prisma from "../db";
import bcrypt from "bcrypt";
import { AsyncHandler } from "../utils/AsyncHandler";
import { BadRequestError } from "../utils/ApiError";
import { UserSchema, type UserSchemaType } from "../schemas/users.schema";
import { handleZodError } from "../utils/ZodError";

export const signup = AsyncHandler(async (req, res) => {
  const input = req.body;
  const { data, error, success } = UserSchema.safeParse(input);

  if (!success) {
    throw handleZodError(error);
  }
  const user = await prisma.user.findFirst({
    where: {
      username: data.username,
    },
  });

  if (user) {
    res.status(400).json({
      message: "user already exist",
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
    },
  });

  res.status(200).json({
    message: "user created succesfully",
  });
  return;
});

export const signin = AsyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findFirst({
    where: {
      username,
    },
  });
  if (!user) {
    throw new BadRequestError("user not found");
  }

  if (!(await bcrypt.compare(password, user.password))) {
    throw new BadRequestError("password is incorrect");
  }
});
