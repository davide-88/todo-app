import Fastify from "fastify";
import { helmetPlugin } from "@/plugins/helmet.js";
import { corsPlugin } from "@/plugins/cors.js";
import { rateLimitPlugin } from "@/plugins/rate-limit.js";
import { swaggerPlugin } from "@/plugins/swagger.js";
import { dbPlugin } from "@/plugins/db.js";
import { registerErrorHandler } from "@/lib/error-handler.js";
import { healthRoute } from "@/routes/health.js";
import { todosRoutes } from "@/routes/todos.js";

export function buildApp() {
  const app = Fastify({ logger: true, trustProxy: true });

  app.register(helmetPlugin);
  app.register(corsPlugin);
  app.register(rateLimitPlugin);
  app.register(swaggerPlugin);
  app.register(dbPlugin);

  registerErrorHandler(app);

  app.register(healthRoute, { prefix: "/api" });
  app.register(todosRoutes, { prefix: "/api/todos" });

  return app;
}
