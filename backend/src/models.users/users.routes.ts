import { Router } from "express";
import { signin, signup } from "./users.controller";

const userRouter = Router();

userRouter.post("/signup", signup);
userRouter.post("/signin", signin);

export default userRouter;
