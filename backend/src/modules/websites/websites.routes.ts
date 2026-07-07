import { Router } from "express";
import { addWebsite, getStatus } from "./websites.controller";
import { auth } from "../../middlewares/auth.middleware";

const websiteRouter = Router();

websiteRouter.use(auth);
websiteRouter.post("/addWebsite", addWebsite);
websiteRouter.get("/status", getStatus);

export default websiteRouter;
