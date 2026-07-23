import { describe, it, expect, beforeAll } from "bun:test";
import { createUserAndLogin, signup } from "./helper";
import type { ApiResponseReturnType } from "../src/types";
import { BACKEND_URL } from "./setup";
import app from "../src/app";
import request, { type Response } from "supertest";

describe("signup endpoints", () => {
  it("is't able to signup if body is incorrect", async () => {
    const response = await request(app)
      .post(`${BACKEND_URL}/user/signup`)
      .expect(400);
    const data = response.body as ApiResponseReturnType;
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe("Validation Failed");
  });
  it("user already exixt", async () => {
    const { username } = await signup();
    const response = await request(app)
      .post(`${BACKEND_URL}/user/signup`)
      .send({
        username,
        password: "123456abc",
      })
      .expect(409);
    const data = response.body as ApiResponseReturnType;
    expect(data.statusCode).toBe(409);
    expect(data.message).toBe("Resource already exists");
  });
  it("succesful signup", async () => {
    const { response } = await signup();

    const data = response.body as ApiResponseReturnType;
    expect(data.statusCode).toBe(201);
    expect(data.message).toBe("user created succesfully");
  });
});

describe("signin endpoints", () => {
  let username: string, password: string;
  beforeAll(async () => {
    const data = await signup();
    username = data.username;
    password = data.password;
  });
  it("successful login", async () => {
    const response = await request(app)
      .post(`${BACKEND_URL}/user/signin`)
      .send({
        username,
        password,
      })
      .expect(200);
    const data = response.body as ApiResponseReturnType;
    expect(data.statusCode).toBe(200);
    expect(data.message).toBe("succesfully sign in");
    expect(response.headers["set-cookie"]?.length).toEqual(2);
    expect(data.data).toBeDefined();
  });

  it("not able to login due to invalid password", async () => {
    const response = await request(app)
      .post(`${BACKEND_URL}/user/signin`)
      .send({
        username,
        password: "wrongpass",
      })
      .expect(400);

    const data = response.body as ApiResponseReturnType;
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe("Invalid username or password");
  });
  it("not able to login due to invalid username", async () => {
    const response = await request(app)
      .post(`${BACKEND_URL}/user/signin`)
      .send({
        username: "aaaaaaaaaaaaa",
        password,
      })
      .expect(400);

    const data = response.body as ApiResponseReturnType;
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe("Invalid username or password");
  });
});
describe("refresh access token endpoint", () => {
  let r: Response;
  beforeAll(async () => {
    r = await createUserAndLogin();
  });
  it("successful refresh", async () => {
    const response = await request(app)
      .post(`${BACKEND_URL}/user/refresh`)
      .set("Cookie", r.headers["set-cookie"]!)
      .expect(200);

    const data = response.body as ApiResponseReturnType;
    expect(data.statusCode).toBe(200);
    expect(data.message).toBe("succesfully refreshed the token");
  });

  it("refresh token is not present", async () => {
    const response = await request(app)
      .post(`${BACKEND_URL}/user/refresh`)
      .expect(400);

    const data = response.body as ApiResponseReturnType;
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe("refresh token is required");
  });

  it("returns unauthorized for invalid refresh token", async () => {
    const response = await request(app)
      .post(`${BACKEND_URL}/user/refresh`)
      .set("Cookie", "refreshToken=invalidtoken");

    const data = response.body as ApiResponseReturnType;

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });
});
describe("logout endpoint", () => {
  let r: Response;
  beforeAll(async () => {
    r = await createUserAndLogin();
  });

  it("successful logout", async () => {
    const response = await request(app)
      .put(`${BACKEND_URL}/user/logout`)
      .set("Cookie", r.headers["set-cookie"]!)
      .expect(200);

    const data = response.body as ApiResponseReturnType;

    expect(data.message).toBe("user successfully logout");
  });

  it("fails when refresh token is missing", async () => {
    const response = await request(app)
      .put(`${BACKEND_URL}/user/logout`)
      .set("Cookie", r.headers["set-cookie"]?.at(0)!)
      .expect(400);

    const data = response.body as ApiResponseReturnType;

    expect(data.message).toBe("refresh token is required");
  });

  it("cannot refresh after logout", async () => {
    const login = await createUserAndLogin();
    const cookies = login.headers["set-cookie"];

    await request(app)
      .put(`${BACKEND_URL}/user/logout`)
      .set("Cookie", cookies!)
      .expect(200);

    const response = await request(app)
      .post(`${BACKEND_URL}/user/refresh`)
      .set("Cookie", cookies!)
      .expect(401);

    const data = response.body as ApiResponseReturnType;

    expect(data.statusCode).toBe(401);
    expect(data.success).toBe(false);
  });

  it("second logout should fail", async () => {
    const login = await createUserAndLogin();
    const cookies = login.headers["set-cookie"];

    await request(app)
      .put(`${BACKEND_URL}/user/logout`)
      .set("Cookie", cookies!)
      .expect(200);

    const response = await request(app)
      .put(`${BACKEND_URL}/user/logout`)
      .set("Cookie", cookies!);

    expect(response.status).toBe(404); //check this
  });
});
