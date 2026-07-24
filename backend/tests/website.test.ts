import { describe, it, expect, beforeAll } from "bun:test";
import request, { type Response } from "supertest";

import app from "../src/app";
import { BACKEND_URL } from "./setup";
import { addWebsite, createUserAndLogin } from "./helpers/helper";
import type { ApiResponseReturnType } from "../src/types";
import type { UserWebsite } from "../src/generated/prisma/client";

describe("add website endpoint", () => {
  let r: Response;

  beforeAll(async () => {
    r = await createUserAndLogin();
  });

  it("successfully adding website", async () => {
    const response = await request(app)
      .post(`${BACKEND_URL}/website/addWebsite`)
      .set("Cookie", r.headers["set-cookie"]!)
      .send({
        url: "https://google.com",
        interval: 30,
      })
      .expect(201);

    const data = response.body as ApiResponseReturnType;
    const website = data.data as UserWebsite;

    expect(data.message).toBe("successfully added the website to monitor");
    expect(website.interval_seconds).toBe(30);
  });
});

describe("get status endpoint", () => {
  let r: Response;

  beforeAll(async () => {
    r = await createUserAndLogin();
  });

  it("successfully fetched the website status", async () => {
    const r1 = await addWebsite(r);
    const data1 = r1.body as ApiResponseReturnType;
    const website = data1.data as UserWebsite;

    const response = await request(app)
      .get(`${BACKEND_URL}/website/status/${website.website_id}`)
      .set("Cookie", r.headers["set-cookie"]!)
      .expect(200);

    const data = response.body as ApiResponseReturnType;

    expect(data.message).toBe("successfully fetched website status");
    expect(data.data).toBeDefined();
  });
});

describe("get ticks endpoint", () => {
  let r: Response;

  beforeAll(async () => {
    r = await createUserAndLogin();
  });

  it("successfully fetched the ticks", async () => {
    const r1 = await addWebsite(r);
    const data1 = r1.body as ApiResponseReturnType;
    const website = data1.data as UserWebsite;

    const response = await request(app)
      .get(
        `${BACKEND_URL}/website/ticks?website_id=${website.website_id}&duration=1000000`,
      )
      .set("Cookie", r.headers["set-cookie"]!)
      .expect(200);

    const data = response.body as ApiResponseReturnType;

    expect(data.message).toBe("successfully get the ticks");
    expect(data.data).toBeDefined();
  });
});

describe("get website endpoint", () => {
  let r: Response;

  beforeAll(async () => {
    r = await createUserAndLogin();
    await addWebsite(r);
  });

  it("successfully fetched the websites", async () => {
    const response = await request(app)
      .get(`${BACKEND_URL}/website/getWebsites`)
      .set("Cookie", r.headers["set-cookie"]!)
      .expect(200);

    const data = response.body as ApiResponseReturnType;

    expect(data.message).toBe("successfully fetched the websites");
    expect(data.data).toBeDefined();
  });
});
