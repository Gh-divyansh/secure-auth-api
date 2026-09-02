import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof import("../prisma/db.js").db;
  }

  interface FastifyRequest {
    user: {
      id: number;
    };
  }
}
