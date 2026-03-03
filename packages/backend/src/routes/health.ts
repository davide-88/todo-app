import type { FastifyInstance, FastifyPluginOptions } from "fastify";

export function healthRoute(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: () => void,
): void {
  app.get("/health", async (_request, reply) => {
    try {
      await app.db.healthCheck();
      return reply.status(200).send({ status: "ok" });
    } catch (err) {
      app.log.error(err);
      return reply.status(503).send({ status: "error", message: "Database unreachable" });
    }
  });
  done();
}
