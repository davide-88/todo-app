import type { FastifyError, FastifyInstance } from "fastify";
import { errorCodes } from "@todo-app/shared";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        code: errorCodes.VALIDATION_ERROR,
        message: "Validation failed",
        details: error.validation,
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        code: errorCodes.RATE_LIMITED,
        message: error.message,
      });
    }

    if (error.statusCode === 404) {
      return reply.status(404).send({
        code: errorCodes.NOT_FOUND,
        message: error.message,
      });
    }

    return reply.status(error.statusCode ?? 500).send({
      code: errorCodes.INTERNAL_ERROR,
      message: "Internal server error",
    });
  });
}
