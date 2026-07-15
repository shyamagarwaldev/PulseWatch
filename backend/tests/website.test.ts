import { describe, it, expect, beforeAll } from "bun:test";
import { BACKEND_URL } from "./setup";
import { addWebsite, createUserAndLogin } from "./helper";
import type { ApiResponseReturnType } from "../src/types";
import type { UserWebsite } from "../src/generated/prisma/client";

describe("add website endpoint", () => {
  let r: Response;
  beforeAll(async () => {
    r = await createUserAndLogin();
  });

  it("successfuly adding website", async () => {
    const response = await fetch(`${BACKEND_URL}/website/addWebsite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: r.headers.getSetCookie().join("; "),
      },
      body: JSON.stringify({
        url: "https://google.com",
        interval: 30,
      }),
    });
    const data = (await response.json()) as ApiResponseReturnType;
    const website = data.data as UserWebsite;
    expect(response.status).toBe(201);
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
    const data1 = (await r1.json()) as ApiResponseReturnType;
    const data2 = data1.data as UserWebsite;
    const response = await fetch(
      `${BACKEND_URL}/website/status/${data2.website_id}`,
      {
        method: "GET",
        headers: {
          Cookie: r.headers.getSetCookie().join("; "),
        },
      },
    );
    const data = (await response.json()) as ApiResponseReturnType;

    expect(response.status).toBe(200);
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
    const data1 = (await r1.json()) as ApiResponseReturnType;
    const data2 = data1.data as UserWebsite;
    const response = await fetch(
      `${BACKEND_URL}/website/ticks/?website_id=${data2.website_id}&duration=1000000`,
      {
        method: "GET",
        headers: {
          Cookie: r.headers.getSetCookie().join("; "),
        },
      },
    );
    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(200);
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
    const response = await fetch(`${BACKEND_URL}/website/getWebsites`, {
      method: "GET",
      headers: {
        Cookie: r.headers.getSetCookie().join("; "),
      },
    });
    const data = (await response.json()) as ApiResponseReturnType;
    console.dir(data.data);
    expect(response.status).toBe(200);
    expect(data.message).toBe("successfully fetched the websites");
    expect(data.data).toBeDefined();
  });
});
