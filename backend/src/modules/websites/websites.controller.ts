import prisma from "../../db";
import {
  WebsiteAddSchema,
  WebsiteStatusSchema,
} from "../../schemas/website.schema";
import { ApiResponse } from "../../lib/ApiResponse";
import { AsyncHandler } from "../../lib/AsyncHandler";
import { ZodCustomError } from "../../lib/ZodError";
import { BadRequestError, NotFoundError } from "../../lib/ApiError";

export const addWebsite = AsyncHandler(async (req, res) => {
  const { id } = req.userInfo;
  // can have a race condition
  const { data, success, error } = WebsiteAddSchema.safeParse(req.body);
  if (!success) {
    throw new ZodCustomError(error);
  }
  const website = await prisma.website.upsert({
    where: {
      url: data.url,
    },
    update: {},
    create: { url: data.url },
  });
  const result = await prisma.$transaction([
    prisma.userWebsite.create({
      data: {
        user_id: id,
        website_id: website.id,
        interval_seconds: data.interval,
        time_added: new Date(),
        next_tick: new Date(Date.now() + data.interval * 1000),
      },
    }),
    prisma.outBox.create({
      data: {
        task: "Add",
        user_id: id,
        website_id: website.id,
      },
    }),
  ]);
  res.status(201).json(
    new ApiResponse({
      message: "successfully added the website to monitor",
      statusCode: 201,
      data: result[0],
    }),
  );
});

export const getWebsites = AsyncHandler(async (req, res) => {
  const user_id = req.userInfo.id;
  const websites = await prisma.userWebsite.findMany({
    where: {
      user_id,
    },
    include: {
      website: {
        select: {
          url: true,
        },
      },
    },
  });

  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "successfully fetched the websites",
      data: websites,
    }),
  );
});

export const getStatus = AsyncHandler(async (req, res) => {
  const user_id = req.userInfo.id;
  const website_id = req.params.websiteId as string;
  if (!website_id) {
    throw new BadRequestError("website id is required");
  }
  const websiteStatus = await prisma.userWebsite.findUnique({
    where: {
      user_id_website_id: {
        user_id,
        website_id,
      },
    },
    include: {
      website_ticks: {
        orderBy: [
          {
            timestamp: "desc",
          },
        ],
        take: 1,
      },
    },
  });
  if (!websiteStatus) throw new NotFoundError("website not found");
  res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      message: "successfully fetched website status",
      data: websiteStatus,
    }),
  );
});

export const getTicks = AsyncHandler(async (req, res) => {
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
  const ticks = await prisma.websiteTick.findMany({
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
      message: "successfully get the ticks",
      data: ticks,
      statusCode: 200,
    }),
  );
});
