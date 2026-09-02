import { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    try {
      await app.db.orm.public.User.first();

      return reply.code(200).send({
        status: "ok",
        hasDb: true,
      });
    } catch {
      return reply.code(503).send({
        status: "error",
        hasDb: false,
      });
    }
  });
}