import { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../lib/tokens.js";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Invalid authorization header",
    });
  }

  try {
    const { userId } = await verifyAccessToken(token);

    request.user = {
      id: userId,
    };
  } catch {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Invalid or expired access token",
    });
  }
}