import { Router } from "express";
import { addWebsite, getStatus } from "./websites.controller";

const websiteRouter = Router();

websiteRouter.post("/addWebsite", addWebsite);
websiteRouter.get("/status", getStatus);

export default websiteRouter;
