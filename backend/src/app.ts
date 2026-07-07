import express from "express";
import userRouter from "./modules/users/users.routes";
import websiteRouter from "./modules/websites/websites.routes";
import cookieParser from "cookie-parser";
import cors from "cors";
import ErrorMiddleware from "./middlewares/error.middleware";
const app = express();

app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
  }),
);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/website", websiteRouter);

app.use(ErrorMiddleware);

export default app;
