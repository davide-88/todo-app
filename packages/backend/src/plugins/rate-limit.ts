import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { config } from "@/config.js";

export const rateLimitPlugin = fp(async (fastify) => {
  await fastify.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    hook: "preHandler",
    keyGenerator: (request) => request.ip,
  });
});
