import app from "../../src/app";
import { BACKEND_URL } from "../setup";
import request, { type Response } from "supertest";

export async function signup() {
  const username = `${crypto.randomUUID()}`;
  const password = "password123";

  const response = await request(app)
    .post(`${BACKEND_URL}/user/signup`)
    .send({ username, password })
    .expect(201);
  return {
    username,
    password,
    response,
  };
}

export async function createUserAndLogin() {
  const { username, password } = await signup();
  const response = await request(app)
    .post(`${BACKEND_URL}/user/signin`)
    .send({ username, password })
    .expect(200);

  return response;
}

export async function addWebsite(r: Response) {
  const response = await request(app)
    .post(`${BACKEND_URL}/website/addWebsite`)
    .set("Cookie", r.headers["set-cookie"]!)
    .send({
      url: "https://google.com",
      interval: 30,
    });
  return response;
}
