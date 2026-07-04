import { Router } from "express";
import { addWebsite } from "./websites.controller";

const websiteRouter = Router();

websiteRouter.post("/addWebsite", addWebsite);

export default websiteRouter;
