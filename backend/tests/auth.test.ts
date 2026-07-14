import { describe, it, expect, beforeAll } from "bun:test";
import { createUserAndLogin, signup } from "./helper";
import type { ApiResponseReturnType } from "../src/types";
import { BACKEND_URL } from "./setup";

describe("signup endpoints", () => {
  it("is't able to signup if body is incorrect", async () => {
    const response = await fetch(`${BACKEND_URL}/user/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(400);
    expect(data.message).toBe("Validation Failed");
  });
  it("user already exixt", async () => {
    const { username } = await signup();
    const response = await fetch(`${BACKEND_URL}/user/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password: "123456abc",
      }),
    });
    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(409);
    expect(data.statusCode).toBe(409);
    expect(data.message).toBe("Resource already exists");
  });
  it("succesful signup", async () => {
    const { response } = await signup();
    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(201);
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
    const response = await fetch(`${BACKEND_URL}/user/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });
    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(200);
    expect(data.message).toBe("succesfully sign in");
    expect(response.headers.getSetCookie().length).toBeGreaterThan(0);
    expect(data.data).toBeDefined();
  });

  it("not able to login due to invalid password", async () => {
    const response = await fetch(`${BACKEND_URL}/user/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password: "wrongpass",
      }),
    });
    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid username or password");
  });
  it("not able to login due to invalid username", async () => {
    const response = await fetch(`${BACKEND_URL}/user/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "aaaaaaaaaaaaa",
        password,
      }),
    });
    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(400);
    expect(data.message).toBe("Invalid username or password");
  });
});
describe("refresh access token endpoint", () => {
  let r: Response;
  // let r2: Response;
  beforeAll(async () => {
    r = await createUserAndLogin();
    // r2 = await createUserAndLogin();
  });
  it("successful refresh", async () => {
    const response = await fetch(`${BACKEND_URL}/user/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: r.headers.getSetCookie().join("; "),
      },
    });
    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(200);
    expect(data.message).toBe("succesfully refreshed the token");
  });

  it("refresh token is not present", async () => {
    const response = await fetch(`${BACKEND_URL}/user/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as ApiResponseReturnType;
    expect(response.status).toBe(400);
    expect(data.message).toBe("refresh token is required");
  });
});
describe("logout endpoint", () => {
  let r: Response;
  beforeAll(async () => {
    r = await createUserAndLogin();
  });

  it("successful logout", async () => {
    const response = await fetch(`${BACKEND_URL}/user/logout`, {
      method: "PUT",
      headers: {
        Cookie: r.headers.getSetCookie().join("; "),
      },
    });

    const data = (await response.json()) as ApiResponseReturnType;

    expect(response.status).toBe(200);
    expect(data.message).toBe("user successfully logout");
  });
});
