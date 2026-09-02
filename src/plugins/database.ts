import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { db } from "../prisma/db.js";

async function databasePlugin(app: FastifyInstance) {
  app.decorate("db", db);
}

export default fp(databasePlugin);