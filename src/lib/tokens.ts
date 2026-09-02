import { SignJWT, jwtVerify } from "jose";

import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);

export async function createAccessToken(userId: number) {
  return new SignJWT({})
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });

  if (!payload.sub) {
    throw new Error("Invalid access token");
  }

  return {
    userId: Number(payload.sub),
  };
}