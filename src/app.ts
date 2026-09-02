import Fastify, { FastifyError } from "fastify";
import rateLimit from "@fastify/rate-limit";

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import databasePlugin from "./plugins/database.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";

import { env } from "./config/env.js";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: [
        "req.headers.authorization",
        "req.body.password",
        "req.body.otp",
        "req.body.refreshToken",
        "res.body.accessToken",
        "res.body.refreshToken",
        "res.body.passwordHash",
        "res.body.otpHash",
      ],
    },
    bodyLimit: 1 * 1024 * 1024,
  });

  app.register(helmet);

  app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.register(cors, {
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE"],
  });

  app.register(databasePlugin);

  app.register(healthRoutes);
  app.register(authRoutes);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    if (error.validation) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request",
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: "REQUEST_ERROR",
        message: error.message,
      });
    }

    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    });
  });

  return app;
}
