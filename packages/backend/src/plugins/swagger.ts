import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "@/config.js";

export const swaggerPlugin = fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Todo App API",
        version: "1.0.0",
        description:
          "REST API for managing todos with cursor-based pagination, optimistic-UI upsert semantics, and structured error responses.",
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: "Local development",
        },
      ],
      tags: [
        { name: "todos", description: "Todo CRUD operations" },
        { name: "health", description: "Service health check" },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
  });
});
