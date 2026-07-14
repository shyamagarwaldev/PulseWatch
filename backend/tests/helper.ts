import { BACKEND_URL } from "./setup";

export async function signup() {
  const username = `${crypto.randomUUID()}`;
  const password = "password123";

  const res = await fetch(`${BACKEND_URL}/user/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  return {
    username,
    password,
    response: res,
  };
}

export async function createUserAndLogin() {
  const { username, password } = await signup();
  const response = await fetch(`${BACKEND_URL}/user/signin`, {
    method: "POST",
    headers: {
      "CONTENT-TYPE": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });
  return response;
}
