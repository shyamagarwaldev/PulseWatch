import { Router } from "express";
import { logout, refresh, signin, signup } from "./users.controller";
import { auth } from "../../middlewares/auth.middleware";

const userRouter = Router();
userRouter.post("/refresh", refresh);
userRouter.post("/signup", signup);
userRouter.post("/signin", signin);

userRouter.use(auth);
userRouter.put("/logout", logout);

export default userRouter;
