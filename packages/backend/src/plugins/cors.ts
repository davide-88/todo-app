import { config } from "@/config.js";
import cors from "@fastify/cors";
import fp from "fastify-plugin";

export const corsPlugin = fp(async (fastify) => {
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
});
