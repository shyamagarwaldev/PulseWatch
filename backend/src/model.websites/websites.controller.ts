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
      userId: id,
      websiteId: web.id,
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
      userId: id,
      websiteId: web.id,
      interval,
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
