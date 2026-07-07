import express from "express";
import userRouter from "./models.users/users.routes";
const app = express();

app.use(express.json());
app.use(express.urlencoded());

app.use("/api/v1/user", userRouter);

export default app;
