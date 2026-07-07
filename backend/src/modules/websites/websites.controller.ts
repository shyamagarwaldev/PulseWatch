import prisma from "../../db";
import {
  WebsiteAddSchema,
  WebsiteStatusSchema,
} from "../../schemas/website.schema";
import { ApiResponse } from "../../lib/ApiResponse";
import { AsyncHandler } from "../../lib/AsyncHandler";
import { ZodCustomError } from "../../lib/ZodError";
import { BadRequestError } from "../../lib/ApiError";

export const addWebsite = AsyncHandler(async (req, res) => {
  const { id } = req.userInfo;
  // can have a race condition
  const { data, success, error } = WebsiteAddSchema.safeParse(req.body);
  if (!success) {
    throw new ZodCustomError(error);
  }
  const web = await prisma.website.upsert({
    where: {
      url: data.url,
    },
    update: {},
    create: { url: data.url },
  });
  const userWebsite = await prisma.userWebsite.create({
    data: {
      user_id: id,
      website_id: web.id,
      interval_seconds: data.interval,
      time_added: new Date(),
      next_tick: new Date(Date.now() + data.interval * 1000),
    },
  });
  res.status(201).json(
    new ApiResponse({
      message: "successfully created added the website to monitor",
      statusCode: 201,
      data: userWebsite,
    }),
  );
});

export const getStatus = AsyncHandler(async (req, res) => {
  const { id } = req.userInfo;
  const { data, error, success } = WebsiteStatusSchema.safeParse(req.query);
  if (!success) {
    throw new ZodCustomError(error);
  }
  const website = await prisma.userWebsite.findUnique({
    where: {
      user_id_website_id: {
        user_id: id,
        website_id: data.website_id,
      },
    },
  });
  if (!website) {
    throw new BadRequestError("Invalid Website");
  }
  const status = await prisma.websiteTick.findMany({
    where: {
      website_id: data.website_id,
      user_id: id,
      timestamp: {
        gte: new Date(Date.now() - data.duration),
      },
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  res.status(200).json(
    new ApiResponse({
      message: "successfully get the status",
      data: status,
      statusCode: 200,
    }),
  );
  return;
});
