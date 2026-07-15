import { Router } from "express";
import {
  addWebsite,
  getStatus,
  getTicks,
  getWebsites,
} from "./websites.controller";
import { auth } from "../../middlewares/auth.middleware";

const websiteRouter = Router();

websiteRouter.use(auth);
websiteRouter.post("/addWebsite", addWebsite);
websiteRouter.get("/status/:websiteId", getStatus);
websiteRouter.get("/ticks", getTicks);
websiteRouter.get("/getWebsites", getWebsites);

export default websiteRouter;
