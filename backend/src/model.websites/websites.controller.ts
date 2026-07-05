import prisma from "../db";
import { ServerError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { AsyncHandler } from "../utils/AsyncHandler";

export const addWebsite = AsyncHandler(async (req, res) => {
  const { url, interval } = req.body;
  const { id } = req.userInfo;
  let web = await prisma.website.findFirst({
    where: {
      url,
    },
  });
  if (!web) {
    web = await prisma.website.create({
      data: {
        url,
      },
    });
  }
  let userWebsite = await prisma.userWebsite.findFirst({
    where: {
      user_id: id,
      website_id: web.id,
    },
  });
  if (userWebsite) {
    res.status(409).json(
      new ApiResponse({
        message: "already monitors this website",
        statusCode: 409,
        data: userWebsite,
      }),
    );
    return;
  }
  userWebsite = await prisma.userWebsite.create({
    data: {
      user_id: id,
      website_id: web.id,
      interval_seconds: interval,
      time_added: new Date(),
      next_tick: new Date(Date.now() + interval * 1000),
    },
  });

  if (!userWebsite) {
    throw new ServerError("unable to add website to monitor to db");
  }
  res.status(200).json(
    new ApiResponse({
      message: "successfully created added the website to monitor",
      statusCode: 200,
    }),
  );
});
