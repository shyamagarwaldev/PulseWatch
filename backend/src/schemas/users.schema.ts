import { z } from "zod";

export const UserSchema = z.object({
  username: z.string("username is required").min(8, "minimum 8 character word"),
  password: z
    .string("password is required")
    .min(8, "minimum 8 character")
    .max(20, "max 20 character"),
});

export type UserSchemaType = z.infer<typeof UserSchema>;
